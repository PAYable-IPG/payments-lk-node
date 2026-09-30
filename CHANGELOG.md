# Changelog

## 0.4.1 (29 September 2026)

The first version on npm. The code is the same as 0.4.0.

Changed

- Install with `npm install @payments-lk/node`. Every version is built and published by GitHub Actions from https://github.com/PAYable-IPG/payments-lk-node, with npm provenance. Installed from a payments.lk tarball before? `npm install @payments-lk/node@latest` moves you to the registry.
- The package carries its licence and links to its source, issues and documentation.
- Requests say `payments-lk-node/0.4.1` in their `User-Agent`.

## 0.4.0 (25 September 2026)

Monthly limits, subscriptions and billing, card save outcomes.

Added

- `Account` carries `plan` (`starter`, `growth` or `enterprise`) and `usage`: this month's card payments in the key's mode against the plan's monthly limit (`capCents`, `settledCents`, `reservedCents`, `percent`, `resetsAt`, `refusedCount`, `refusedCents`).
- Webhook event types `account.limit.approaching`, `account.limit.reached` and `account.limit.reset`, with `AccountUsageEventData`.
- A payment that would take the month past the limit is refused with reason `monthly_limit_reached` (409).
- Subscriptions: the `Subscription` and `Invoice` types, and the webhook events `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.created`, `invoice.finalized`, `invoice.paid`, `invoice.payment_failed`, `invoice.upcoming` and `invoice.voided`. `Payment` carries `invoiceId`.
- `Invoice` carries `hostedInvoiceUrl`, the invoice's page for your customer, and the webhook event type `invoice.marked_uncollectible`.
- Trials, pausing and cancelling at a date: `Subscription` carries `trialStart`, `trialEnd`, `trialEndBehavior`, `pauseCollection`, `cancelAt` and `cancellationDetails`; the webhook events `customer.subscription.trial_will_end`, `customer.subscription.paused` and `customer.subscription.resumed`.
- Coupons, tax rates, invoice items and credit: the `Customer`, `Coupon`, `TaxRate`, `InvoiceItem` and `CustomerBalanceTransaction` types; `Invoice` carries `discountCents`, `couponId`, `taxCents`, `taxes`, `creditAppliedCents` and `amountDueCents`, and its lines `proration`; `Subscription` carries `discount` and `taxRateIds`.
- Changing a subscription's prices and quantities: `Subscription` carries `items` (each price and quantity it bills) and `pendingUpdate` (a change waiting for its invoice to be paid). The API takes `items`, `prorationBehavior`, `prorationDate` and `paymentBehavior` on an update, and previews a change at `POST /v1/invoices/preview`.
- The customer portal: the `BillingPortalSession` type (`POST /v1/billing_portal/sessions`), and the webhook event `card.expiring` with the `SavedCard` a running subscription is charged to, sent when its expiry month begins.
- Subscription links: the `SubscriptionLink` type (`/v1/subscription_links`), `Coupon.code` (a code customers type on a link), and `Subscription.subscriptionLinkId`.
- Usage based billing: the `Meter`, `MeterEvent` and `UsageAlert` types (`/v1/meters`, `/v1/meter_events`, `/v1/usage_alerts`), and the webhook event `billing.alert.triggered` with `UsageAlertTrigger`. Prices can be tiered (graduated or volume), per package, and metered.
- Subscription schedules and installments: the `SubscriptionSchedule` type (`/v1/subscription_schedules`) and the webhook events `subscription_schedule.created`, `.completed`, `.released` and `.canceled`.
- Invoicing: subscriptions and invoices carry `collectionMethod` (`send_invoice` emails each invoice to pay by its `dueDate`), invoices `creditNotesCents` and `memo`; standalone invoices (`POST /v1/invoices`, `/send`); the `CreditNote` type (`/v1/credit_notes`); and the webhook events `invoice.sent`, `invoice.overdue` and `credit_note.created`.
- Entitlements: the `Feature` and `ActiveEntitlementSummary` types (`/v1/entitlements/features`, `/v1/entitlements/active_entitlements`, `/v1/products/{id}/features`) and the webhook event `entitlements.active_entitlement_summary.updated`.
- Billing on the 1st: `CreateSubscriptionParams.billingCycleAnchor` (`now`, `first_of_month` or a time at most one period ahead; the part period before it is invoiced at once, prorated) and `Subscription.billingCycleAnchor`. A refused anchor answers with reason `billing_cycle_anchor_invalid` (400).
- Methods for every billing endpoint: `customers`, `prices`, `products` (features), `subscriptions`, `invoices`, `creditNotes`, `coupons`, `taxRates`, `invoiceItems`, `subscriptionSchedules`, `subscriptionLinks`, `billingPortal.sessions`, `meters`, `meterEvents`, `usageAlerts`, `entitlements.features`, `entitlements.activeEntitlements` and `testClocks`, each with `listAll` and `all` where the endpoint is a list. Every request takes a typed params object (`CreateSubscriptionParams`, `UpdateSubscriptionParams` and so on), checked in the tests against the API's own schemas, and answers a typed object (`Price`, `ProductFeature`, `ActiveEntitlement`, `MeterEventSummary`, `TestClock`, `DeletedInvoiceItem` and `DeletedProductFeature` are new).
- Card save failures: `Payment` carries `cardSave` (`not_requested`, `requested`, `saved` or `failed`, typed `CardSaveStatus`), the webhook event `card.save_failed` with the `Payment` whose card was not kept, and `Subscription.cardMissingSince`, set while a subscription's renewals wait for the customer to add a card.

Fixed

- A price's tiers always carry `flatAmountCents` (0 when none was set), and a customer balance transaction's `type` is one of `applied_to_invoice`, `credit_from_invoice`, `adjustment` or `credit_note`. The API reference said both less precisely.

## 0.3.0 (21 September 2026)

Saved cards, in full.

Added

- `cards.retrieve(cardId)`: `GET /v1/cards/:id`, one card. It answers for a deleted card too, so you can still say why a charge stopped.
- `cards.list(params)` takes `limit`, `cursor` and `customerEmail`, and pages like the other lists. `cards.listAll(params)` and `cards.all(params)` read page after page as you iterate.
- `SavedCard` carries `expiry` (`{ month, year }`, the month the card expires, or null), `paymentId` (the payment the customer made when they kept the card), `consent` (`agreedAt`, `locale` and `wording`: what the customer agreed to, so you have a record of why you may charge them) and `retiredAt`.
- `Payment` carries `savedCardId`, the card a payment was charged to when it was charged without the customer present.
- `ListSavedCardsParams` types the filter.

Changed

- `cards.list()` was not paginated and returned your 200 newest cards. It now returns one page of 25 by default, with `hasMore` and `nextCursor` like every other list. Code that read every card from one call should use `cards.listAll()`.
- Deleting a card that is already deleted answers the same card instead of a 404, so a retry is safe.

## 0.2.0 (18 September 2026)

Added

- `WebhookTestPing` types the dashboard's Send test event (`test.ping`), and `constructEvent` can return it. It never appears in `events.list`.
- `events.list`, `events.listAll`, `events.all` and `events.retrieve`: `GET /v1/events` and `GET /v1/events/:id`, the events your webhooks receive, in the same shape. `list` takes `type` (one event type) and `since` (an ISO 8601 time) as well as `limit` and `cursor`.
- `account.retrieve`: `GET /v1/account`, the merchant behind the key, typed as `Account`.
- `WebhookEvent` is now a union keyed by `type`, and `constructEvent` returns it, so checking `event.type` narrows `event.data` to the `Payment`, `SavedCard`, expired checkout or refund (with its payment) it carries. `WebhookEventOf<"refund.succeeded">` names one of them. `constructEvent<T>` and `WebhookEvent<T>` still type `data` as `T`.
- `checkouts.create` takes `lineItems` (1 to 10 lines of `name`, optional `description`, `unitAmountCents` and `quantity`) instead of `amountCents`, with `description` then optional, and `locale` (`en`, `si` or `ta`) for the hosted checkout's language. Order lines in `payment.order` may carry a `description`.
- `all` on payments, refunds and events, the same as `listAll`, under the name the PHP library uses.
- `ApiError` reads `reason` (a finer stable reason, snake_case) and `docUrl` (the error's documentation) from the error body, both `null` when absent, and keeps the API's sentence in `apiMessage`. `message` ends with the documentation link when there is one.

Changed

- `CreateCheckoutParams` is a union of `CreateCheckoutForAmountParams` and `CreateCheckoutForLineItemsParams`, so passing both `amountCents` and `lineItems` does not type check. Code that extended the old interface should extend one of the two.
- The refund documentation no longer says a test mode refund succeeds at once. Sandbox refunds are queued for Payable's sandbox like live ones are for Payable; only a local development API's simulator refunds at once.

Security

- The secret key is held in a true private field, so `console.log(client)`, `util.inspect`, `JSON.stringify` and an error reporter that walks the client no longer print it. No error the library throws carries it.
- `ApiError.docUrl` is kept, and linked from `message`, only when it is an https address on payments.lk or a subdomain of it. An address anywhere else in an error body is dropped.
- The README says what the 24 hour idempotency window means for a job that retries later than that: check the object first.

Unchanged, and now tested: a 409 is never retried.

## 0.1.0 (15 September 2026)

The first release: checkouts, payments, refunds, payment links, saved cards and webhook verification, with retries and idempotency keys.
