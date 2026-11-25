// Sentire Cloud: entitlements and the paywall for Next.js apps (Sentire Cloud Blueprint 5.2 and 5.6).

export interface EntLimit {
  value: number | null; // null = unlimited
  mode: "SOFT" | "HARD" | "OVERAGE";
}

export interface Entitlement {
  organizationId: string;
  appId: string;
  state: "ACTIVE" | "READ_ONLY" | "OFF";
  plan: string | null;
  addons: string[];
  features: { key: string; source: string; limit?: number | null; mode?: string }[];
  limits: Record<string, EntLimit>;
  periodEnd: string | null;
  version: number;
}

export interface CloudConfig {
  issuer: string; // https://cloud.sentire.solutions
  appId: string; // payroll
  clientSecret: string;
}

/** Reads entitlements with the app's machine token and caches them for 24 hours (NFR-02: keep the last one if Sentire Cloud is down). */
export class EntitlementCache {
  private token: { value: string; exp: number } | null = null;
  private cache = new Map<string, { ent: Entitlement; at: number }>();

  constructor(private cfg: CloudConfig, private fetchImpl: typeof fetch = fetch) {}

  private async machineToken() {
    if (this.token && this.token.exp > Date.now() + 30_000) return this.token.value;
    const basic = Buffer.from(`sentire-${this.cfg.appId}:${this.cfg.clientSecret}`).toString("base64");
    const res = await this.fetchImpl(`${this.cfg.issuer}/oidc/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: "entitlements:read usage:write" }),
    });
    if (!res.ok) throw new Error(`token ${res.status}`);
    const j = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
    return j.access_token;
  }

  /** Apply an account.entitlement.changed event (newer versions only). */
  apply(ent: Entitlement) {
    const cur = this.cache.get(ent.organizationId);
    if (!cur || ent.version >= cur.ent.version) this.cache.set(ent.organizationId, { ent, at: Date.now() });
  }

  async get(organizationId: string): Promise<Entitlement | null> {
    const cur = this.cache.get(organizationId);
    if (cur && Date.now() - cur.at < 24 * 3600_000) return cur.ent;
    try {
      const res = await this.fetchImpl(`${this.cfg.issuer}/api/v1/entitlements/${organizationId}/${this.cfg.appId}`, {
        headers: { Authorization: `Bearer ${await this.machineToken()}` },
      });
      if (!res.ok) throw new Error(`entitlements ${res.status}`);
      const ent = (await res.json()) as Entitlement;
      this.apply(ent);
      return ent;
    } catch (e) {
      if (cur) return cur.ent; // fail safe: keep the last known entitlement
      throw e;
    }
  }
}

export function hasFeature(ent: Entitlement | null, key: string): boolean {
  return !!ent && ent.state !== "OFF" && ent.features.some((f) => f.key === key);
}

export type LimitResult = { ok: true; warn: boolean } | { ok: false; mode: "HARD" };

/** FR-49: under 80% fine; 80% and over warns; at the limit HARD refuses, SOFT warns, OVERAGE allows (billed). */
export function withinLimit(ent: Entitlement | null, key: string, countAfter: number): LimitResult {
  const lim = ent?.limits[key];
  if (!lim || lim.value === null) return { ok: true, warn: false };
  if (countAfter > lim.value && lim.mode === "HARD") return { ok: false, mode: "HARD" };
  return { ok: true, warn: countAfter >= 0.8 * lim.value };
}

export function canWrite(ent: Entitlement | null): boolean {
  return !!ent && ent.state === "ACTIVE";
}

export function upgradeUrl(issuer: string, organizationId: string, feature: string, returnUrl: string, appId?: string) {
  const q = new URLSearchParams({ org: organizationId, feature, return: returnUrl, ...(appId ? { app: appId } : {}) });
  return `${issuer.replace(/\/$/, "")}/upgrade?${q}`;
}

/** NFR-18: the answer for a locked action. Return it from a route handler: `return paywallResponse(...)`. */
export function paywallResponse(issuer: string, organizationId: string, feature: string, returnUrl: string, appId?: string) {
  return new Response(JSON.stringify({ code: "PAYMENT_REQUIRED", feature, upgradeUrl: upgradeUrl(issuer, organizationId, feature, returnUrl, appId) }), {
    status: 402,
    headers: { "Content-Type": "application/json" },
  });
}

/** Shared upgrade card markup (NFR-19). `action` is UPGRADE for Owners and Billing members, ASK_OWNER for everyone else. */
export function upgradeCardHtml(card: { feature: { name: string; benefit: string }; priceText: string | null; action: "UPGRADE" | "ASK_OWNER"; upgradeUrl: string }) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const button = card.action === "UPGRADE" ? `Upgrade${card.priceText ? `, ${esc(card.priceText)}` : ""}` : "Ask my Owner";
  return `<div class="sentire-upgrade-card" role="dialog" aria-label="${esc(card.feature.name)}" style="font-family:var(--sentire-font);border-radius:var(--sentire-radius);padding:20px;background:var(--sentire-surface);color:var(--sentire-ink);box-shadow:0 1px 3px rgba(0,0,0,.1)">
<strong>${esc(card.feature.name)}</strong><p>${esc(card.feature.benefit)}</p>
<a href="${esc(card.upgradeUrl)}" style="display:inline-block;background:var(--sentire-ink);color:#fff;padding:8px 14px;border-radius:var(--sentire-radius);text-decoration:none">${button}</a></div>`;
}
