// Signs a webhook the way the Payments.lk dispatcher does: t=<unix seconds> and
// v1=<hex HMAC-SHA256 of "<t>.<body>" under the endpoint's secret>. The
// Payments.lk monorepo runs the same tests against the dispatcher's own signer
// before every release.
import { createHmac } from "node:crypto";

export function signWebhook(secret: string, body: string, timestampSeconds: number): string {
  const v1 = createHmac("sha256", secret).update(`${timestampSeconds}.${body}`, "utf8").digest("hex");
  return `t=${timestampSeconds},v1=${v1}`;
}
