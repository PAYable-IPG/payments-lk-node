import { describe, expect, it } from "vitest";
import {
  ApiError,
  AuthenticationError,
  ConflictError,
  ConnectionError,
  NotFoundError,
  PaymentsLk,
  PermissionError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "../src/index.js";
import { TEST_KEY, UUID, checkout, json, payment, setup } from "./support/client.js";

describe("the client", () => {
  it("refuses a missing or malformed key and an insecure API base", () => {
    expect(() => new PaymentsLk("")).toThrow(TypeError);
    expect(() => new PaymentsLk("whsec_abc")).toThrow(/sk_test_/);
    expect(() => new PaymentsLk("sk_test_abc", { apiBase: "http://api.example.lk" })).toThrow(/https/);
    expect(() => new PaymentsLk("sk_test_abc", { apiBase: "http://localhost:3312" })).not.toThrow();
  });

  it("creates a checkout with the key, a JSON body and a generated idempotency key", async () => {
    const { lk, calls, header } = setup([json(201, checkout)]);
    const created = await lk.checkouts.create({ amountCents: 145_000, description: "Chicken kottu", reference: "order-1", successUrl: "myshop://paid" });

    expect(created.url).toBe(checkout.url);
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.url.toString()).toBe("https://api.example.lk/v1/checkouts");
    expect(header(0, "authorization")).toBe(`Bearer ${TEST_KEY}`);
    expect(header(0, "content-type")).toBe("application/json");
    expect(header(0, "idempotency-key")).toMatch(UUID);
    expect(header(0, "user-agent")).toMatch(/^payments-lk-node\/0\.4\.2 node\//);
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ amountCents: 145_000, description: "Chicken kottu", reference: "order-1", successUrl: "myshop://paid" });
    expect(calls[0]?.init.redirect).toBe("error");
  });

  it("keeps the same idempotency key on every retry of one call", async () => {
    const { lk, calls, header, sleep } = setup([new Response(null, { status: 503 }), json(201, checkout)]);
    await lk.checkouts.create({ amountCents: 145_000, description: "Chicken kottu" });
    expect(calls).toHaveLength(2);
    expect(header(0, "idempotency-key")).toMatch(UUID);
    expect(header(1, "idempotency-key")).toBe(header(0, "idempotency-key"));
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("uses the caller's idempotency key and a fresh one for the next call", async () => {
    const { lk, header } = setup([json(201, checkout), json(201, checkout)]);
    await lk.checkouts.create({ amountCents: 145_000, description: "Chicken kottu" }, { idempotencyKey: "order-1-attempt-1" });
    await lk.checkouts.create({ amountCents: 145_000, description: "Chicken kottu" });
    expect(header(0, "idempotency-key")).toBe("order-1-attempt-1");
    expect(header(1, "idempotency-key")).not.toBe("order-1-attempt-1");
  });

  it("waits as long as Retry-After asks, up to a limit", async () => {
    const { lk, sleep } = setup([json(429, { code: "RATE_LIMITED", message: "Slow down.", traceId: "t1" }, { "retry-after": "2" }), json(429, {}, { "retry-after": "600" }), json(200, payment)]);
    await lk.payments.retrieve(payment.id);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([2_000, 20_000]);
  });

  it("throws the API's refusal without retrying a 400", async () => {
    const { lk, calls } = setup([json(400, { code: "VALIDATION_FAILED", message: "The request is not valid.", traceId: "trace-1", fields: [{ path: "amountCents", message: "The smallest payment is Rs. 10." }] })]);
    const error = await lk.checkouts.create({ amountCents: 5, description: "x" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ status: 400, code: "VALIDATION_FAILED", traceId: "trace-1", fields: [{ path: "amountCents", message: "The smallest payment is Rs. 10." }] });
    expect(calls).toHaveLength(1);
  });

  it("names each refusal by its status", async () => {
    const cases: Array<[number, new (...args: never[]) => ApiError]> = [
      [401, AuthenticationError],
      [403, PermissionError],
      [404, NotFoundError],
      [409, ConflictError],
      [422, ValidationError],
      [429, RateLimitError],
      [500, ServerError],
      [418, ApiError],
    ];
    for (const [status, Kind] of cases) {
      const { lk } = setup([json(status, { code: "X", message: `status ${status}`, traceId: "t" })], { maxRetries: 0 });
      const error = await lk.payments.retrieve(payment.id).catch((e: unknown) => e);
      expect(error, String(status)).toBeInstanceOf(Kind);
      expect((error as ApiError).message).toBe(`status ${status}`);
    }
  });

  it("gives a plain message when an error body is not JSON", async () => {
    const { lk } = setup([new Response("<html>bad gateway</html>", { status: 502, headers: { "x-trace-id": "edge-1" } })], { maxRetries: 0 });
    const error = await lk.payments.retrieve(payment.id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServerError);
    expect(error).toMatchObject({ code: "INTERNAL", traceId: "edge-1", message: "Payments.lk answered with HTTP 502." });
  });

  it("retries a network failure, then reports it as a connection error", async () => {
    const { lk, calls } = setup([new TypeError("fetch failed"), new TypeError("fetch failed")], { maxRetries: 1 });
    const error = await lk.payments.list().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConnectionError);
    expect(calls).toHaveLength(2);
  });

  it("refuses a success that is not JSON", async () => {
    const { lk } = setup([new Response("ok", { status: 200 })]);
    await expect(lk.payments.retrieve(payment.id)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("reads without an idempotency key or body, builds queries and encodes ids", async () => {
    const { lk, calls, header } = setup([json(200, { object: "list", data: [], hasMore: false, nextCursor: null }), json(200, payment)]);
    await lk.payments.list({ limit: 10, status: "succeeded", cursor: undefined });
    await lk.payments.retrieve("pay_1/../refunds");
    expect(calls[0]?.url.search).toBe("?limit=10&status=succeeded");
    expect(calls[0]?.init.body).toBeUndefined();
    expect(header(0, "idempotency-key")).toBeNull();
    expect(calls[1]?.url.pathname).toBe("/v1/payments/pay_1%2F..%2Frefunds");
    expect(() => lk.payments.retrieve("  ")).toThrow(TypeError);
  });

  it("reads every page with listAll", async () => {
    const second = { ...payment, id: "pay_second0000000000000000" };
    const { lk, calls } = setup([
      json(200, { object: "list", data: [payment], hasMore: true, nextCursor: payment.id }),
      json(200, { object: "list", data: [second], hasMore: false, nextCursor: null }),
    ]);
    const ids: string[] = [];
    for await (const p of lk.payments.listAll({ limit: 1 })) ids.push(p.id);
    expect(ids).toEqual([payment.id, second.id]);
    expect(calls[1]?.url.searchParams.get("cursor")).toBe(payment.id);
    expect(calls[1]?.url.searchParams.get("limit")).toBe("1");
  });

  it("never retries a 409, and reads the error's reason and documentation link", async () => {
    const body = { code: "CONFLICT", message: "That key was used with a different request.", traceId: "t-409", reason: "idempotency_key_reused", docUrl: "https://payments.lk/developers/errors#conflict" };
    const { lk, calls, sleep } = setup([json(409, body), json(201, checkout)]);
    const error = await lk.checkouts.create({ amountCents: 145_000, description: "Chicken kottu" }, { idempotencyKey: "order-1-attempt-1" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictError);
    expect(calls).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(error).toMatchObject({
      status: 409,
      code: "CONFLICT",
      reason: "idempotency_key_reused",
      docUrl: "https://payments.lk/developers/errors#conflict",
      apiMessage: "That key was used with a different request.",
      message: "That key was used with a different request. See https://payments.lk/developers/errors#conflict",
    });
  });

  it("leaves reason and docUrl null when the API sends neither, and names the reason when there is no sentence", async () => {
    const { lk } = setup([json(404, { code: "NOT_FOUND", message: "Not found.", traceId: "t" }), json(409, { code: "CONFLICT", reason: "already_refunded" })], { maxRetries: 0 });
    const plain = await lk.payments.retrieve(payment.id).catch((e: unknown) => e);
    expect(plain).toMatchObject({ reason: null, docUrl: null, message: "Not found.", apiMessage: "Not found." });
    const bare = await lk.payments.retrieve(payment.id).catch((e: unknown) => e);
    expect(bare).toMatchObject({ reason: "already_refunded", message: "Payments.lk answered with HTTP 409 (already_refunded)." });
  });

  it("creates a checkout from line items in the customer's language", async () => {
    const { lk, calls } = setup([json(201, { ...checkout, url: "https://payments.lk/si/checkout/chk_0123456789abcdefghijklmn" })]);
    const lineItems = [
      { name: "Chicken kottu", unitAmountCents: 145_000, quantity: 2 },
      { name: "Ceylon tea", description: "250g, loose leaf", unitAmountCents: 95_000, quantity: 1 },
    ];
    const created = await lk.checkouts.create({ lineItems, reference: "order-2", locale: "si" });
    expect(created.url).toContain("/si/checkout/");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ lineItems, reference: "order-2", locale: "si" });
    // An amount and line items together is refused before it is sent: by the compiler.
    // @ts-expect-error amountCents and lineItems cannot be passed together.
    const both: Parameters<typeof lk.checkouts.create>[0] = { amountCents: 1_000, description: "x", lineItems };
    // @ts-expect-error without lineItems, description is required.
    const noDescription: Parameters<typeof lk.checkouts.create>[0] = { amountCents: 1_000 };
    expect([both, noDescription]).toHaveLength(2);
  });

  it("lists and reads events with their filters, and reads the account", async () => {
    const event = { id: "evt_0123456789abcdefghijklmn", object: "event", type: "payment.succeeded", mode: "test", created: "2026-09-18T00:00:00.000Z", data: payment };
    const account = { id: "mer_1", tradingName: "Kottu Hut", status: "activated", applicationStatus: "approved", clearance: { tier: "starter", monthlyCapCents: 100_000_000 }, pricingPlan: "startup", locale: "en", liveEnabled: true, phase1Position: null };
    const { lk, calls, header } = setup([json(200, { object: "list", data: [event], hasMore: false, nextCursor: null }), json(200, event), json(200, account)]);
    const page = await lk.events.list({ type: "payment.succeeded", since: "2026-09-18T00:00:00Z", limit: 5 });
    const one = await lk.events.retrieve("evt_0123456789abcdefghijklmn");
    const me = await lk.account.retrieve();
    expect(calls.map((c) => `${c.init.method} ${c.url.pathname}${c.url.search}`)).toEqual([
      "GET /v1/events?type=payment.succeeded&since=2026-09-18T00%3A00%3A00Z&limit=5",
      "GET /v1/events/evt_0123456789abcdefghijklmn",
      "GET /v1/account",
    ]);
    expect(header(0, "idempotency-key")).toBeNull();
    expect(page.data[0]?.id).toBe(event.id);
    if (one.type === "payment.succeeded") expect(one.data.amountCents).toBe(145_000);
    expect(me).toEqual(account);
    expect(() => lk.events.retrieve("")).toThrow(TypeError);
  });

  it("walks every page as listAll or all, on events, payments and refunds alike", async () => {
    const event = (id: string) => ({ id, object: "event", type: "checkout.expired", mode: "test", created: "2026-09-18T00:00:00.000Z", data: { object: "checkout", id: "chk_1", paymentId: "pay_1" } });
    const { lk, calls } = setup([
      json(200, { object: "list", data: [event("evt_a")], hasMore: true, nextCursor: "evt_a" }),
      json(200, { object: "list", data: [event("evt_b")], hasMore: false, nextCursor: null }),
      json(200, { object: "list", data: [payment], hasMore: false, nextCursor: null }),
      json(200, { object: "list", data: [], hasMore: false, nextCursor: null }),
    ]);
    const ids: string[] = [];
    for await (const e of lk.events.all({ type: "checkout.expired" })) {
      if (e.type === "checkout.expired") ids.push(`${e.id}:${e.data.paymentId}`);
    }
    for await (const p of lk.payments.all()) ids.push(p.id);
    for await (const r of lk.refunds.all({ paymentId: payment.id })) ids.push(r.id);
    expect(ids).toEqual(["evt_a:pay_1", "evt_b:pay_1", payment.id]);
    expect(calls[1]?.url.search).toBe("?type=checkout.expired&cursor=evt_a");
    expect(calls[3]?.url.pathname).toBe("/v1/refunds");
  });

  it("lists, filters, pages and reads saved cards", async () => {
    const card = {
      object: "saved_card",
      id: "card_g2a1rex14ff7qh2dc6j6qzmq",
      mode: "test",
      customerEmail: "ruwan@example.lk",
      scheme: "VISA",
      last4: "4242",
      expiry: { month: 11, year: 2029 },
      paymentId: payment.id,
      consent: { agreedAt: payment.createdAt, locale: "en", wording: "checkoutPage.saveCard@1" },
      active: true,
      createdAt: payment.createdAt,
      retiredAt: null,
    };
    const second = { ...card, id: "card_h3b2sfy25gg8ri3ed7k7ranr" };
    const { lk, calls } = setup([
      json(200, { object: "list", data: [card], hasMore: true, nextCursor: card.id }),
      json(200, { object: "list", data: [second], hasMore: false, nextCursor: null }),
      json(200, card),
    ]);
    const ids: string[] = [];
    for await (const c of lk.cards.listAll({ customerEmail: "ruwan@example.lk", limit: 1 })) ids.push(c.id);
    const read = await lk.cards.retrieve(card.id);
    expect(ids).toEqual([card.id, second.id]);
    expect(calls[0]?.url.pathname).toBe("/v1/cards");
    expect(calls[0]?.url.searchParams.get("customerEmail")).toBe("ruwan@example.lk");
    expect(calls[1]?.url.searchParams.get("cursor")).toBe(card.id);
    expect(calls[2]?.url.pathname).toBe(`/v1/cards/${card.id}`);
    expect(read.expiry).toEqual({ month: 11, year: 2029 });
    expect(read.consent?.wording).toBe("checkoutPage.saveCard@1");
  });

  it("reaches refunds, payment links and saved cards on the API's paths", async () => {
    const refund = { object: "refund", id: "re_1", mode: "test", paymentId: payment.id, status: "succeeded", amountCents: 50_000, currency: "LKR", reason: null, failureMessage: null, createdAt: payment.createdAt, succeededAt: payment.createdAt };
    const { lk, calls } = setup([json(201, refund), json(200, { ...checkout, object: "payment_link" }), json(201, payment), json(200, {})]);
    await lk.refunds.create({ paymentId: payment.id, amountCents: 50_000 });
    await lk.paymentLinks.retire("plink_1");
    await lk.cards.charge("card_1", { amountCents: 145_000, description: "Monthly box" });
    await lk.cards.delete("card_1");
    expect(calls.map((c) => `${c.init.method} ${c.url.pathname}`)).toEqual(["POST /v1/refunds", "DELETE /v1/payment_links/plink_1", "POST /v1/cards/card_1/charge", "DELETE /v1/cards/card_1"]);
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ paymentId: payment.id, amountCents: 50_000 });
  });
});
