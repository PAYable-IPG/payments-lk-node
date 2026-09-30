// The fake transport and the objects the client tests share. Nothing here
// imports a workspace package, so the SDK's public repository runs these tests
// as they are (scripts/sdk-public.mjs).
import { vi } from "vitest";
import { PaymentsLk, type ClientOptions } from "../../src/index.js";

/** A made up key. The underscores keep it from looking like a live credential to secret scanners. */
export const TEST_KEY = "sk_test_fixture_not_a_real_key";

export type Call = { url: URL; init: RequestInit };

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

export function setup(responses: Array<Response | Error>, options: ClientOptions = {}) {
  const calls: Call[] = [];
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: new URL(String(input)), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error("no response queued");
    if (next instanceof Error) throw next;
    return next;
  }) as typeof globalThis.fetch;
  const sleep = vi.fn(async (_ms: number) => undefined);
  const lk = new PaymentsLk(TEST_KEY, { apiBase: "https://api.example.lk", fetch, sleep, ...options });
  const header = (i: number, name: string) => (calls[i]?.init.headers as Record<string, string> | undefined)?.[name] ?? null;
  return { lk, calls, sleep, header };
}

export const payment = {
  object: "payment",
  id: "pay_0123456789abcdefghijklmn",
  mode: "test",
  status: "requires_payment_method",
  amountCents: 145_000,
  currency: "LKR",
  description: "Chicken kottu",
  reference: "order-1",
  customer: null,
  card: null,
  feeCents: null,
  netCents: null,
  refundedCents: 0,
  failureMessage: null,
  paymentLinkId: null,
  checkoutId: "chk_0123456789abcdefghijklmn",
  createdAt: "2026-09-15T00:00:00.000Z",
  succeededAt: null,
};
export const checkout = { object: "checkout", id: "chk_0123456789abcdefghijklmn", mode: "test", status: "open", url: "https://payments.lk/checkout/chk_0123456789abcdefghijklmn", expiresAt: "2026-09-15T01:00:00.000Z", payment };
