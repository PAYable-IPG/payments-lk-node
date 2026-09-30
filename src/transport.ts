import { randomInt, randomUUID } from "node:crypto";
import { ApiError, ConnectionError, errorFromResponse } from "./errors.js";

export const VERSION = "0.4.1";
export const DEFAULT_API_BASE = "https://api.payments.lk";

const RETRY_STATUSES: ReadonlySet<number> = new Set([429, 500, 502, 503, 504]);
const MAX_WAIT_MS = 20_000;

export type ClientOptions = {
  /** Defaults to https://api.payments.lk. Point it at a staging API while you test. */
  apiBase?: string;
  /** Per attempt. Defaults to 30 seconds. */
  timeoutMs?: number;
  /** Retries after the first attempt, on network failures, 429 and 5xx. Defaults to 2. */
  maxRetries?: number;
  /** Replaces the global fetch, for a proxy or for tests. */
  fetch?: typeof globalThis.fetch;
  /** Waits between retries. Replace it in tests. */
  sleep?: (ms: number) => Promise<void>;
};

export type RequestOptions = {
  /**
   * Makes a write safe to repeat: the API answers a repeat with the first
   * answer. Generated for you when left out, and reused on every retry of the
   * call. Pass your own (an order number, say) to make repeats across
   * processes safe too.
   */
  idempotencyKey?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};

type Method = "GET" | "POST" | "DELETE";
type Query = Record<string, string | number | undefined>;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class Transport {
  /**
   * The secret key, in a true private field. A TypeScript `private` property
   * is an ordinary enumerable one at run time, so console.log(client),
   * util.inspect, JSON.stringify or an error reporter walking the client would
   * print the key. A #field is reachable from this class's own code only.
   */
  readonly #key: string;
  private readonly apiBase: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(key: string, options: ClientOptions) {
    this.#key = key;
    const base = new URL(options.apiBase ?? DEFAULT_API_BASE);
    const local = base.hostname === "localhost" || base.hostname === "127.0.0.1";
    if (base.protocol !== "https:" && !(base.protocol === "http:" && local)) {
      throw new TypeError("apiBase must be an https URL. Plain http is allowed only on localhost.");
    }
    this.apiBase = base.toString().replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = Math.max(0, Math.floor(options.maxRetries ?? 2));
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") throw new TypeError("No fetch is available. Use Node.js 18.17 or later, or pass options.fetch.");
    this.fetchImpl = fetchImpl;
    this.sleep = options.sleep ?? defaultSleep;
  }

  async request<T>(method: Method, path: string, init: { query?: Query; body?: unknown; options?: RequestOptions | undefined } = {}): Promise<T> {
    const url = new URL(`${this.apiBase}${path}`);
    for (const [name, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined) url.searchParams.set(name, String(value));
    }

    const headers: Record<string, string> = {
      authorization: `Bearer ${this.#key}`,
      accept: "application/json",
      "user-agent": `payments-lk-node/${VERSION} node/${process.version}`,
    };
    let body: string | undefined;
    if (init.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(init.body);
    }
    if (method === "POST") headers["idempotency-key"] = init.options?.idempotencyKey ?? randomUUID();

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await this.send(url, method, headers, body, init.options);
      } catch (error) {
        if (init.options?.signal?.aborted) throw error;
        if (attempt < this.maxRetries) {
          await this.sleep(this.wait(attempt, null));
          continue;
        }
        const reason = error instanceof Error ? error.message : String(error);
        throw new ConnectionError(`Could not reach Payments.lk at ${this.apiBase}: ${reason}`, { cause: error });
      }

      if (RETRY_STATUSES.has(response.status) && attempt < this.maxRetries) {
        await response.body?.cancel().catch(() => undefined);
        await this.sleep(this.wait(attempt, response.headers.get("retry-after")));
        continue;
      }

      const text = await response.text();
      const traceHeader = response.headers.get("x-trace-id");
      if (!response.ok) throw errorFromResponse(response.status, text, traceHeader);
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new ApiError(response.status, "INVALID_RESPONSE", "Payments.lk answered with something that is not JSON.", traceHeader);
      }
    }
  }

  private async send(url: URL, method: Method, headers: Record<string, string>, body: string | undefined, options: RequestOptions | undefined): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`no answer within ${options?.timeoutMs ?? this.timeoutMs} ms`)), options?.timeoutMs ?? this.timeoutMs);
    const signal = options?.signal;
    const onAbort = () => controller.abort(signal?.reason);
    if (signal?.aborted) onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      return await this.fetchImpl(url, { method, headers, body, signal: controller.signal, redirect: "error" });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  /** Retry-After when the API sends whole seconds, otherwise exponential backoff with jitter. */
  private wait(attempt: number, retryAfter: string | null): number {
    if (retryAfter !== null && /^[0-9]{1,6}$/.test(retryAfter)) return Math.min(Number(retryAfter) * 1_000, MAX_WAIT_MS);
    return Math.min(500 * 2 ** attempt, 8_000) + randomInt(0, 250);
  }
}
