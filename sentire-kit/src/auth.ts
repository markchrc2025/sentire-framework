// One Sentire Account: Frappe-based apps act as the OpenID Connect provider; Next.js apps sign in through it.

export interface SentireAuthConfig {
  /** The Frappe site that holds Sentire accounts, e.g. https://account.sentire.solutions */
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

const BASE = "/api/method/frappe.integrations.oauth2";

export function endpoints(issuer: string) {
  const i = issuer.replace(/\/$/, "");
  return {
    authorization: `${i}${BASE}.authorize`,
    token: `${i}${BASE}.get_token`,
    revoke: `${i}${BASE}.revoke_token`,
    userinfo: `${i}${BASE}.openid_profile`,
    discovery: `${i}/.well-known/openid-configuration`,
  };
}

/** The URL to send a user to for signing in. Keep `state` in a cookie and check it on return. */
export function authorizeUrl(cfg: SentireAuthConfig, state: string): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: (cfg.scopes ?? ["openid", "all"]).join(" "),
    state,
  });
  return `${endpoints(cfg.issuer).authorization}?${q}`;
}

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function exchangeCode(cfg: SentireAuthConfig, code: string, fetchImpl: typeof fetch = fetch): Promise<TokenSet> {
  const res = await fetchImpl(endpoints(cfg.issuer).token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Sign-in code exchange failed: HTTP ${res.status}`);
  return (await res.json()) as TokenSet;
}

export interface SentireUser {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
}

export async function userInfo(issuer: string, accessToken: string, fetchImpl: typeof fetch = fetch): Promise<SentireUser> {
  const res = await fetchImpl(endpoints(issuer).userinfo, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`User info failed: HTTP ${res.status}`);
  return (await res.json()) as SentireUser;
}
