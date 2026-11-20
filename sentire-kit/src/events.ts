// The Sentire event format, identical to frappe/sentire.py in the Python engine.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const EVENT_SPEC = "sentire.event.v1";
export const SIGNATURE_HEADER = "X-Sentire-Signature";
export const DEFAULT_TOLERANCE_SECONDS = 300;

export interface SentireEvent<T = Record<string, unknown>> {
  specversion: typeof EVENT_SPEC;
  id: string;
  type: string;
  source: string;
  company: string | null;
  time: string;
  data: T;
}

export function buildEvent<T extends Record<string, unknown>>(
  type: string,
  source: string,
  data: T,
  company: string | null = null,
): SentireEvent<T> {
  return {
    specversion: EVENT_SPEC,
    id: randomUUID(),
    type,
    source,
    company,
    time: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    data,
  };
}

/** The exact bytes that are signed and sent (compact JSON, same as the Python side). */
export function encodeEvent(event: SentireEvent): string {
  return JSON.stringify(event);
}

export function sign(body: string, secret: string, timestamp?: number): string {
  const t = Math.floor(timestamp ?? Date.now() / 1000);
  const mac = createHmac("sha256", secret).update(`${t}.${body}`, "utf8").digest("hex");
  return `t=${t},v1=${mac}`;
}

export function verify(
  body: string,
  header: string | null | undefined,
  secret: string,
  tolerance = DEFAULT_TOLERANCE_SECONDS,
  now?: number,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const t = Number.parseInt(parts.t ?? "", 10);
  const given = parts.v1;
  if (!Number.isFinite(t) || !given) return false;
  const current = Math.floor(now ?? Date.now() / 1000);
  if (tolerance && Math.abs(current - t) > tolerance) return false;
  const expected = sign(body, secret, t).split("v1=")[1];
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Read and check an incoming event in a Next.js route handler: `const ev = await receiveEvent(req, secret)`. */
export async function receiveEvent<T = Record<string, unknown>>(
  req: Request,
  secret: string,
): Promise<SentireEvent<T>> {
  const body = await req.text();
  if (!verify(body, req.headers.get(SIGNATURE_HEADER), secret)) {
    throw new Error("Sentire event signature is missing, wrong or too old");
  }
  const event = JSON.parse(body) as SentireEvent<T>;
  if (event.specversion !== EVENT_SPEC) throw new Error(`Unknown event spec ${event.specversion}`);
  return event;
}

/** Send one event to another Sentire app. */
export async function sendEvent(url: string, secret: string, event: SentireEvent): Promise<void> {
  const body = encodeEvent(event);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", [SIGNATURE_HEADER]: sign(body, secret) },
    body,
  });
  if (!res.ok) throw new Error(`Event ${event.type} to ${url} failed: HTTP ${res.status}`);
}
