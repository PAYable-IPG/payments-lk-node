# Payments.lk for Node.js

The Node.js library for the Payments.lk API: checkouts, payments, refunds, payment links, saved cards, events, the account and webhook verification. No dependencies, typed throughout. What changed in each version is in [CHANGELOG.md](CHANGELOG.md).

- Node.js 18.17 or later
- Use a secret key (`sk_test_...` or `sk_live_...`) on your server only. Never put it in a browser or an app.

## Install

```bash
npm install @payments-lk/node
```

Or `pnpm add @payments-lk/node`, or `yarn add @payments-lk/node`. Every version is built and published to npm by GitHub Actions from [github.com/PAYable-IPG/payments-lk-node](https://github.com/PAYable-IPG/payments-lk-node), with provenance: `npm audit signatures` checks it.

Installed it from a payments.lk tarball before? Run `npm install @payments-lk/node@latest` and npm replaces the tarball's address in your `package.json`.

## Take a payment

Create a checkout on your server and send the customer to its `url`. The customer pays on the hosted checkout, so card details never touch your servers.

```ts
import express from "express";
import { PaymentsLk } from "@payments-lk/node";

const lk = new PaymentsLk(process.env.PAYMENTS_LK_SECRET_KEY!);
const app = express();

app.post("/buy", async (req, res) => {
  const checkout = await lk.checkouts.create(
    {
      amountCents: 145_000, // Rs. 1,450.00
      description: "Chicken kottu",
      reference: "order-8891",
      successUrl: "https://yourshop.lk/thanks?order=order-8891",
      cancelUrl: "https://yourshop.lk/cart",
    },
    { idempotencyKey: "order-8891" },
  );
  res.redirect(303, checkout.url);
});
```

### Line items and the checkout's language

Send `lineItems` instead of `amountCents` and the API adds them up; `description` is then optional and defaults to a summary line. `locale` opens the hosted checkout in Sinhala (`si`), Tamil (`ta`) or English (`en`), and the checkout's `url` carries the language.

```ts
const checkout = await lk.checkouts.create(
  {
    lineItems: [
      { name: "Chicken kottu", unitAmountCents: 145_000, quantity: 2 },
      { name: "Ceylon tea", description: "250g, loose leaf", unitAmountCents: 95_000, quantity: 1 },
    ],
    reference: "order-8892",
    locale: "si",
    successUrl: "https://yourshop.lk/thanks?order=order-8892",
  },
  { idempotencyKey: "order-8892" },
);
// checkout.payment.order.lines lists what the customer is paying for
```

One to ten lines, each 1 to 99 of a unit price from Rs. 1 (`100`) to Rs. 1,000,000. Passing both `amountCents` and `lineItems` does not type check, and the API refuses it.

When the checkout ends, the customer returns to `successUrl` or `cancelUrl` with `checkout=<id>` and `status=<succeeded|failed|canceled|expired>` added. That return proves nothing on its own: anyone can type a URL. Mark the order paid only after you have confirmed it.

## Confirm the payment

Either ask the API:

```ts
const checkout = await lk.checkouts.retrieve(checkoutId);
if (checkout.payment.status === "succeeded" && checkout.payment.amountCents === expectedCents) {
  // fulfil the order
}
```

or, better, act on the signed `payment.succeeded` webhook. Verify it against the raw body, exactly as received:

```ts
app.post("/webhooks/payments-lk", express.raw({ type: "application/json" }), (req, res) => {
  let event;
  try {
    event = lk.webhooks.constructEvent(req.body, req.headers["payments-signature"], process.env.PAYMENTS_LK_WEBHOOK_SECRET!);
  } catch {
    return res.sendStatus(400);
  }
  if (event.type === "payment.succeeded") {
    // event.data is the Payment; fulfil the order it names, once
  }
  res.sendStatus(200);
});
```

`constructEvent` returns a `WebhookEvent`, a union keyed by `type`, so checking the type narrows `data`:

| `type` | `data` |
| --- | --- |
| `payment.succeeded`, `payment.failed` | the `Payment` |
| `checkout.expired` | `{ object: "checkout", id, paymentId }` |
| `card.saved` | the `SavedCard` |
| `refund.succeeded`, `refund.failed` | the `Refund`, with the `Payment` as it stands after it in `data.payment` |

The same event can arrive more than once, so make your handler safe to repeat. `constructEvent<T>(...)` still works and types `data` as `T`.

## Events and the account

The events your webhooks receive can also be read, in the same shape, newest first. Use them to catch up after your endpoint was down:

```ts
for await (const event of lk.events.listAll({ type: "payment.succeeded", since: "2026-09-18T00:00:00Z" })) {
  await fulfilOnce(event.id, event.data);
}

const event = await lk.events.retrieve("evt_...");
const account = await lk.account.retrieve(); // status, clearance, pricingPlan, liveEnabled
```

Only the six event types above are listed. A test key reads test events and a live key live ones.

## Checkouts for a mobile app

Your app never holds a secret key. It asks your server for a checkout, opens `checkout.url` with the Payments.lk iOS, Android or React Native SDK, and comes back through its own URL scheme:

```ts
app.post("/app/checkouts", requireSignedInCustomer, async (req, res) => {
  const order = await orders.forCustomer(req.user.id, req.body.orderId);
  const checkout = await lk.checkouts.create(
    {
      amountCents: order.totalCents,
      description: order.summary,
      reference: order.id,
      successUrl: "myshop://payments-lk/return",
      cancelUrl: "myshop://payments-lk/return",
    },
    { idempotencyKey: `order-${order.id}` },
  );
  res.json({ id: checkout.id, url: checkout.url });
});
```

Set the amount from your own records, never from the app's request.

## Refunds

```ts
const refund = await lk.refunds.create({ paymentId: "pay_...", amountCents: 50_000, reason: "One item out of stock" });
```

Leave out `amountCents` to refund everything still refundable. A refund is recorded as `pending` and queued for Payable: a live refund goes to Payable, a sandbox refund to Payable's sandbox, and `refund.succeeded` or `refund.failed` tells you how it ended. Payable refunds a card payment only once it has settled, from the next bank working day, so a refund asked for sooner fails and can be asked for again. Only a payment taken by a local development API's simulator refunds at once.

## Payment links and listing

```ts
const link = await lk.paymentLinks.create({ title: "Cake order deposit", amountCents: 250_000 });
await lk.paymentLinks.retire(link.id);

for await (const p of lk.payments.listAll({ status: "succeeded" })) {
  console.log(p.id, p.amountCents);
}
```

`list` returns one page (`data`, `hasMore`, `nextCursor`); `listAll` reads every page as you iterate. `all` is the same as `listAll`, the name the PHP library uses, on payments, refunds, saved cards and events.

## Saved cards

A customer keeps their card by ticking the box on the hosted checkout, which you offer with `saveCard: true`. You never see the card number: the `card.saved` webhook brings you a card id to keep against your customer, and you charge it later without them present.

```ts
// Offer to keep the card. The customer decides on the checkout page.
const checkout = await lk.checkouts.create({ amountCents: 145_000, description: "Weekly box", saveCard: true, customer: { name: "Ruwan", email: "ruwan@example.lk" } });

// Later, from your own records, or by asking for the customer's cards.
const page = await lk.cards.list({ customerEmail: "ruwan@example.lk" });
for await (const card of lk.cards.listAll({ customerEmail: "ruwan@example.lk" })) {
  console.log(card.id, card.scheme, card.last4, card.expiry);
}

const payment = await lk.cards.charge(page.data[0]!.id, { amountCents: 145_000, description: "Weekly box" }, { idempotencyKey: "box-1042-2026-10" });
await lk.cards.delete(page.data[0]!.id);
```

Four things are worth knowing.

- **Charge only what the customer agreed to.** `card.consent` says when they agreed, in which language and which wording they read; `cards.retrieve(id)` answers for a deleted card as well, so you can still show it. Keep the id you charge against your own record of the agreement.
- **One idempotency key per billing period**, such as `sub-1042-2026-10`. A retry then never charges twice. The window is 24 hours: a job that retries later than that should read the payment first.
- **A charge is usually `processing`.** The outcome arrives as `payment.succeeded` or `payment.failed`; the payment carries `savedCardId`.
- **Watch `expiry`.** A charge after the card expires is declined, so ask the customer for a new card before then. `cards.delete` removes the card here and its token at the processor; deleting one already deleted answers the same card.

Saved cards need Payable's Advanced plan, in the sandbox as well as live, and switching on in the dashboard for live. One-time checkouts and payment links work on every plan.

## Subscriptions and billing

We renew each subscription every period, charge the card the customer kept, retry a decline on days 1, 3, 7 and 14, email the customer and send you the events. You make the prices and start the subscriptions; `customer.subscription.*` and `invoice.*` webhooks tell you what happened.

```ts
const customer = await lk.customers.create({ email: "nimali@example.lk", name: "Nimali Perera" });
const price = await lk.prices.create({ product: { name: "Gym and pool" }, unitAmountCents: 600_000, interval: "month" });

// With a card on file the first invoice is charged within a minute. Without one, send the customer to checkoutUrl.
const subscription = await lk.subscriptions.create({ customerId: customer.id, priceId: price.id, trialDays: 14 }, { idempotencyKey: "member-1042" });

// See what a change costs before making it.
const preview = await lk.invoices.preview({ subscriptionId: subscription.id, quantity: 2 });
await lk.subscriptions.update(subscription.id, { quantity: 2 });
await lk.subscriptions.cancel(subscription.id, { atPeriodEnd: true });

// Let the customer manage it themselves: send them to the portal address, good for an hour.
const portal = await lk.billingPortal.sessions.create({ customerId: customer.id, returnUrl: "https://gym.example.lk/account" });
```

Everything else the billing API does has a method with the same name as its endpoint:

- `customers` (and `createBalanceTransaction` for credit), `prices`, `coupons`, `taxRates`, `invoiceItems`.
- `invoices`: `upcoming`, `preview`, standalone `create`, then `finalize`, `send`, `pay`, `void` and `markUncollectible`. `creditNotes` take part of an invoice back.
- `subscriptionSchedules` for plans that change on their own and installments. `subscriptionLinks` for a link anyone can open to subscribe.
- `meters` and `meterEvents` for usage based prices, and `usageAlerts`. Send an `identifier` with each meter event so a retry counts once.
- `entitlements.features`, `products.attachFeature` and `entitlements.activeEntitlements.list({ customerId })`, so your app asks which features a customer has.
- `testClocks.advance` runs a sandbox subscription's time ahead, to see a renewal or a trial's end without waiting.

Live subscriptions need saved cards switched on, as charging a saved card does.

On a website with no server, a subscription link does the same job: `<button data-payments-lk-subscribe="LINKCODE" data-payments-lk-plan="price_...">` opens it with a plan chosen, and `<div data-payments-lk-plans="LINKCODE"></div>` puts its whole plan chooser on the page, both with `https://payments.lk/js/pay.js`. The dashboard's Integrate panel on each plan writes the snippets.

## Errors

Every error is a `PaymentsLkError`. A refusal from the API is an `ApiError` with `status`, a stable `code`, `reason` (a finer stable reason in snake_case, or `null`), `apiMessage` (the API's sentence), `docUrl` (the documentation for the error: always an https address on payments.lk, or `null`, since an address anywhere else in an error body is dropped), `traceId` to quote to support, and `fields` for validation problems. `message` is the API's sentence followed by the documentation link when there is one. Branch on `code` or `reason`, never on the text.

```ts
import { ApiError, ValidationError } from "@payments-lk/node";

try {
  await lk.checkouts.create({ amountCents: 500, description: "Tea" });
} catch (error) {
  if (error instanceof ValidationError) console.log(error.fields); // [{ path: "amountCents", message: "The smallest payment is Rs. 10." }]
  else if (error instanceof ApiError) console.log(error.code, error.reason, error.docUrl, error.traceId);
  else throw error;
}
```

| Class | When |
| --- | --- |
| `ValidationError` | 400 or 422 |
| `AuthenticationError` | 401: missing, wrong or revoked key |
| `PermissionError` | 403: the key may not do this |
| `NotFoundError` | 404: nothing with that id for this key's mode |
| `ConflictError` | 409: for example an idempotency key reused with a different body. Never retried |
| `RateLimitError` | 429, after retries |
| `ServerError` | 5xx, after retries |
| `ConnectionError` | the API could not be reached, after retries |
| `WebhookSignatureError` | a webhook did not verify |

## Retries and idempotency

Network failures, 429 and 5xx answers are retried twice with backoff, honouring `Retry-After`. No other 4xx is retried, a 409 included. One 409 is worth repeating yourself: `reason` `idempotency_key_in_progress` means a first request with the same key is still running, so wait a moment and send the same call with the same `idempotencyKey` to get its answer. The key is remembered for 24 hours, separately for test and live keys. After that the same key starts a new request, so a job that may retry more than 24 hours later must first check whether the object exists (`events.list`, or `retrieve` with the id it saved) rather than rely on the key. Every reason is explained at https://payments.lk/developers/errors, which is where `docUrl` points. Every write carries an `Idempotency-Key`, generated for you and reused on each retry, so a retry never creates a second checkout or refund. Pass your own key, such as an order number, to make repeats safe across processes and restarts too.

## Options

```ts
new PaymentsLk(key, {
  apiBase: "https://api.payments.lk", // point at a staging API while you test
  timeoutMs: 30_000,
  maxRetries: 2,
});
```

Each call also takes `{ idempotencyKey, timeoutMs, signal }`.

## Development

```bash
pnpm --filter @payments-lk/node build
pnpm --filter @payments-lk/node test
```

The tests check the library's types against the API's own contracts and verify webhooks signed by the same code the Payments.lk dispatcher runs.
