/**
 * The API's objects, as the API returns them. Amounts are whole cents of LKR:
 * Rs. 1,450.00 is 145000. Times are ISO 8601 strings in UTC.
 */

export type Mode = "test" | "live";

export type PaymentStatus =
  | "requires_payment_method"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "partially_refunded"
  | "refunded"
  | "disputed";

export type CheckoutStatus = "open" | "processing" | "completed" | "expired" | "canceled";

export type RefundStatus = "pending" | "processing" | "succeeded" | "failed";

/**
 * Whether a payment kept its card on file: not_requested (not offered, or the customer did not agree), requested (not
 * succeeded yet), saved (card.saved names the card) or failed (it succeeded but the card was not kept; card.save_failed
 * was sent).
 */
export type CardSaveStatus = "not_requested" | "requested" | "saved" | "failed";

export interface Payment {
  object: "payment";
  id: string;
  mode: Mode;
  status: PaymentStatus;
  amountCents: number;
  currency: "LKR";
  description: string;
  reference: string | null;
  customer: { name: string | null; email: string | null; phone: string | null } | null;
  card: { scheme: string | null; last4: string | null } | null;
  /** Whether the card was kept on file. failed means the payment succeeded but the customer must add the card again. */
  cardSave: CardSaveStatus;
  feeCents: number | null;
  netCents: number | null;
  refundedCents: number;
  failureMessage: string | null;
  paymentLinkId: string | null;
  /** The saved card this payment was charged to, when it was charged without the customer present. Null otherwise. */
  savedCardId: string | null;
  /** The invoice this payment pays: a subscription's first payment, a renewal or a pay link payment. Null otherwise. */
  invoiceId: string | null;
  checkoutId: string | null;
  /** The checkout page the payment was made on, when it was. */
  checkoutPageId: string | null;
  /** What the customer ordered, on a checkout page or through a checkout's lineItems, priced by the server, in cents. */
  order: {
    lines: { id: string; name: string; description?: string; quantity: number; unitAmountCents: number; amountCents: number; suggested: boolean }[];
    subtotalCents: number;
    discount: { code: string; cents: number } | null;
    shipping: { id: string; label: string; cents: number } | null;
    tax: { mode: "included" | "added"; rateBps: number; cents: number } | null;
    totalCents: number;
  } | null;
  delivery: { sameAsBilling: boolean; name: string | null; street: string | null; city: string | null; postcode: string | null } | null;
  customFields: { key: string; label: string; value: string }[] | null;
  customerTaxId: string | null;
  termsAcceptedAt: string | null;
  createdAt: string;
  succeededAt: string | null;
}

export interface Checkout {
  object: "checkout";
  id: string;
  mode: Mode;
  status: CheckoutStatus;
  /** Send the customer here: a redirect on the web, or the mobile SDKs' browser sheet in an app. */
  url: string;
  expiresAt: string;
  payment: Payment;
}

export interface Refund {
  object: "refund";
  id: string;
  mode: Mode;
  paymentId: string;
  status: RefundStatus;
  amountCents: number;
  currency: "LKR";
  reason: string | null;
  failureMessage: string | null;
  createdAt: string;
  succeededAt: string | null;
}

export interface PaymentLink {
  object: "payment_link";
  id: string;
  mode: Mode;
  title: string;
  description: string | null;
  amountCents: number;
  url: string;
  active: boolean;
  paidCount: number;
  createdAt: string;
}

export interface SavedCard {
  object: "saved_card";
  id: string;
  mode: Mode;
  customerEmail: string | null;
  scheme: string | null;
  last4: string | null;
  /** The month the card expires, as the processor reported it, or null. */
  expiry: { month: number; year: number } | null;
  /** The payment the customer made when they kept the card, or null for a card saved before this was recorded. */
  paymentId: string | null;
  /** What the customer agreed to when they kept the card. Keep it: it is your record of why you may charge them. */
  consent: { agreedAt: string; locale: "en" | "si" | "ta"; wording: string } | null;
  active: boolean;
  createdAt: string;
  /** When the card was deleted, or null while it is still usable. */
  retiredAt: string | null;
}

export interface List<T> {
  object: "list";
  data: T[];
  hasMore: boolean;
  /** Pass as cursor to read the next page. Null on the last page. */
  nextCursor: string | null;
}

export type WebhookEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "checkout.expired"
  | "card.saved"
  | "card.save_failed"
  | "card.expiring"
  | "billing.alert.triggered"
  | "subscription_schedule.created"
  | "subscription_schedule.completed"
  | "subscription_schedule.released"
  | "subscription_schedule.canceled"
  | "refund.succeeded"
  | "refund.failed"
  | "account.limit.approaching"
  | "account.limit.reached"
  | "account.limit.reset"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "customer.subscription.trial_will_end"
  | "customer.subscription.paused"
  | "customer.subscription.resumed"
  | "invoice.created"
  | "invoice.finalized"
  | "invoice.sent"
  | "invoice.overdue"
  | "credit_note.created"
  | "entitlements.active_entitlement_summary.updated"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "invoice.upcoming"
  | "invoice.voided"
  | "invoice.marked_uncollectible";

export type BillingInterval = "day" | "week" | "month" | "year";
export type SubscriptionStatus = "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "unpaid" | "paused" | "canceled";
export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible";

/** Someone you bill on a subscription. */
export interface Customer {
  object: "customer";
  id: string;
  mode: Mode;
  email: string;
  name: string | null;
  phone: string | null;
  locale: "en" | "si" | "ta";
  defaultCardId: string | null;
  /** Credit the customer holds with you, taken off their next invoices. */
  creditBalanceCents: number;
  createdAt: string;
}

/** A discount for subscriptions: percent or amount off, for one invoice, some months or for ever. */
export interface Coupon {
  object: "coupon";
  id: string;
  mode: Mode;
  name: string;
  percentOffBps: number | null;
  amountOffCents: number | null;
  duration: "once" | "repeating" | "forever";
  durationInMonths: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  redeemBy: string | null;
  active: boolean;
  /** The code customers type on a subscription link, or in the customer portal where you allow it, to take it; or null. */
  code: string | null;
  createdAt: string;
}

/** A tax you charge on invoices, such as VAT 18%. */
export interface TaxRate {
  object: "tax_rate";
  id: string;
  mode: Mode;
  displayName: string;
  description: string | null;
  percentageBps: number;
  inclusive: boolean;
  active: boolean;
  createdAt: string;
}

/** A one-off line for a customer's next invoice. */
export interface InvoiceItem {
  object: "invoice_item";
  id: string;
  mode: Mode;
  customerId: string;
  subscriptionId: string | null;
  invoiceId: string | null;
  description: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
  proration: boolean;
  discountable: boolean;
  createdAt: string;
}

/** A change to a customer's credit balance. */
export interface CustomerBalanceTransaction {
  object: "customer_balance_transaction";
  id: string;
  customerId: string;
  amountCents: number;
  endingBalanceCents: number;
  type: "applied_to_invoice" | "credit_from_invoice" | "adjustment" | "credit_note";
  invoiceId: string | null;
  description: string | null;
  createdAt: string;
}

/** Why a customer left, in Stripe's words. */
export type CancellationFeedback = "customer_service" | "low_quality" | "missing_features" | "other" | "switched_service" | "too_complex" | "too_expensive" | "unused";

/** A customer paying a price every period. */
export interface Subscription {
  object: "subscription";
  id: string;
  mode: Mode;
  status: SubscriptionStatus;
  customerId: string;
  /** The first item's price, kept for subscriptions of one price: read items for all of them. */
  price: { id: string; productName: string; unitAmountCents: number; interval: BillingInterval; intervalCount: number };
  quantity: number;
  /** What it bills each period: a price and a quantity each, all on the same interval. */
  items: Array<{ id: string | null; price: { id: string; productName: string; unitAmountCents: number; interval: BillingInterval; intervalCount: number }; quantity: number }>;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  /** The instant its renewals are anchored on: they fall on this day of the month, in Sri Lanka. */
  billingCycleAnchor: string;
  cancelAtPeriodEnd: boolean;
  /** When it ends by itself; the last period is billed only up to it. */
  cancelAt: string | null;
  canceledAt: string | null;
  endedAt: string | null;
  cancelReason: string | null;
  cancellationDetails: { reason: string | null; feedback: CancellationFeedback | null; comment: string | null };
  /** A free trial: nothing is charged until trialEnd. */
  trialStart: string | null;
  trialEnd: string | null;
  trialEndBehavior: "create_invoice" | "pause" | "cancel";
  /** Collection paused: invoices kept as drafts, written off or voided until resumesAt. */
  pauseCollection: { behavior: "keep_as_draft" | "mark_uncollectible" | "void"; resumesAt: string | null } | null;
  /** A coupon discounting its invoices, from start until end. */
  discount: { couponId: string; start: string; end: string | null } | null;
  taxRateIds: string[];
  /** The subscription link the customer subscribed through, or null. */
  subscriptionLinkId: string | null;
  collectionMethod: "charge_automatically" | "send_invoice";
  daysUntilDue: number | null;
  /** A change waiting for its invoice to be paid (paymentBehavior pending_if_incomplete), or null. */
  pendingUpdate: { items: Array<{ priceId: string; quantity: number }>; invoiceId: string; expiresAt: string } | null;
  /** The saved card renewals are charged to. */
  cardId: string | null;
  /**
   * When a payment that was to keep a card for it succeeded without keeping one. While set, renewals are emailed to
   * the customer to pay, with a link to add a card, and never charged to another card on file.
   */
  cardMissingSince: string | null;
  latestInvoiceId: string | null;
  /** Where the customer makes the first payment while the subscription is incomplete. */
  checkoutUrl: string | null;
  reference: string | null;
  createdAt: string;
}

/** A public link to subscribe: a plan chooser, a trial if set, and promotion codes if taken. */
export interface SubscriptionLink {
  object: "subscription_link";
  id: string;
  mode: Mode;
  url: string;
  name: string;
  prices: Array<{ id: string; productName: string; nickname: string | null; unitAmountCents: number; interval: BillingInterval; intervalCount: number; active: boolean }>;
  trialDays: number | null;
  allowPromotionCodes: boolean;
  successUrl: string | null;
  active: boolean;
  createdAt: string;
}

/** What you count for usage based billing, by the eventName your meter events carry. */
export interface Meter {
  object: "meter";
  id: string;
  mode: Mode;
  name: string;
  eventName: string;
  aggregation: "sum" | "count" | "last";
  active: boolean;
  createdAt: string;
}

/** One use of a customer's, counted by a meter. */
export interface MeterEvent {
  object: "meter_event";
  id: string;
  mode: Mode;
  meterId: string;
  eventName: string;
  customerId: string;
  value: number;
  timestamp: string;
  identifier: string | null;
  createdAt: string;
}

/** An alert that fires once a customer's usage in their current period reaches a threshold. */
export interface UsageAlert {
  object: "usage_alert";
  id: string;
  mode: Mode;
  meterId: string;
  customerId: string | null;
  title: string;
  threshold: number;
  active: boolean;
  createdAt: string;
}

/** A subscription schedule: phases a subscription moves through, each its prices for a number of periods. */
export interface SubscriptionSchedule {
  object: "subscription_schedule";
  id: string;
  mode: Mode;
  customerId: string;
  subscriptionId: string | null;
  status: "not_started" | "active" | "completed" | "released" | "canceled";
  endBehavior: "release" | "cancel";
  startDate: string;
  phases: Array<{ items: Array<{ priceId: string; quantity: number }>; iterations: number | null; trialDays: number | null; couponId: string | null }>;
  currentPhase: number;
  currentPhaseEndsAt: string | null;
  reference: string | null;
  completedAt: string | null;
  releasedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
}

/** A credit note: an amount taken off an invoice, off what was due, refunded, or added to the customer's credit. */
export interface CreditNote {
  object: "credit_note";
  id: string;
  mode: Mode;
  invoiceId: string;
  customerId: string;
  number: string;
  amountCents: number;
  reason: "duplicate" | "fraudulent" | "order_change" | "product_unsatisfactory" | null;
  memo: string | null;
  amountDueReducedCents: number;
  refundedCents: number;
  creditedToBalanceCents: number;
  refundId: string | null;
  createdAt: string;
}

/** A feature customers get with a product, by the lookup key your app checks. */
export interface Feature {
  object: "entitlements.feature";
  id: string;
  mode: Mode;
  name: string;
  lookupKey: string;
  active: boolean;
  createdAt: string;
}

/** What entitlements.active_entitlement_summary.updated carries: every feature the customer has now. */
export interface ActiveEntitlementSummary {
  object: "entitlements.active_entitlement_summary";
  customerId: string;
  entitlements: Array<{ featureId: string; lookupKey: string }>;
}

/** What billing.alert.triggered carries: the usage alert, the customer, and the usage that reached its threshold. */
export interface UsageAlertTrigger {
  object: "usage_alert_trigger";
  alertId: string;
  title: string;
  meterId: string;
  customerId: string;
  threshold: number;
  value: number;
  triggeredAt: string;
}

/** A customer's way into the customer portal: send them to url, which works until expiresAt. */
export interface BillingPortalSession {
  object: "billing_portal.session";
  id: string;
  mode: Mode;
  customerId: string;
  url: string;
  returnUrl: string | null;
  expiresAt: string;
  createdAt: string;
}

/** A bill: its lines, its total and its collection. */
export interface Invoice {
  object: "invoice";
  id: string;
  mode: Mode;
  number: string | null;
  status: InvoiceStatus;
  customerId: string;
  subscriptionId: string | null;
  billingReason: string;
  periodStart: string | null;
  periodEnd: string | null;
  lines: Array<{ description: string; quantity: number; unitAmountCents: number; amountCents: number; periodStart: string | null; periodEnd: string | null; proration: boolean }>;
  subtotalCents: number;
  /** A coupon's discount, before tax. */
  discountCents: number;
  couponId: string | null;
  /** Exclusive taxes, added to the total. */
  taxCents: number;
  taxes: Array<{ taxRateId: string; displayName: string; percentageBps: number; inclusive: boolean; amountCents: number }>;
  totalCents: number;
  /** The customer's credit balance used against it. */
  creditAppliedCents: number;
  /** What is charged or paid: the total less credit, never below zero. */
  amountDueCents: number;
  amountPaidCents: number;
  /** Credit notes issued against it. */
  creditNotesCents: number;
  /** charge_automatically (the card on file) or send_invoice (paid at hostedInvoiceUrl by dueDate). */
  collectionMethod: "charge_automatically" | "send_invoice";
  dueDate: string | null;
  memo: string | null;
  currency: "LKR";
  attemptCount: number;
  nextAttemptAt: string | null;
  lastFailure: string | null;
  paidAt: string | null;
  /** The invoice's page for your customer: see it, pay what is open, print it. Null while it is a draft. */
  hostedInvoiceUrl: string | null;
  createdAt: string;
}

/** What account.limit.* carry: the live month's card payments against the plan's monthly limit. */
export interface AccountUsageEventData {
  object: "account_usage";
  month: string;
  plan: Plan;
  capCents: number | null;
  settledCents: number;
  percent: number;
  /** 60, 70, 80 or 90 for approaching; 100 for reached and reset. */
  threshold: number;
  refusedCount: number;
  refusedCents: number;
  resetsAt: string;
  projectedAt: string | null;
}

/** What checkout.expired carries: the checkout that closed and the payment nobody made. */
export interface ExpiredCheckout {
  object: "checkout";
  id: string;
  paymentId: string;
}

/** What refund.succeeded and refund.failed carry: the refund, and the payment as it stands after it. */
export type RefundWithPayment = Refund & { payment: Payment };

/** The data each event type carries. */
export interface WebhookEventData {
  "payment.succeeded": Payment;
  "payment.failed": Payment;
  "checkout.expired": ExpiredCheckout;
  "card.saved": SavedCard;
  "card.save_failed": Payment;
  "card.expiring": SavedCard;
  "billing.alert.triggered": UsageAlertTrigger;
  "subscription_schedule.created": SubscriptionSchedule;
  "subscription_schedule.completed": SubscriptionSchedule;
  "subscription_schedule.released": SubscriptionSchedule;
  "subscription_schedule.canceled": SubscriptionSchedule;
  "refund.succeeded": RefundWithPayment;
  "refund.failed": RefundWithPayment;
  "account.limit.approaching": AccountUsageEventData;
  "account.limit.reached": AccountUsageEventData;
  "account.limit.reset": AccountUsageEventData;
  "customer.subscription.created": Subscription;
  "customer.subscription.updated": Subscription;
  "customer.subscription.deleted": Subscription;
  "customer.subscription.trial_will_end": Subscription;
  "customer.subscription.paused": Subscription;
  "customer.subscription.resumed": Subscription;
  "invoice.created": Invoice;
  "invoice.finalized": Invoice;
  "invoice.sent": Invoice;
  "invoice.overdue": Invoice;
  "credit_note.created": CreditNote;
  "entitlements.active_entitlement_summary.updated": ActiveEntitlementSummary;
  "invoice.paid": Invoice;
  "invoice.payment_failed": Invoice;
  "invoice.upcoming": Invoice;
  "invoice.voided": Invoice;
  "invoice.marked_uncollectible": Invoice;
}

/** One event of one type, as a webhook delivers it and as events.list and events.retrieve return it. */
export interface WebhookEventOf<K extends WebhookEventType> {
  id: string;
  object: "event";
  type: K;
  mode: Mode;
  /** When the event happened. */
  created: string;
  data: WebhookEventData[K];
}

/**
 * An event. Without a type argument it is the union of every event type, so
 * checking `event.type` narrows `event.data`:
 *
 *   if (event.type === "refund.succeeded") event.data.payment.refundedCents;
 *
 * WebhookEvent<T> is the older untyped form, with data typed as T.
 */
export type WebhookEvent<T = never> = [T] extends [never]
  ? { [K in WebhookEventType]: WebhookEventOf<K> }[WebhookEventType]
  : { id: string; object: "event"; type: WebhookEventType; mode: Mode; created: string; data: T };

/**
 * The dashboard's Send test event: one endpoint only, whatever it subscribes
 * to, so you can check your endpoint and signature code. It never appears in
 * events.list; answer it with any 2xx.
 */
export interface WebhookTestPing {
  id: string;
  object: "event";
  type: "test.ping";
  mode: Mode;
  created: string;
  data: { object: "ping"; endpointId: string };
}

export type MerchantStatus = "prospect" | "applying" | "submitted" | "in_review" | "needs_info" | "approved" | "queued" | "activated" | "rejected" | "suspended" | "closed";

export type ApplicationStatus = "draft" | "submitted" | "in_review" | "needs_info" | "approved" | "rejected";

export type Locale = "en" | "si" | "ta";

/** Starter and Growth each take card payments up to a monthly limit; Enterprise has none. */
export type Plan = "starter" | "growth" | "enterprise";

/** This month's usage against the plan's monthly limit. */
export interface AccountUsage {
  /** The Sri Lankan calendar month, "2026-09". */
  month: string;
  mode: "live" | "test";
  plan: Plan;
  /** The monthly limit in cents; null for no limit. */
  capCents: number | null;
  /** Payments that succeeded this month, gross: refunds do not free up room. */
  settledCents: number;
  /** Payments with the processor now, counted until they settle or fail. */
  reservedCents: number;
  /** Whole percent of the limit used, rounded down. */
  percent: number;
  /** When the limit resets, ISO 8601 in UTC. */
  resetsAt: string;
  refusedCount: number;
  refusedCents: number;
}

/** The merchant behind the key. */
export interface Account {
  id: string;
  tradingName: string | null;
  status: MerchantStatus;
  applicationStatus: ApplicationStatus | null;
  clearance: { tier: "starter" | "verified" | "enterprise"; monthlyCapCents: number | null };
  pricingPlan: string;
  /** The plan, which sets the monthly limit on card payments. */
  plan: Plan;
  /** This month's card payments in the key's mode against the plan's monthly limit. */
  usage: AccountUsage;
  locale: Locale;
  /** True once live keys can take live payments. */
  liveEnabled: boolean;
  phase1Position: number | null;
}

export interface CustomerDetails {
  name: string;
  email: string;
  /** A Sri Lankan number, such as 0771234567 or +94771234567. */
  phone?: string;
}

/** One line of what the customer is buying. The API works out the total from the lines. */
export interface CheckoutLineItem {
  /** 1 to 80 characters. */
  name: string;
  /** Up to 200 characters. */
  description?: string;
  /** Rs. 1 (100) to Rs. 1,000,000 (100000000), per unit. */
  unitAmountCents: number;
  /** 1 to 99. */
  quantity: number;
}

interface CheckoutParamsBase {
  /** Your own order number, shown to the customer and on the payment. */
  reference?: string;
  customer?: CustomerDetails;
  /**
   * Where the customer goes after paying: an https URL, or your app's own
   * scheme (myshop://paid) for a checkout opened by a mobile SDK. The page
   * adds checkout=<id> and status=<outcome>. The redirect proves nothing;
   * confirm with checkouts.retrieve or the payment.succeeded webhook.
   */
  successUrl?: string;
  /** Where the customer goes if the payment fails, is canceled or expires. */
  cancelUrl?: string;
  /** Offer the customer to keep the card on file. Needs saved cards switched on for your account. */
  saveCard?: boolean;
  /** The language the hosted checkout opens in. The checkout's url carries /si or /ta for Sinhala or Tamil. */
  locale?: Locale;
}

/** A checkout for one amount. */
export interface CreateCheckoutForAmountParams extends CheckoutParamsBase {
  /** Rs. 10 (1000) to Rs. 1,000,000 (100000000). */
  amountCents: number;
  description: string;
  lineItems?: never;
}

/** A checkout for 1 to 10 lines. Leave amountCents out: the total is the lines'. */
export interface CreateCheckoutForLineItemsParams extends CheckoutParamsBase {
  lineItems: CheckoutLineItem[];
  amountCents?: never;
  /** Optional with lineItems; the API writes a summary such as "Sample Store, 3 items". */
  description?: string;
}

/** Either an amount and a description, or line items. Passing both amountCents and lineItems does not type check. */
export type CreateCheckoutParams = CreateCheckoutForAmountParams | CreateCheckoutForLineItemsParams;

export interface ListParams {
  /** 1 to 100. The API's default is 25. */
  limit?: number;
  cursor?: string;
}

export interface ListPaymentsParams extends ListParams {
  status?: PaymentStatus;
}

export interface CreateRefundParams {
  paymentId: string;
  /** Leave out to refund everything still refundable. At least Rs. 1 (100). */
  amountCents?: number;
  reason?: string;
}

export interface ListRefundsParams extends ListParams {
  paymentId?: string;
}

export interface ListSavedCardsParams extends ListParams {
  /** Only the cards kept by this customer, matched on the address they gave at checkout. */
  customerEmail?: string;
}

export interface ListEventsParams extends ListParams {
  /** One event type. */
  type?: WebhookEventType;
  /** Only events created at or after this ISO 8601 time, such as 2026-09-18T00:00:00Z. */
  since?: string;
}

export interface CreatePaymentLinkParams {
  title: string;
  description?: string;
  amountCents: number;
}

export interface ChargeSavedCardParams {
  amountCents: number;
  description: string;
  reference?: string;
}

// Billing: the objects the billing endpoints answer that the webhook events do not carry, then what each endpoint takes.

/** A recurring price: an amount every period, on a product. */
export interface Price {
  /** Always "price". */
  object: "price";
  /** The price's id, price_ followed by 24 characters. */
  id: string;
  /** test for a sandbox key, live for a live key. The key decides it; a key never reads the other mode's rows. */
  mode: Mode;
  /** What the price is for. */
  product: {
    /** The product's id, prod_ followed by 24 characters. */
    id: string;
    /** The product's name, as invoices and customers' emails show it. */
    name: string;
    /** A line about the product, or null. */
    description: string | null;
  };
  /** The amount each period per unit (or per package), in LKR cents; 0 for a tiered price, which its tiers price. */
  unitAmountCents: number;
  /** Always "LKR". */
  currency: "LKR";
  /** How often it bills: day, week, month or year. */
  interval: BillingInterval;
  /** How many intervals a period is: 3 with month is every three months. */
  intervalCount: number;
  /** Your own name for the price, shown on invoices instead of the product's, or null. */
  nickname: string | null;
  /** False once archived: an archived price takes no new subscriptions, and those it has keep renewing. */
  active: boolean;
  /** per_unit (the unit amount times the quantity), package (the unit amount per packageSize units, a part package rounded up) or tiered. */
  billingScheme: "per_unit" | "package" | "tiered";
  /** For a tiered price: graduated (each tier prices the units in it) or volume (the tier the whole quantity falls in prices every unit). Null otherwise. */
  tiersMode: "graduated" | "volume" | null;
  /** For a tiered price, its tiers in order; null otherwise. */
  tiers: {
    /** The last unit this tier prices, or null for every unit beyond the tier before. */
    upTo: number | null;
    /** Per unit in this tier, in cents. */
    unitAmountCents: number;
    /** Added once when any unit falls in this tier (graduated) or the quantity does (volume), in cents; 0 for none. */
    flatAmountCents: number;
  }[] | null;
  /** For a package price: how many units a package is. Null otherwise. */
  packageSize: number | null;
  /** licensed (a quantity, billed at the start of each period) or metered (the usage a meter counted, billed at the end of each period). */
  usageType: "licensed" | "metered";
  /** For a metered price: the meter whose usage it bills. Null otherwise. */
  meterId: string | null;
  /** When it was created, ISO 8601 in UTC. */
  createdAt: string;
}

/** A feature given with a product. */
export interface ProductFeature {
  /** Always "product_feature". */
  object: "product_feature";
  /** The link's id, pfeat_ followed by 24 characters. */
  id: string;
  /** The product. */
  productId: string;
  /** The feature it gives. */
  featureId: string;
  /** The feature's lookup key. */
  lookupKey: string;
  /** When it was created, ISO 8601 in UTC. */
  createdAt: string;
}

/** A feature a customer has now. */
export interface ActiveEntitlement {
  /** Always "entitlements.active_entitlement". */
  object: "entitlements.active_entitlement";
  /** The feature. */
  featureId: string;
  /** Its lookup key: check this in your app. */
  lookupKey: string;
}

/** A customer's usage on a meter between two times. */
export interface MeterEventSummary {
  /** Always "meter_event_summary". */
  object: "meter_event_summary";
  /** The meter. */
  meterId: string;
  /** The customer. */
  customerId: string;
  /** From this time, ISO 8601 in UTC. */
  start: string;
  /** Up to (not including) this time. */
  end: string;
  /** The usage in between, as the meter adds it up. */
  aggregatedValue: number;
}

/** An invoice item that was deleted before an invoice took it. */
export interface DeletedInvoiceItem {
  /** Always "invoice_item". */
  object: "invoice_item";
  /** The item's id, ii_ followed by 24 characters. */
  id: string;
  /** test for a sandbox key, live for a live key. The key decides it; a key never reads the other mode's rows. */
  mode: Mode;
  /** The customer it bills. */
  customerId: string;
  /** Only this subscription's next invoice takes it, or null for the customer's next invoice. */
  subscriptionId: string | null;
  /** The invoice that took it, or null while it waits. */
  invoiceId: string | null;
  /** The line as the customer reads it. */
  description: string;
  /** How many units. */
  quantity: number;
  /** Per unit, in cents; negative for a credit. */
  unitAmountCents: number;
  /** quantity times unitAmountCents. */
  amountCents: number;
  /** True for a credit or charge a change made for part of a period. */
  proration: boolean;
  /** Whether a coupon discounts it. */
  discountable: boolean;
  /** When it was created, ISO 8601 in UTC. */
  createdAt: string;
  /** Always true. */
  deleted: true;
}

export interface DeletedProductFeature {
  /** Always "product_feature". */
  object: "product_feature";
  /** The product. */
  productId: string;
  /** The feature taken off it. */
  featureId: string;
  /** Always true. */
  deleted: true;
}

export interface TestClock {
  /** Always "test_clock". */
  object: "test_clock";
  /** The subscription whose clock moved. */
  subscriptionId: string;
  /** The subscription's time now, ISO 8601 in UTC. */
  frozenTime: string;
  /** How far ahead of the wall clock its time runs, in seconds. */
  offsetSeconds: number;
}

/** Create a customer. */
export interface CreateCustomerParams {
  /** Their email address. A customer with this email in this mode is answered, not made again. */
  email: string;
  /** Their name, 1 to 120 characters. */
  name?: string;
  /** A Sri Lankan mobile number, such as 0771234567. */
  phone?: string;
  /** The language of their emails and payment pages: en (the default), si or ta. */
  locale?: "en" | "si" | "ta";
}

export interface ListCustomersParams extends ListParams {
  /** Only the customer with this email. */
  email?: string;
}

/** Create a price. */
export interface CreatePriceParams {
  /** A product of yours already made. Send this or product, not both. */
  productId?: string;
  /** A product made with this price. Send this or productId, not both. */
  product?: {
    /** The product's name, 1 to 120 characters. */
    name: string;
    /** A line about it, up to 500 characters. */
    description?: string;
  };
  /** The amount per unit (or per package), in LKR cents, up to Rs. 1,000,000 (100000000). A licensed price per unit is Rs. 10 (1000) at least; a metered or package price may be less. Leave it out for a tiered price. */
  unitAmountCents?: number;
  /** How often it bills: day, week, month or year. */
  interval: "day" | "week" | "month" | "year";
  /** How many intervals a period is, 1 to 12. Defaults to 1; a yearly price is every year. */
  intervalCount?: number;
  /** Your own name for it on invoices, up to 80 characters. */
  nickname?: string;
  /** per_unit (the default), package or tiered. */
  billingScheme?: "per_unit" | "package" | "tiered";
  /** With tiered: graduated or volume. */
  tiersMode?: "graduated" | "volume";
  /** With tiered: 2 to 10 tiers in order, each upTo above the one before, the last upTo null. */
  tiers?: {
    /** The last unit the tier prices, or null for the last tier. */
    upTo: number | null;
    /** Per unit in the tier, in cents, from 0. */
    unitAmountCents: number;
    /** Added once for the tier, in cents. Defaults to 0. */
    flatAmountCents?: number;
  }[];
  /** With package: how many units a package is, 2 to 1000000. */
  packageSize?: number;
  /** licensed (the default: a quantity, billed in advance) or metered (a meter's usage, billed in arrears). */
  usageType?: "licensed" | "metered";
  /** With metered: the active meter whose usage it bills. */
  meterId?: string;
}

export interface ListPricesParams extends ListParams {
  /** true for prices taking new subscriptions, false for archived ones. */
  active?: "true" | "false";
}

/** Create a subscription. */
export interface CreateSubscriptionParams {
  /** Your customer, by id. Send this or customer, not both. */
  customerId?: string;
  /** Your customer's details: found by email, or made. Send this or customerId, not both. */
  customer?: CreateCustomerParams;
  /** The active price to bill. Send this or items. */
  priceId?: string;
  /** How many units each period, 1 to 10000. Defaults to 1. */
  quantity?: number;
  /** Up to 10 active prices, each once and all on the same interval, such as a base plan and add-ons. Send this or priceId. */
  items?: {
    /** The price. */
    priceId: string;
    /** How many units of it each period, 1 to 10000. Defaults to 1. */
    quantity?: number;
  }[];
  /** A card this customer kept with you: the first invoice is charged to it. Without it, the customer's default card, and without that, checkoutUrl. */
  cardId?: string;
  /** Your own reference, up to 120 characters. */
  reference?: string;
  /** Where the customer lands after the first payment at checkoutUrl: https, or your app's scheme. */
  successUrl?: string;
  /** Where the customer lands if they leave checkoutUrl without paying. */
  cancelUrl?: string;
  /** A free trial of this many days, 1 to 730: the subscription starts trialing, with no payment, and its first invoice is for nothing. Send this or trialEnd. */
  trialDays?: number;
  /** A free trial until this time, ISO 8601, within two years. Send this or trialDays. */
  trialEnd?: string;
  /** With no card on file when the trial ends: create_invoice (the default: the customer is sent the invoice to pay), pause, or cancel. */
  trialEndBehavior?: "create_invoice" | "pause" | "cancel";
  /** Ends the subscription at this time, ISO 8601, within two years; the last period is billed only up to it. */
  cancelAt?: string;
  /** A coupon of yours discounting its invoices. */
  couponId?: string;
  /** Up to 5 tax rates of yours applied to its invoices. */
  taxRateIds?: string[];
  /** Up to 10 one-off lines on its first invoice, such as a joining fee. */
  addInvoiceItems?: {
    /** The line as the customer reads it. */
    description: string;
    /** Per unit, in cents; negative for a credit. */
    unitAmountCents: number;
    /** How many units, 1 to 10000. Defaults to 1. */
    quantity?: number;
    /** Whether a coupon discounts it. Defaults to true. */
    discountable?: boolean;
  }[];
  /** charge_automatically (the default) or send_invoice: it starts active, and each invoice is emailed to the customer to pay by its due date instead of being charged. */
  collectionMethod?: "charge_automatically" | "send_invoice";
  /** For send_invoice: days from an invoice being sent to its due date, 0 to 365. Defaults to 30. */
  daysUntilDue?: number;
  /**
   * Where its renewals fall: "now", "first_of_month" (midnight on the 1st in Sri Lanka; monthly and yearly prices), or
   * an ISO 8601 time at most one period ahead. The part period up to it is invoiced now, prorated. Not with a trial.
   * Leave it out for your billing settings' default.
   */
  billingCycleAnchor?: "now" | "first_of_month" | (string & {});
}

export interface ListSubscriptionsParams extends ListParams {
  /** Only this customer's subscriptions. */
  customerId?: string;
  /** Only subscriptions in this status. */
  status?: "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "unpaid" | "paused" | "canceled";
}

/** Update a subscription. */
export interface UpdateSubscriptionParams {
  /** Changes to its items, up to 10: an existing one by id (a new priceId, a new quantity, or deleted true), or a new one by priceId. */
  items?: {
    /** The item to change, from the subscription's items. */
    id?: string;
    /** Its new price, or the price of a new item. Active, and on the subscription's interval unless every item changes to a new one together. */
    priceId?: string;
    /** Its new quantity, 1 to 10000. */
    quantity?: number;
    /** True removes the item. A subscription keeps at least one. */
    deleted?: true;
  }[];
  /** For a subscription of one item: its new price. Send this and quantity, or items. */
  priceId?: string;
  /** For a subscription of one item: its new quantity, 1 to 10000. */
  quantity?: number;
  /** How the part of the period already begun is billed: create_prorations (the default: a credit for the unused time and a charge for the rest of the period wait for the next invoice), always_invoice (the same, invoiced and charged now) or none. A change of interval starts a new period at once, invoiced now. */
  prorationBehavior?: "create_prorations" | "always_invoice" | "none";
  /** Price the change as at this time, ISO 8601: inside the current period and not after now. Send the time a preview used so the charge matches it. */
  prorationDate?: string;
  /** allow_incomplete (the default: the change applies at once) or pending_if_incomplete (a change that costs more waits for its invoice to be paid; see pendingUpdate). */
  paymentBehavior?: "allow_incomplete" | "pending_if_incomplete";
  /** True ends it when the period that is paid for runs out; false takes that back. */
  cancelAtPeriodEnd?: boolean;
  /** Ends it at this time, ISO 8601, within two years; the last period is billed only up to it. Null takes the date back. */
  cancelAt?: string | null;
  /** Pauses collection: invoices are still made but not charged, until resumesAt or until you send null. */
  pauseCollection?: {
    /** keep_as_draft, mark_uncollectible or void: what happens to each invoice made while paused. */
    behavior: "keep_as_draft" | "mark_uncollectible" | "void";
    /** When collection resumes by itself, ISO 8601, within two years. */
    resumesAt?: string;
  } | null;
  /** Ends a trialing subscription's trial: "now", or a new time within two years. */
  trialEnd?: "now" | string;
  /** create_invoice, pause or cancel: what happens if the trial ends with no card on file. */
  trialEndBehavior?: "create_invoice" | "pause" | "cancel";
  /** A card this customer kept with you, charged for the renewals from now on. */
  cardId?: string;
  /** Why it is being cancelled, kept on the subscription. */
  cancellationDetails?: {
    /** customer_service, low_quality, missing_features, other, switched_service, too_complex, too_expensive or unused. */
    feedback?: "customer_service" | "low_quality" | "missing_features" | "other" | "switched_service" | "too_complex" | "too_expensive" | "unused";
    /** A comment on why, up to 500 characters. */
    comment?: string;
  };
  /** Your own reference, up to 120 characters, or null to clear it. */
  reference?: string | null;
  /** A coupon to discount its invoices from now, or null to take the discount off. */
  couponId?: string | null;
  /** The tax rates for its invoices from now; an empty list stops taxing them. */
  taxRateIds?: string[];
  /** How its invoices are collected from the next one: charge_automatically or send_invoice. */
  collectionMethod?: "charge_automatically" | "send_invoice";
  /** For send_invoice: days from an invoice being sent to its due date, 0 to 365. */
  daysUntilDue?: number;
}

/** Cancel a subscription. */
export interface CancelSubscriptionParams {
  /** False (the default) ends it now. True lets the period that is paid for run out first. */
  atPeriodEnd?: boolean;
  /** Why, in Stripe's words: customer_service, low_quality, missing_features, other, switched_service, too_complex, too_expensive or unused. */
  feedback?: "customer_service" | "low_quality" | "missing_features" | "other" | "switched_service" | "too_complex" | "too_expensive" | "unused";
  /** A comment on why, up to 500 characters. */
  comment?: string;
}

export interface ListInvoicesParams extends ListParams {
  /** Only this subscription's invoices. */
  subscriptionId?: string;
  /** Only this customer's invoices. */
  customerId?: string;
  /** Only invoices in this status. */
  status?: "draft" | "open" | "paid" | "void" | "uncollectible";
}

/** Create an invoice. */
export interface CreateInvoiceParams {
  /** The customer, one of yours in this key's mode. Their pending invoice items not for a subscription become its lines. */
  customerId: string;
  /** send_invoice (the default: emailed when finalised, to pay by its due date) or charge_automatically (the card on file is charged when finalised). */
  collectionMethod?: "charge_automatically" | "send_invoice";
  /** For send_invoice: days from sending to the due date, 0 to 365. Defaults to 30. */
  daysUntilDue?: number;
  /** A note printed on it, up to 500 characters. */
  memo?: string;
}

export interface UpcomingInvoiceParams {
  /** The subscription whose next invoice to preview. */
  subscriptionId: string;
}

/** Preview a change. */
export interface PreviewInvoiceParams {
  /** The subscription the change is for. */
  subscriptionId: string;
  /** The item changes to preview, as the update takes them. */
  items?: {
    /** The item to change, from the subscription's items. */
    id?: string;
    /** Its new price, or the price of a new item. */
    priceId?: string;
    /** Its new quantity, 1 to 10000. */
    quantity?: number;
    /** True removes the item. */
    deleted?: true;
  }[];
  /** For a subscription of one item: its new price. */
  priceId?: string;
  /** For a subscription of one item: its new quantity, 1 to 10000. */
  quantity?: number;
  /** create_prorations (the default), always_invoice or none, as the update will send it. */
  prorationBehavior?: "create_prorations" | "always_invoice" | "none";
  /** Price the change as at this time, ISO 8601; defaults to now. Send the same time with the update. */
  prorationDate?: string;
}

/** Create a credit note. */
export interface CreateCreditNoteParams {
  /** The invoice, open or paid. */
  invoiceId: string;
  /** How much, in cents: at most what is due on an open invoice, or what was paid and not yet credited on a paid one. */
  amountCents: number;
  /** duplicate, fraudulent, order_change or product_unsatisfactory. */
  reason?: "duplicate" | "fraudulent" | "order_change" | "product_unsatisfactory";
  /** A note, up to 500 characters. */
  memo?: string;
  /** On a paid invoice: true refunds the amount to the card it was paid with; false (the default) adds it to the customer's credit balance for their next invoices. */
  refund?: boolean;
}

export interface ListCreditNotesParams extends ListParams {
  /** Only this invoice's credit notes. */
  invoiceId?: string;
}

/** Create a coupon. */
export interface CreateCouponParams {
  /** Its name, 1 to 80 characters. */
  name: string;
  /** Basis points off, 1 to 10000 (2000 is 20%). Send this or amountOffCents. */
  percentOffBps?: number;
  /** Cents off each invoice it discounts, from 100. Send this or percentOffBps. */
  amountOffCents?: number;
  /** once, repeating or forever. */
  duration: "once" | "repeating" | "forever";
  /** For repeating: how many months, 1 to 36. */
  durationInMonths?: number;
  /** How many subscriptions may take it. */
  maxRedemptions?: number;
  /** The last time a subscription may take it, ISO 8601. */
  redeemBy?: string;
  /** A code customers type on a subscription link, or in the customer portal where you allow it, to take this coupon: 3 to 24 letters, digits, dashes or underscores, kept in upper case, unique in the mode. */
  code?: string;
}

export interface ListCouponsParams extends ListParams {
  /** true for coupons taking new subscriptions, false for archived ones. */
  active?: "true" | "false";
}

/** Create a tax rate. */
export interface CreateTaxRateParams {
  /** Its name on invoices, 1 to 40 characters, such as VAT. */
  displayName: string;
  /** A line about it, up to 120 characters. */
  description?: string;
  /** The rate in basis points, 0 to 5000: 1800 is 18%. */
  percentageBps: number;
  /** True when your prices already include it. Defaults to false: added on top. */
  inclusive?: boolean;
}

export interface ListTaxRatesParams extends ListParams {
  /** true for rates taking new subscriptions, false for archived ones. */
  active?: "true" | "false";
}

/** Update a tax rate. */
export interface UpdateTaxRateParams {
  /** A new name. */
  displayName?: string;
  /** A new line about it, or null. */
  description?: string | null;
  /** False archives it: no new subscription takes it. */
  active?: boolean;
}

/** Add an invoice item. */
export interface CreateInvoiceItemParams {
  /** The line as the customer reads it, 1 to 200 characters. */
  description: string;
  /** Per unit, in cents; negative for a credit. */
  unitAmountCents: number;
  /** How many units, 1 to 10000. Defaults to 1. */
  quantity?: number;
  /** Whether a coupon discounts it. Defaults to true. */
  discountable?: boolean;
  /** The customer it bills. */
  customerId: string;
  /** Only this subscription's next invoice takes it. Without it, the customer's next invoice does. */
  subscriptionId?: string;
  /** A draft invoice to add it to now, during its draft window. */
  invoiceId?: string;
}

export interface ListInvoiceItemsParams extends ListParams {
  /** Only this customer's items. */
  customerId?: string;
  /** true for items no invoice has taken yet, false for the ones taken. */
  pending?: "true" | "false";
}

/** Adjust a customer's credit. */
export interface CreateBalanceTransactionParams {
  /** Positive adds credit to the customer's balance; negative takes it away, never below zero. */
  amountCents: number;
  /** Why, up to 200 characters. */
  description?: string;
}

/** Move a subscription's time forward. */
export interface AdvanceTestClockParams {
  /** A sandbox subscription. */
  subscriptionId: string;
  /** How far to move its clock forward: 60 seconds to a year. */
  seconds: number;
}

/** Create a subscription schedule. */
export interface CreateSubscriptionScheduleParams {
  /** The customer, one of yours in this key's mode. */
  customerId: string;
  /** "now" (the default) starts the subscription at once, charged as any new subscription is; a time within two years starts it then. */
  startDate?: "now" | string;
  /** After the last phase: release (the default: the subscription carries on at the last phase's prices) or cancel (it ends: installments). */
  endBehavior?: "release" | "cancel";
  /** 1 to 10 phases, in order. */
  phases: {
    /** The phase's prices, 1 to 10, each once, all on one interval. */
    items: {
      /** An active price of yours. */
      priceId: string;
      /** How many units, 1 to 10000. Defaults to 1. */
      quantity?: number;
    }[];
    /** How many billing periods the phase lasts, 1 to 120. Every phase but the last has it; give the last one too for endBehavior cancel. */
    iterations?: number;
    /** A free trial at the start of the first phase, 1 to 730 days. */
    trialDays?: number;
    /** A coupon of yours put on the subscription when the phase starts. */
    couponId?: string;
  }[];
  /** Your own reference, up to 120 characters. */
  reference?: string;
}

export interface ListSubscriptionSchedulesParams extends ListParams {
  /** Only this customer's schedules. */
  customerId?: string;
  /** Only schedules with this status. */
  status?: "not_started" | "active" | "completed" | "released" | "canceled";
}

/** Create a feature. */
export interface CreateFeatureParams {
  /** Its name, 1 to 80 characters. */
  name: string;
  /** The key your app checks: lower case letters, digits, dots, dashes and underscores, up to 80, unique in the mode. */
  lookupKey: string;
}

export interface ListActiveEntitlementsParams {
  /** The customer. */
  customerId: string;
}

/** Give a product a feature. */
export interface AttachProductFeatureParams {
  /** The feature to give with the product. */
  featureId: string;
}

/** Create a meter. */
export interface CreateMeterParams {
  /** Its name, 1 to 80 characters, as invoice lines show the usage. */
  name: string;
  /** The name your meter events will carry: lower case letters, digits, dots, dashes and underscores, up to 100, unique in the mode. */
  eventName: string;
  /** sum (the default), count or last. */
  aggregation?: "sum" | "count" | "last";
}

/** Update a meter. */
export interface UpdateMeterParams {
  /** Its new name. */
  name?: string;
  /** False turns it off: its events are refused. True turns it back on. */
  active?: boolean;
}

export interface MeterEventSummaryParams {
  /** The customer. */
  customerId: string;
  /** From this time, ISO 8601. */
  start: string;
  /** Up to (not including) this time, ISO 8601, after start. */
  end: string;
}

/** Report usage. */
export interface CreateMeterEventParams {
  /** The eventName of an active meter of yours in this mode. */
  eventName: string;
  /** The customer whose usage it is. */
  customerId: string;
  /** How much, a whole number from 0. Defaults to 1. */
  value?: number;
  /** When it happened, ISO 8601: within the last 35 days, and not ahead of now. Defaults to now. */
  timestamp?: string;
  /** Your own id for it, up to 100 characters: sending it again returns the event already kept. */
  identifier?: string;
}

/** Create a usage alert. */
export interface CreateUsageAlertParams {
  /** The meter to watch. */
  meterId: string;
  /** One customer to watch. Leave it out to watch every customer. */
  customerId?: string;
  /** Its name, 1 to 80 characters, sent with the event. */
  title: string;
  /** The usage in a customer's current period that fires it, from 1. */
  threshold: number;
}

export interface ListUsageAlertsParams extends ListParams {
  /** Only the alerts watching this meter. */
  meterId?: string;
}

/** Create a subscription link. */
export interface CreateSubscriptionLinkParams {
  /** Its name, for you, 1 to 80 characters. */
  name: string;
  /** One to six active prices of yours, each once, in the order the page shows them. Mix monthly and yearly to let customers choose. */
  priceIds: string[];
  /** A free trial of 1 to 730 days for everyone who subscribes through it. Their card is checked with Rs. 10, refunded at once, and charged when the trial ends. */
  trialDays?: number;
  /** True shows a field for a code, matched to your coupons' codes. Defaults to false. */
  allowPromotionCodes?: boolean;
  /** Where customers land after subscribing: https, or your app's scheme. Without it, the link's own thank you page. */
  successUrl?: string;
}

export interface ListSubscriptionLinksParams extends ListParams {
  /** true for links that work, false for ones turned off. */
  active?: "true" | "false";
}

/** Update a subscription link. */
export interface UpdateSubscriptionLinkParams {
  /** Its new name. */
  name?: string;
  /** False turns the link off; true turns it back on. */
  active?: boolean;
  /** A new free trial length, or null to take the trial away. */
  trialDays?: number | null;
  /** Whether the page takes a code. */
  allowPromotionCodes?: boolean;
  /** A new landing page, or null for the link's own. */
  successUrl?: string | null;
}

/** Open the customer portal. */
export interface CreateBillingPortalSessionParams {
  /** The customer, one of yours in this key's mode. */
  customerId: string;
  /** Where the portal's back link takes the customer: https, or your app's scheme. */
  returnUrl?: string;
}
