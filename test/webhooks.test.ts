import { describe, expect, it } from "vitest";
import { PaymentsLk, WebhookSignatureError, constructEvent, verifyWebhookSignature } from "../src/index.js";
import { signWebhook } from "./support/sign.js";

const secret = `whsec_${"k".repeat(43)}`;
const now = 1_726_400_000;
const body = JSON.stringify({ id: "evt_0123456789abcdefghijklmn", object: "event", type: "payment.succeeded", mode: "test", created: "2026-09-15T00:00:00.000Z", data: { id: "pay_0123456789abcdefghijklmn" } });

describe("webhook verification", () => {
  it("accepts exactly what the Payments.lk dispatcher signs, as a string or a Buffer", () => {
    const header = signWebhook(secret, body, now);
    expect(constructEvent(body, header, secret, { now }).type).toBe("payment.succeeded");
    expect(constructEvent(Buffer.from(body), header, secret, { now }).id).toBe("evt_0123456789abcdefghijklmn");
    expect(verifyWebhookSignature(body, [header], secret, { now })).toBe(true);
    expect(new PaymentsLk("sk_test_abc").webhooks.constructEvent(body, header, secret, { now }).mode).toBe("test");
  });

  it("agrees with the server on the shared cross language vector", () => {
    const vectorBody = '{"id":"evt_1","object":"event"}';
    // The same literal is pinned in the PHP SDK's tests, so all three agree byte for byte.
    const header = "t=1726400000,v1=da3ac9bfe911ba0bc6b90e3c5591d7942230249bc4c73334e8def4d9354a14aa";
    expect(signWebhook("whsec_test", vectorBody, 1_726_400_000)).toBe(header);
    expect(verifyWebhookSignature(vectorBody, header, "whsec_test", { now: 1_726_400_000 })).toBe(true);
  });

  it("refuses a wrong secret, a changed body, and a timestamp outside the tolerance either way", () => {
    const header = signWebhook(secret, body, now);
    expect(verifyWebhookSignature(body, header, `whsec_${"x".repeat(43)}`, { now })).toBe(false);
    expect(verifyWebhookSignature(body.replace("succeeded", "failed"), header, secret, { now })).toBe(false);
    expect(verifyWebhookSignature(body, header, secret, { now: now + 301 })).toBe(false);
    expect(verifyWebhookSignature(body, header, secret, { now: now - 301 })).toBe(false);
    expect(verifyWebhookSignature(body, header, secret, { now: now + 60, toleranceSeconds: 30 })).toBe(false);
    expect(() => constructEvent(body, header, secret, { now: now + 301 })).toThrow(/tolerance/);
  });

  it("accepts any one matching v1 among several", () => {
    const good = signWebhook(secret, body, now).split(",")[1];
    expect(verifyWebhookSignature(body, `t=${now},v1=${"0".repeat(64)},${good}`, secret, { now })).toBe(true);
  });

  it("refuses missing, malformed and oversized headers", () => {
    for (const header of [undefined, null, "", "v1=abc", `t=${now}`, `t=soon,v1=${"a".repeat(64)}`, `t=${now},v1=${"A".repeat(64)}`, `t=${now},v1=${"a".repeat(2_000)}`]) {
      expect(verifyWebhookSignature(body, header, secret, { now }), String(header).slice(0, 40)).toBe(false);
    }
    expect(() => constructEvent(body, undefined, secret, { now })).toThrow(WebhookSignatureError);
  });

  it("returns an event typed by its type, and keeps the older generic form", () => {
    const refundBody = JSON.stringify({
      id: "evt_refund00000000000000000",
      object: "event",
      type: "refund.succeeded",
      mode: "test",
      created: "2026-09-18T00:00:00.000Z",
      data: { object: "refund", id: "re_1", payment: { object: "payment", id: "pay_1", refundedCents: 5_000 } },
    });
    const event = constructEvent(refundBody, signWebhook(secret, refundBody, now), secret, { now });
    let refunded: number | null = null;
    switch (event.type) {
      case "refund.succeeded":
      case "refund.failed":
        refunded = event.data.payment.refundedCents;
        break;
      case "checkout.expired":
        expect(event.data.paymentId).toBeTypeOf("string");
        break;
      default:
        expect(event.data.object === "payment" || event.data.object === "saved_card").toBe(true);
    }
    expect(refunded).toBe(5_000);
    const untyped = constructEvent<{ id: string }>(refundBody, signWebhook(secret, refundBody, now), secret, { now });
    expect(untyped.data.id).toBe("re_1");
  });

  it("refuses a verified body that is not an event, a parsed body and an empty secret", () => {
    const notEvent = JSON.stringify({ id: "x", object: "payment", type: "payment.succeeded" });
    expect(() => constructEvent(notEvent, signWebhook(secret, notEvent, now), secret, { now })).toThrow(/not a Payments.lk event/);
    expect(() => constructEvent(JSON.parse(body) as unknown as string, signWebhook(secret, body, now), secret, { now })).toThrow(/raw request body/);
    expect(() => verifyWebhookSignature(body, signWebhook(secret, body, now), "", { now })).toThrow(/signing secret/);
  });
});

describe("the dashboard's test event", () => {
  it("comes back from constructEvent typed as test.ping", async () => {
    const { createHmac } = await import("node:crypto");
    const secret = "whsec_test_ping_secret";
    const body = JSON.stringify({ id: "evt_ping", object: "event", type: "test.ping", mode: "test", created: new Date().toISOString(), data: { object: "ping", endpointId: "we_1" } });
    const t = Math.floor(Date.now() / 1000);
    const header = `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
    const event = constructEvent(body, header, secret);
    if (event.type === "test.ping") expect(event.data.endpointId).toBe("we_1");
    else throw new Error("expected test.ping");
  });
});
