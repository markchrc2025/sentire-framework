import { test } from "node:test";
import assert from "node:assert/strict";
import { EntitlementCache, hasFeature, paywallResponse, withinLimit, upgradeCardHtml } from "../dist/index.js";

const ent = { organizationId: "O1", appId: "payroll", state: "ACTIVE", plan: "team", addons: [], features: [{ key: "ai.assistant", source: "ADD_ON" }], limits: { users: { value: 5, mode: "HARD" }, ai: { value: 10, mode: "SOFT" } }, periodEnd: null, version: 2 };

test("features and limits", () => {
  assert.equal(hasFeature(ent, "ai.assistant"), true);
  assert.equal(hasFeature({ ...ent, state: "OFF" }, "ai.assistant"), false);
  assert.deepEqual(withinLimit(ent, "users", 3), { ok: true, warn: false });
  assert.deepEqual(withinLimit(ent, "users", 4), { ok: true, warn: true });
  assert.deepEqual(withinLimit(ent, "users", 6), { ok: false, mode: "HARD" });
  assert.deepEqual(withinLimit(ent, "ai", 11), { ok: true, warn: true });
});

test("402 answer", async () => {
  const r = paywallResponse("https://cloud.example", "O1", "ai.assistant", "https://app.example/x", "payroll");
  assert.equal(r.status, 402);
  const j = await r.json();
  assert.equal(j.code, "PAYMENT_REQUIRED");
  assert.match(j.upgradeUrl, /^https:\/\/cloud\.example\/upgrade\?org=O1&feature=ai\.assistant/);
});

test("cache keeps the last entitlement when Sentire Cloud is down", async () => {
  let up = true;
  const f = async (url) => {
    if (!up) throw new Error("down");
    if (String(url).endsWith("/oidc/token")) return new Response(JSON.stringify({ access_token: "t", expires_in: 300 }));
    return new Response(JSON.stringify(ent));
  };
  const c = new EntitlementCache({ issuer: "https://cloud.example", appId: "payroll", clientSecret: "s" }, f);
  assert.equal((await c.get("O1")).plan, "team");
  up = false;
  assert.equal((await c.get("O1")).plan, "team");
  c.apply({ ...ent, version: 1, plan: "solo" });
  assert.equal((await c.get("O1")).plan, "team");
});

test("card markup escapes text", () => {
  const html = upgradeCardHtml({ feature: { name: "<AI>", benefit: "b" }, priceText: "PHP 1.00 a year", action: "ASK_OWNER", upgradeUrl: "https://x" });
  assert.match(html, /&lt;AI&gt;/);
  assert.match(html, /Ask my Owner/);
});
