// A typed client for any Frappe-based Sentire app (Ledger, Helpdesk, LMS) over its REST API.

export interface FrappeClientOptions {
  /** e.g. https://ledger.sentire.solutions */
  baseUrl: string;
  /** API key and secret of an integration user, or an OAuth access token. Never commit these. */
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
}

export class FrappeError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

export type Filters = Array<[string, string, unknown]> | Record<string, unknown>;

export class FrappeClient {
  private fetchImpl: typeof fetch;
  constructor(private opts: FrappeClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
    if (this.opts.accessToken) h.Authorization = `Bearer ${this.opts.accessToken}`;
    else if (this.opts.apiKey && this.opts.apiSecret) h.Authorization = `token ${this.opts.apiKey}:${this.opts.apiSecret}`;
    return h;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = this.opts.baseUrl.replace(/\/$/, "") + path;
    const res = await this.fetchImpl(url, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const msg = json?.exception || json?.message || `HTTP ${res.status}`;
      throw new FrappeError(String(msg), res.status, json);
    }
    return (json.data ?? json.message) as T;
  }

  getList<T = Record<string, unknown>>(
    doctype: string,
    opts: { fields?: string[]; filters?: Filters; limit?: number; orderBy?: string } = {},
  ): Promise<T[]> {
    const q = new URLSearchParams();
    if (opts.fields) q.set("fields", JSON.stringify(opts.fields));
    if (opts.filters) q.set("filters", JSON.stringify(opts.filters));
    if (opts.limit !== undefined) q.set("limit_page_length", String(opts.limit));
    if (opts.orderBy) q.set("order_by", opts.orderBy);
    const qs = q.toString();
    return this.request("GET", `/api/resource/${encodeURIComponent(doctype)}${qs ? `?${qs}` : ""}`);
  }

  getDoc<T = Record<string, unknown>>(doctype: string, name: string): Promise<T> {
    return this.request("GET", `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  }

  insert<T = Record<string, unknown>>(doctype: string, doc: Record<string, unknown>): Promise<T> {
    return this.request("POST", `/api/resource/${encodeURIComponent(doctype)}`, doc);
  }

  update<T = Record<string, unknown>>(doctype: string, name: string, fields: Record<string, unknown>): Promise<T> {
    return this.request("PUT", `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, fields);
  }

  call<T = unknown>(method: string, args: Record<string, unknown> = {}): Promise<T> {
    return this.request("POST", `/api/method/${method}`, args);
  }

  /** Which Sentire Framework release the app runs. */
  frameworkInfo(): Promise<{ name: string; release: string; based_on: string; based_on_version: string; event_spec: string }> {
    return this.call("frappe.sentire.info");
  }
}
