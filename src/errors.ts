export type FieldError = { path: string; message: string };

/**
 * An https address on payments.lk or one of its subdomains, written plainly:
 * the host straight after the scheme (no user, password or port), then a path,
 * query or fragment of printable ASCII with no space and no backslash.
 */
const DOC_URL = /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*payments\.lk(?:[/?#][\x21-\x5b\x5d-\x7e]*)?$/i;

/**
 * Whether a docUrl from an error body may be shown. The body is whatever
 * answered the request, which behind a proxy or a wrong apiBase is not always
 * the API, and the address ends up in the error's message, in logs and in
 * front of people. So it is kept only when it is a documentation address of
 * ours, and read again by the URL parser so both agree on the host.
 */
function isDocUrl(value: string): boolean {
  if (value.length > 500 || !DOC_URL.test(value)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && url.username === "" && url.password === "" && url.port === "" && (host === "payments.lk" || host.endsWith(".payments.lk"));
  } catch {
    return false;
  }
}

/** Every error this library throws. */
export class PaymentsLkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/**
 * The parts of an error body beyond its code, message and trace id. The API
 * answers every error with { code, reason?, message, docUrl, traceId, fields? }.
 */
export type ApiErrorDetails = {
  /** A finer, stable reason in snake_case, such as merchant_not_live, when the API gives one. */
  reason?: string | null;
  /** The documentation for this error: an https address on payments.lk. Anything else is dropped. */
  docUrl?: string | null;
};

/**
 * The API refused or failed a request. code is the API's stable code, such as
 * VALIDATION_FAILED; reason, when present, is a finer stable reason; apiMessage
 * is the API's own sentence; message is that sentence followed by a link to
 * docUrl when the API sends one; traceId is what to quote to Payments.lk
 * support.
 */
export class ApiError extends PaymentsLkError {
  /** A finer, stable reason in snake_case, or null. Branch on this or on code, never on the message. */
  readonly reason: string | null;
  /** The documentation page for this error, always an https address on payments.lk. Null when the body named none, or named anywhere else. */
  readonly docUrl: string | null;
  /** The API's sentence on its own, without the documentation link. */
  readonly apiMessage: string;

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly traceId: string | null,
    readonly fields: FieldError[] = [],
    details: ApiErrorDetails = {},
  ) {
    const docUrl = typeof details.docUrl === "string" && isDocUrl(details.docUrl) ? details.docUrl : null;
    super(docUrl ? `${message} See ${docUrl}` : message);
    this.apiMessage = message;
    this.reason = details.reason ?? null;
    this.docUrl = docUrl;
  }
}

/** 400 or 422: the request was not valid. fields names each problem. */
export class ValidationError extends ApiError {}
/** 401: the key is missing, wrong or revoked. */
export class AuthenticationError extends ApiError {}
/** 403: the key may not do this, for example a publishable key reading payments. */
export class PermissionError extends ApiError {}
/** 404: no such object for this key's mode. */
export class NotFoundError extends ApiError {}
/** 409: the request conflicts, for example an Idempotency-Key reused with a different body. Never retried. */
export class ConflictError extends ApiError {}
/** 429: too many requests. Retried automatically before this is thrown. */
export class RateLimitError extends ApiError {}
/** 5xx: Payments.lk failed. Retried automatically before this is thrown. */
export class ServerError extends ApiError {}

/** The API could not be reached, or did not answer in time, after every retry. */
export class ConnectionError extends PaymentsLkError {}

/** A webhook's signature did not verify, or its body is not an event. */
export class WebhookSignatureError extends PaymentsLkError {}

const DEFAULT_CODES: Record<number, string> = {
  400: "VALIDATION_FAILED",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_FAILED",
  429: "RATE_LIMITED",
  501: "NOT_SUPPORTED",
};

/** The API's reasons are snake case: a letter, then letters, digits and underscores. */
const REASON = /^[a-z][a-z0-9_]{1,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The right error for an API response that was not a success. */
export function errorFromResponse(status: number, text: string, traceHeader: string | null): ApiError {
  let body: unknown = null;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    body = null;
  }
  const record = isRecord(body) ? body : {};
  const code = typeof record["code"] === "string" ? record["code"] : (DEFAULT_CODES[status] ?? (status >= 500 ? "INTERNAL" : "UNKNOWN"));
  const traceId = typeof record["traceId"] === "string" ? record["traceId"] : traceHeader;
  const fields = Array.isArray(record["fields"])
    ? record["fields"].filter((f): f is FieldError => isRecord(f) && typeof f["path"] === "string" && typeof f["message"] === "string")
    : [];
  const reason = typeof record["reason"] === "string" && REASON.test(record["reason"]) ? record["reason"] : null;
  const docUrl = typeof record["docUrl"] === "string" && isDocUrl(record["docUrl"]) ? record["docUrl"] : null;
  const message =
    typeof record["message"] === "string" && record["message"] !== "" ? record["message"] : `Payments.lk answered with HTTP ${status}${reason ? ` (${reason})` : ""}.`;

  const Kind =
    status === 400 || status === 422
      ? ValidationError
      : status === 401
        ? AuthenticationError
        : status === 403
          ? PermissionError
          : status === 404
            ? NotFoundError
            : status === 409
              ? ConflictError
              : status === 429
                ? RateLimitError
                : status >= 500
                  ? ServerError
                  : ApiError;
  return new Kind(status, code, message, traceId, fields, { reason, docUrl });
}
