import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookSignatureError } from "./errors.js";
import type { WebhookEvent, WebhookTestPing } from "./types.js";

/** The header every webhook carries: t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body">. */
export const WEBHOOK_SIGNATURE_HEADER = "payments-signature";
export const WEBHOOK_TOLERANCE_SECONDS = 300;

export type VerifyOptions = {
  /** How far the signature's time may be from now, either way. Defaults to 300 seconds. */
  toleranceSeconds?: number;
  /** Now, in seconds since the epoch. For tests. */
  now?: number;
};

type Payload = string | Uint8Array;

function text(payload: Payload): string {
  if (typeof payload === "string") return payload;
  if (payload instanceof Uint8Array) return Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength).toString("utf8");
  throw new TypeError("Pass the raw request body as a string or Buffer, exactly as received, not a parsed object.");
}

function failure(payload: string, header: string | string[] | null | undefined, secret: string, options: VerifyOptions): string | null {
  if (typeof secret !== "string" || secret === "") throw new TypeError("Pass the endpoint's signing secret, which starts with whsec_.");
  const value = Array.isArray(header) ? header.join(",") : header;
  if (!value) return "The Payments-Signature header is missing.";
  if (value.length > 1_000) return "The Payments-Signature header is too long.";

  let timestamp: number | undefined;
  const candidates: string[] = [];
  for (const part of value.split(",")) {
    const [key, item] = part.trim().split("=", 2);
    if (key === "t" && item && /^[0-9]{1,12}$/.test(item)) timestamp = Number(item);
    if (key === "v1" && item && /^[0-9a-f]{64}$/.test(item)) candidates.push(item);
  }
  if (timestamp === undefined || candidates.length === 0) return "The Payments-Signature header is not in the expected t=...,v1=... form.";

  const now = options.now ?? Math.floor(Date.now() / 1_000);
  const tolerance = options.toleranceSeconds ?? WEBHOOK_TOLERANCE_SECONDS;
  if (Math.abs(now - timestamp) > tolerance) return "The webhook's timestamp is outside the tolerance. Check this server's clock, or it may be a replay.";

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest();
  const matched = candidates.some((candidate) => timingSafeEqual(expected, Buffer.from(candidate, "hex")));
  return matched ? null : "No signature matches this body and secret. Use the raw body and this endpoint's own secret.";
}

/** True only for a body signed with this secret within the tolerance. */
export function verifyWebhookSignature(payload: Payload, header: string | string[] | null | undefined, secret: string, options: VerifyOptions = {}): boolean {
  return failure(text(payload), header, secret, options) === null;
}

/**
 * Verifies a webhook and returns its event, typed by its type: check
 * event.type and event.data narrows to the payment, refund, saved card or
 * expired checkout it carries, or to the dashboard's test.ping. Throws WebhookSignatureError when the
 * signature does not verify or the body is not an event: answer 400 then.
 *
 * constructEvent<T>(...) is the older form, with data typed as T.
 */
export function constructEvent(payload: Payload, header: string | string[] | null | undefined, secret: string, options?: VerifyOptions): WebhookEvent | WebhookTestPing;
export function constructEvent<T>(payload: Payload, header: string | string[] | null | undefined, secret: string, options?: VerifyOptions): WebhookEvent<T>;
export function constructEvent(
  payload: Payload,
  header: string | string[] | null | undefined,
  secret: string,
  options: VerifyOptions = {},
): WebhookEvent<unknown> | WebhookTestPing {
  const body = text(payload);
  const problem = failure(body, header, secret, options);
  if (problem) throw new WebhookSignatureError(problem);
  let event: unknown;
  try {
    event = JSON.parse(body) as unknown;
  } catch {
    throw new WebhookSignatureError("The webhook body is not JSON.");
  }
  const record = event as Record<string, unknown> | null;
  if (record === null || typeof record !== "object" || record["object"] !== "event" || typeof record["id"] !== "string" || typeof record["type"] !== "string") {
    throw new WebhookSignatureError("The webhook body is not a Payments.lk event.");
  }
  return event as WebhookEvent<unknown>;
}
