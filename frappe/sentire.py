"""Sentire Framework: identity and the cross-app event format.

This file exists only in Sentire Framework (not in upstream Frappe), so upstream
merges never touch it. The event format here is the same one the TypeScript kit
(sentire-kit) signs and verifies; see docs-sentire/ECOSYSTEM.md.
"""

import hashlib
import hmac
import json
import time
import uuid
from datetime import UTC, datetime

SENTIRE_RELEASE = "v16.60.2-sentire.1"
BASED_ON = "Frappe Framework"
EVENT_SPEC = "sentire.event.v1"
SIGNATURE_HEADER = "X-Sentire-Signature"
DEFAULT_TOLERANCE_SECONDS = 300


def release() -> str:
	return SENTIRE_RELEASE


def build_event(event_type: str, source: str, data: dict, company: str | None = None) -> dict:
	"""One event envelope, the same shape in every Sentire app."""
	return {
		"specversion": EVENT_SPEC,
		"id": str(uuid.uuid4()),
		"type": event_type,
		"source": source,
		"company": company,
		"time": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
		"data": data or {},
	}


def encode_event(event: dict) -> bytes:
	"""The exact bytes that are signed and sent."""
	return json.dumps(event, separators=(",", ":"), ensure_ascii=False, default=str).encode("utf-8")


def sign(body: bytes, secret: str, timestamp: int | None = None) -> str:
	"""Header value: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">."""
	t = int(timestamp if timestamp is not None else time.time())
	mac = hmac.new(secret.encode("utf-8"), f"{t}.".encode() + body, hashlib.sha256).hexdigest()
	return f"t={t},v1={mac}"


def verify(body: bytes, header: str, secret: str, tolerance: int = DEFAULT_TOLERANCE_SECONDS, now: int | None = None) -> bool:
	"""True only for an untampered body signed with this secret inside the time window."""
	try:
		parts = dict(p.split("=", 1) for p in (header or "").split(","))
		t = int(parts["t"])
		given = parts["v1"]
	except (KeyError, ValueError):
		return False
	current = int(now if now is not None else time.time())
	if tolerance and abs(current - t) > tolerance:
		return False
	expected = sign(body, secret, t).split("v1=", 1)[1]
	return hmac.compare_digest(expected, given)


def emit_event(event_type: str, data: dict, company: str | None = None, source: str | None = None) -> dict:
	"""Send one event to every target in the site config, in the background.

	Site config:  "sentire_event_targets": [{"url": "https://...", "secret": "..."}]
	With no targets this does nothing, so an app can call it unconditionally.
	"""
	import frappe

	event = build_event(event_type, source or frappe.conf.get("sentire_app_id") or "sentire-framework", data, company)
	targets = frappe.conf.get("sentire_event_targets") or []
	for target in targets:
		if target.get("url") and target.get("secret"):
			frappe.enqueue(
				"frappe.sentire.deliver_event",
				queue="short",
				enqueue_after_commit=True,
				url=target["url"],
				secret=target["secret"],
				event=event,
			)
	return event


def deliver_event(url: str, secret: str, event: dict):
	import requests

	body = encode_event(event)
	response = requests.post(
		url,
		data=body,
		headers={"Content-Type": "application/json", SIGNATURE_HEADER: sign(body, secret)},
		timeout=10,
	)
	response.raise_for_status()


def _whitelist(fn):
	# Lets this module load without a Frappe site (the kit's cross-check imports it standalone)
	try:
		import frappe
	except ImportError:
		return fn
	return frappe.whitelist()(fn)


def info() -> dict:
	"""GET /api/method/frappe.sentire.info (signed-in users only)."""
	import frappe

	return {
		"name": "Sentire Framework",
		"release": SENTIRE_RELEASE,
		"based_on": BASED_ON,
		"based_on_version": frappe.__version__,
		"event_spec": EVENT_SPEC,
	}


info = _whitelist(info)
