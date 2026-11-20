import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvent, encodeEvent, sign, verify, receiveEvent, SIGNATURE_HEADER, FrappeClient, authorizeUrl } from "../dist/index.js";

test("signed event verifies, tampered or stale does not", () => {
  const body = encodeEvent(buildEvent("payroll.run.approved", "payroll", { run_id: "R1" }, "ACME"));
  const h = sign(body, "s3cret");
  assert.equal(verify(body, h, "s3cret"), true);
  assert.equal(verify(body + " ", h, "s3cret"), false);
  assert.equal(verify(body, h, "other"), false);
  assert.equal(verify(body, sign(body, "s3cret", 1000), "s3cret", 300, 2000), false);
  assert.equal(verify(body, "garbage", "s3cret"), false);
});

test("receiveEvent reads a Next.js style Request", async () => {
  const body = encodeEvent(buildEvent("ledger.task.created", "ledger", { task_id: "T1" }));
  const req = new Request("http://x/api/events", { method: "POST", body, headers: { [SIGNATURE_HEADER]: sign(body, "k") } });
  const ev = await receiveEvent(req, "k");
  assert.equal(ev.data.task_id, "T1");
});

test("client sends token auth and unwraps data", async () => {
  let seen;
  const fake = async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ data: [{ name: "JV-1" }] }), { status: 200 }); };
  const c = new FrappeClient({ baseUrl: "https://ledger.example/", apiKey: "k", apiSecret: "s", fetchImpl: fake });
  const rows = await c.getList("Journal Entry", { fields: ["name"], limit: 5 });
  assert.equal(rows[0].name, "JV-1");
  assert.match(seen.url, /\/api\/resource\/Journal%20Entry\?fields=/);
  assert.equal(seen.init.headers.Authorization, "token k:s");
});

test("sign-in URL points at the Frappe OAuth provider", () => {
  const u = new URL(authorizeUrl({ issuer: "https://acct.example", clientId: "c", clientSecret: "x", redirectUri: "https://pay.example/cb" }, "st"));
  assert.equal(u.pathname, "/api/method/frappe.integrations.oauth2.authorize");
  assert.equal(u.searchParams.get("state"), "st");
});
