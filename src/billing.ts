import type { RequestOptions, Transport } from "./transport.js";
import type {
  ActiveEntitlement,
  AdvanceTestClockParams,
  AttachProductFeatureParams,
  BillingPortalSession,
  CancelSubscriptionParams,
  Coupon,
  CreateBalanceTransactionParams,
  CreateBillingPortalSessionParams,
  CreateCouponParams,
  CreateCreditNoteParams,
  CreateCustomerParams,
  CreateFeatureParams,
  CreateInvoiceItemParams,
  CreateInvoiceParams,
  CreateMeterEventParams,
  CreateMeterParams,
  CreatePriceParams,
  CreateSubscriptionLinkParams,
  CreateSubscriptionParams,
  CreateSubscriptionScheduleParams,
  CreateTaxRateParams,
  CreateUsageAlertParams,
  CreditNote,
  Customer,
  CustomerBalanceTransaction,
  DeletedInvoiceItem,
  DeletedProductFeature,
  Feature,
  Invoice,
  InvoiceItem,
  List,
  ListActiveEntitlementsParams,
  ListCouponsParams,
  ListCreditNotesParams,
  ListCustomersParams,
  ListInvoiceItemsParams,
  ListInvoicesParams,
  ListParams,
  ListPricesParams,
  ListSubscriptionLinksParams,
  ListSubscriptionSchedulesParams,
  ListSubscriptionsParams,
  ListTaxRatesParams,
  ListUsageAlertsParams,
  Meter,
  MeterEvent,
  MeterEventSummary,
  MeterEventSummaryParams,
  PreviewInvoiceParams,
  Price,
  ProductFeature,
  Subscription,
  SubscriptionLink,
  SubscriptionSchedule,
  TaxRate,
  TestClock,
  UpcomingInvoiceParams,
  UpdateMeterParams,
  UpdateSubscriptionLinkParams,
  UpdateSubscriptionParams,
  UpdateTaxRateParams,
  UsageAlert,
} from "./types.js";
import { pages, segment } from "./paging.js";

/** The people you bill, found or made by email, and the credit each holds toward their next invoices. */
export class Customers {
  constructor(private readonly transport: Transport) {}

  /** Makes a customer. One with the same email in this mode is answered instead of made again. */
  create(params: CreateCustomerParams, options?: RequestOptions): Promise<Customer> {
    return this.transport.request("POST", "/v1/customers", { body: params, options });
  }

  list(params: ListCustomersParams = {}, options?: RequestOptions): Promise<List<Customer>> {
    return this.transport.request("GET", "/v1/customers", { query: { ...params }, options });
  }

  listAll(params: ListCustomersParams = {}, options?: RequestOptions): AsyncGenerator<Customer> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListCustomersParams = {}, options?: RequestOptions): AsyncGenerator<Customer> {
    return this.listAll(params, options);
  }

  retrieve(customerId: string, options?: RequestOptions): Promise<Customer> {
    return this.transport.request("GET", `/v1/customers/${segment(customerId, "a customer")}`, { options });
  }

  /** Adds credit to the customer's balance (a positive amount) or takes it away (negative, never below zero). Their next invoices use it up before the card is charged. */
  createBalanceTransaction(customerId: string, params: CreateBalanceTransactionParams, options?: RequestOptions): Promise<CustomerBalanceTransaction> {
    return this.transport.request("POST", `/v1/customers/${segment(customerId, "a customer")}/balance_transactions`, { body: params, options });
  }

  listBalanceTransactions(customerId: string, params: ListParams = {}, options?: RequestOptions): Promise<List<CustomerBalanceTransaction>> {
    return this.transport.request("GET", `/v1/customers/${segment(customerId, "a customer")}/balance_transactions`, { query: { ...params }, options });
  }
}

/** What you charge each period: per unit, per package, tiered or metered, each on a product. */
export class Prices {
  constructor(private readonly transport: Transport) {}

  /** Makes a price on a product of yours (productId) or on a new one (product). */
  create(params: CreatePriceParams, options?: RequestOptions): Promise<Price> {
    return this.transport.request("POST", "/v1/prices", { body: params, options });
  }

  list(params: ListPricesParams = {}, options?: RequestOptions): Promise<List<Price>> {
    return this.transport.request("GET", "/v1/prices", { query: { ...params }, options });
  }

  listAll(params: ListPricesParams = {}, options?: RequestOptions): AsyncGenerator<Price> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListPricesParams = {}, options?: RequestOptions): AsyncGenerator<Price> {
    return this.listAll(params, options);
  }

  retrieve(priceId: string, options?: RequestOptions): Promise<Price> {
    return this.transport.request("GET", `/v1/prices/${segment(priceId, "a price")}`, { options });
  }
}

/** A product's features: what a subscription to it lets its customer use. */
export class Products {
  constructor(private readonly transport: Transport) {}

  /** Gives the product a feature. Customers subscribed to it gain the feature at once. Attaching it again changes nothing. */
  attachFeature(productId: string, params: AttachProductFeatureParams, options?: RequestOptions): Promise<ProductFeature> {
    return this.transport.request("POST", `/v1/products/${segment(productId, "a product")}/features`, { body: params, options });
  }

  listFeatures(productId: string, options?: RequestOptions): Promise<List<ProductFeature>> {
    return this.transport.request("GET", `/v1/products/${segment(productId, "a product")}/features`, { options });
  }

  /** Takes a feature off the product. Customers subscribed to it lose the feature unless another of their products gives it. */
  detachFeature(productId: string, featureId: string, options?: RequestOptions): Promise<DeletedProductFeature> {
    return this.transport.request("DELETE", `/v1/products/${segment(productId, "a product")}/features/${segment(featureId, "a feature")}`, { options });
  }
}

/** Customers paying a price every period, renewed and charged for you. */
export class Subscriptions {
  constructor(private readonly transport: Transport) {}

  /**
   * Starts a subscription. With a card on file its first invoice is charged
   * within a minute; without one, send the customer to checkoutUrl.
   */
  create(params: CreateSubscriptionParams, options?: RequestOptions): Promise<Subscription> {
    return this.transport.request("POST", "/v1/subscriptions", { body: params, options });
  }

  list(params: ListSubscriptionsParams = {}, options?: RequestOptions): Promise<List<Subscription>> {
    return this.transport.request("GET", "/v1/subscriptions", { query: { ...params }, options });
  }

  listAll(params: ListSubscriptionsParams = {}, options?: RequestOptions): AsyncGenerator<Subscription> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListSubscriptionsParams = {}, options?: RequestOptions): AsyncGenerator<Subscription> {
    return this.listAll(params, options);
  }

  retrieve(subscriptionId: string, options?: RequestOptions): Promise<Subscription> {
    return this.transport.request("GET", `/v1/subscriptions/${segment(subscriptionId, "a subscription")}`, { options });
  }

  /**
   * Changes prices and quantities (with prorations), the card, the coupon and
   * tax rates, a trial, pausing and a cancellation date. Preview a change
   * first with invoices.preview.
   */
  update(subscriptionId: string, params: UpdateSubscriptionParams, options?: RequestOptions): Promise<Subscription> {
    return this.transport.request("POST", `/v1/subscriptions/${segment(subscriptionId, "a subscription")}`, { body: params, options });
  }

  /** Ends it now, or at the end of the period paid for with atPeriodEnd. */
  cancel(subscriptionId: string, params: CancelSubscriptionParams = {}, options?: RequestOptions): Promise<Subscription> {
    return this.transport.request("POST", `/v1/subscriptions/${segment(subscriptionId, "a subscription")}/cancel`, { body: params, options });
  }

  /** Withdraws a cancellation set for the period's end or a date, or starts a paused subscription again, billed at once to the card on file. */
  resume(subscriptionId: string, options?: RequestOptions): Promise<Subscription> {
    return this.transport.request("POST", `/v1/subscriptions/${segment(subscriptionId, "a subscription")}/resume`, { options });
  }
}

/** Invoices: those subscriptions make each period, and standalone ones you make from invoice items. */
export class Invoices {
  constructor(private readonly transport: Transport) {}

  /** A standalone draft invoice of the customer's pending invoice items. Finalise it to send or charge it. */
  create(params: CreateInvoiceParams, options?: RequestOptions): Promise<Invoice> {
    return this.transport.request("POST", "/v1/invoices", { body: params, options });
  }

  list(params: ListInvoicesParams = {}, options?: RequestOptions): Promise<List<Invoice>> {
    return this.transport.request("GET", "/v1/invoices", { query: { ...params }, options });
  }

  listAll(params: ListInvoicesParams = {}, options?: RequestOptions): AsyncGenerator<Invoice> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListInvoicesParams = {}, options?: RequestOptions): AsyncGenerator<Invoice> {
    return this.listAll(params, options);
  }

  retrieve(invoiceId: string, options?: RequestOptions): Promise<Invoice> {
    return this.transport.request("GET", `/v1/invoices/${segment(invoiceId, "an invoice")}`, { options });
  }

  /** The subscription's next invoice as it stands now, usage so far included. Nothing is saved. */
  upcoming(params: UpcomingInvoiceParams, options?: RequestOptions): Promise<Invoice> {
    return this.transport.request("GET", "/v1/invoices/upcoming", { query: { ...params }, options });
  }

  /** What a change to a subscription would invoice, prorations included. Nothing is saved. */
  preview(params: PreviewInvoiceParams, options?: RequestOptions): Promise<Invoice> {
    return this.transport.request("POST", "/v1/invoices/preview", { body: params, options });
  }

  /** Emails an open invoice's page to the customer again. */
  send(invoiceId: string, options?: RequestOptions): Promise<Invoice> {
    return this.transport.request("POST", `/v1/invoices/${segment(invoiceId, "an invoice")}/send`, { options });
  }

  /** Charges an open invoice to the card on file within a minute, whatever the retry schedule says. invoice.paid or invoice.payment_failed tells you how it went. */
  pay(invoiceId: string, options?: RequestOptions): Promise<Invoice> {
    return this.transport.request("POST", `/v1/invoices/${segment(invoiceId, "an invoice")}/pay`, { options });
  }

  /** Numbers a draft and opens it: charged to the card on file, or emailed to be paid by its due date. */
  finalize(invoiceId: string, options?: RequestOptions): Promise<Invoice> {
    return this.transport.request("POST", `/v1/invoices/${segment(invoiceId, "an invoice")}/finalize`, { options });
  }

  /** Cancels a draft or open invoice: nothing is owed on it and nothing more is tried. */
  void(invoiceId: string, options?: RequestOptions): Promise<Invoice> {
    return this.transport.request("POST", `/v1/invoices/${segment(invoiceId, "an invoice")}/void`, { options });
  }

  /** Marks an open invoice uncollectible: it was owed, and will never be tried again. */
  markUncollectible(invoiceId: string, options?: RequestOptions): Promise<Invoice> {
    return this.transport.request("POST", `/v1/invoices/${segment(invoiceId, "an invoice")}/mark_uncollectible`, { options });
  }
}

/** Credit notes: part or all of an invoice taken back, off what is due, to the customer's credit, or refunded. */
export class CreditNotes {
  constructor(private readonly transport: Transport) {}

  create(params: CreateCreditNoteParams, options?: RequestOptions): Promise<CreditNote> {
    return this.transport.request("POST", "/v1/credit_notes", { body: params, options });
  }

  list(params: ListCreditNotesParams = {}, options?: RequestOptions): Promise<List<CreditNote>> {
    return this.transport.request("GET", "/v1/credit_notes", { query: { ...params }, options });
  }

  listAll(params: ListCreditNotesParams = {}, options?: RequestOptions): AsyncGenerator<CreditNote> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListCreditNotesParams = {}, options?: RequestOptions): AsyncGenerator<CreditNote> {
    return this.listAll(params, options);
  }

  retrieve(creditNoteId: string, options?: RequestOptions): Promise<CreditNote> {
    return this.transport.request("GET", `/v1/credit_notes/${segment(creditNoteId, "a credit note")}`, { options });
  }
}

/** Discounts on subscriptions' invoices, once, for some months or forever, with an optional code customers type. */
export class Coupons {
  constructor(private readonly transport: Transport) {}

  create(params: CreateCouponParams, options?: RequestOptions): Promise<Coupon> {
    return this.transport.request("POST", "/v1/coupons", { body: params, options });
  }

  list(params: ListCouponsParams = {}, options?: RequestOptions): Promise<List<Coupon>> {
    return this.transport.request("GET", "/v1/coupons", { query: { ...params }, options });
  }

  listAll(params: ListCouponsParams = {}, options?: RequestOptions): AsyncGenerator<Coupon> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListCouponsParams = {}, options?: RequestOptions): AsyncGenerator<Coupon> {
    return this.listAll(params, options);
  }

  retrieve(couponId: string, options?: RequestOptions): Promise<Coupon> {
    return this.transport.request("GET", `/v1/coupons/${segment(couponId, "a coupon")}`, { options });
  }

  /** Stops new subscriptions using it. Subscriptions it already discounts keep the discount. */
  archive(couponId: string, options?: RequestOptions): Promise<Coupon> {
    return this.transport.request("DELETE", `/v1/coupons/${segment(couponId, "a coupon")}`, { options });
  }
}

/** Tax rates added to or included in subscriptions' invoices. */
export class TaxRates {
  constructor(private readonly transport: Transport) {}

  create(params: CreateTaxRateParams, options?: RequestOptions): Promise<TaxRate> {
    return this.transport.request("POST", "/v1/tax_rates", { body: params, options });
  }

  list(params: ListTaxRatesParams = {}, options?: RequestOptions): Promise<List<TaxRate>> {
    return this.transport.request("GET", "/v1/tax_rates", { query: { ...params }, options });
  }

  listAll(params: ListTaxRatesParams = {}, options?: RequestOptions): AsyncGenerator<TaxRate> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListTaxRatesParams = {}, options?: RequestOptions): AsyncGenerator<TaxRate> {
    return this.listAll(params, options);
  }

  retrieve(taxRateId: string, options?: RequestOptions): Promise<TaxRate> {
    return this.transport.request("GET", `/v1/tax_rates/${segment(taxRateId, "a tax rate")}`, { options });
  }

  /** Renames it or archives it (active false). Its percentage never changes: make a new rate for a new one. */
  update(taxRateId: string, params: UpdateTaxRateParams, options?: RequestOptions): Promise<TaxRate> {
    return this.transport.request("POST", `/v1/tax_rates/${segment(taxRateId, "a tax rate")}`, { body: params, options });
  }
}

/** One-off lines waiting for a customer's next invoice, or added to a draft. */
export class InvoiceItems {
  constructor(private readonly transport: Transport) {}

  create(params: CreateInvoiceItemParams, options?: RequestOptions): Promise<InvoiceItem> {
    return this.transport.request("POST", "/v1/invoice_items", { body: params, options });
  }

  list(params: ListInvoiceItemsParams = {}, options?: RequestOptions): Promise<List<InvoiceItem>> {
    return this.transport.request("GET", "/v1/invoice_items", { query: { ...params }, options });
  }

  listAll(params: ListInvoiceItemsParams = {}, options?: RequestOptions): AsyncGenerator<InvoiceItem> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListInvoiceItemsParams = {}, options?: RequestOptions): AsyncGenerator<InvoiceItem> {
    return this.listAll(params, options);
  }

  /** Deletes an item no invoice has taken yet. One an invoice took stays as that invoice's record. */
  delete(invoiceItemId: string, options?: RequestOptions): Promise<DeletedInvoiceItem> {
    return this.transport.request("DELETE", `/v1/invoice_items/${segment(invoiceItemId, "an invoice item")}`, { options });
  }
}

/** Sandbox only: runs a test subscription's time ahead, to see renewals, trials and retries without waiting. */
export class TestClocks {
  constructor(private readonly transport: Transport) {}

  advance(params: AdvanceTestClockParams, options?: RequestOptions): Promise<TestClock> {
    return this.transport.request("POST", "/v1/test_clocks/advance", { body: params, options });
  }
}

/** Plans that change on their own: phases of prices, trials and coupons, and installments that end after a set number of payments. */
export class SubscriptionSchedules {
  constructor(private readonly transport: Transport) {}

  create(params: CreateSubscriptionScheduleParams, options?: RequestOptions): Promise<SubscriptionSchedule> {
    return this.transport.request("POST", "/v1/subscription_schedules", { body: params, options });
  }

  list(params: ListSubscriptionSchedulesParams = {}, options?: RequestOptions): Promise<List<SubscriptionSchedule>> {
    return this.transport.request("GET", "/v1/subscription_schedules", { query: { ...params }, options });
  }

  listAll(params: ListSubscriptionSchedulesParams = {}, options?: RequestOptions): AsyncGenerator<SubscriptionSchedule> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListSubscriptionSchedulesParams = {}, options?: RequestOptions): AsyncGenerator<SubscriptionSchedule> {
    return this.listAll(params, options);
  }

  retrieve(scheduleId: string, options?: RequestOptions): Promise<SubscriptionSchedule> {
    return this.transport.request("GET", `/v1/subscription_schedules/${segment(scheduleId, "a subscription schedule")}`, { options });
  }

  /** A schedule not started never starts; a running one cancels its subscription now. */
  cancel(scheduleId: string, options?: RequestOptions): Promise<SubscriptionSchedule> {
    return this.transport.request("POST", `/v1/subscription_schedules/${segment(scheduleId, "a subscription schedule")}/cancel`, { options });
  }

  /** Lets go of the subscription, which carries on at the prices it has now, with no more phases. */
  release(scheduleId: string, options?: RequestOptions): Promise<SubscriptionSchedule> {
    return this.transport.request("POST", `/v1/subscription_schedules/${segment(scheduleId, "a subscription schedule")}/release`, { options });
  }
}

export class EntitlementFeatures {
  constructor(private readonly transport: Transport) {}

  /** A feature your app checks by its lookupKey. Give it to products with products.attachFeature. */
  create(params: CreateFeatureParams, options?: RequestOptions): Promise<Feature> {
    return this.transport.request("POST", "/v1/entitlements/features", { body: params, options });
  }

  list(params: ListParams = {}, options?: RequestOptions): Promise<List<Feature>> {
    return this.transport.request("GET", "/v1/entitlements/features", { query: { ...params }, options });
  }

  listAll(params: ListParams = {}, options?: RequestOptions): AsyncGenerator<Feature> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListParams = {}, options?: RequestOptions): AsyncGenerator<Feature> {
    return this.listAll(params, options);
  }
}

export class ActiveEntitlements {
  constructor(private readonly transport: Transport) {}

  /** The features a customer has now, from the products on their running subscriptions. */
  list(params: ListActiveEntitlementsParams, options?: RequestOptions): Promise<List<ActiveEntitlement>> {
    return this.transport.request("GET", "/v1/entitlements/active_entitlements", { query: { ...params }, options });
  }
}

/** Features, and which of them each customer has now. entitlements.active_entitlement_summary.updated says when that changes. */
export class Entitlements {
  readonly features: EntitlementFeatures;
  readonly activeEntitlements: ActiveEntitlements;

  constructor(transport: Transport) {
    this.features = new EntitlementFeatures(transport);
    this.activeEntitlements = new ActiveEntitlements(transport);
  }
}

/** Meters add up the usage you report, for metered prices to bill at the end of each period. */
export class Meters {
  constructor(private readonly transport: Transport) {}

  create(params: CreateMeterParams, options?: RequestOptions): Promise<Meter> {
    return this.transport.request("POST", "/v1/meters", { body: params, options });
  }

  list(params: ListParams = {}, options?: RequestOptions): Promise<List<Meter>> {
    return this.transport.request("GET", "/v1/meters", { query: { ...params }, options });
  }

  listAll(params: ListParams = {}, options?: RequestOptions): AsyncGenerator<Meter> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListParams = {}, options?: RequestOptions): AsyncGenerator<Meter> {
    return this.listAll(params, options);
  }

  retrieve(meterId: string, options?: RequestOptions): Promise<Meter> {
    return this.transport.request("GET", `/v1/meters/${segment(meterId, "a meter")}`, { options });
  }

  /** Renames it, or turns it off (active false: its events are refused) or back on. */
  update(meterId: string, params: UpdateMeterParams, options?: RequestOptions): Promise<Meter> {
    return this.transport.request("POST", `/v1/meters/${segment(meterId, "a meter")}`, { body: params, options });
  }

  /** A customer's usage on the meter between two times, added up the meter's way. */
  eventSummary(meterId: string, params: MeterEventSummaryParams, options?: RequestOptions): Promise<MeterEventSummary> {
    return this.transport.request("GET", `/v1/meters/${segment(meterId, "a meter")}/event_summaries`, { query: { ...params }, options });
  }
}

export class MeterEvents {
  constructor(private readonly transport: Transport) {}

  /** Reports usage. Send an identifier to make a repeat of the same event count once. */
  create(params: CreateMeterEventParams, options?: RequestOptions): Promise<MeterEvent> {
    return this.transport.request("POST", "/v1/meter_events", { body: params, options });
  }
}

/** Alerts when a customer's usage on a meter passes a threshold in a period: billing.alert.triggered. */
export class UsageAlerts {
  constructor(private readonly transport: Transport) {}

  create(params: CreateUsageAlertParams, options?: RequestOptions): Promise<UsageAlert> {
    return this.transport.request("POST", "/v1/usage_alerts", { body: params, options });
  }

  list(params: ListUsageAlertsParams = {}, options?: RequestOptions): Promise<List<UsageAlert>> {
    return this.transport.request("GET", "/v1/usage_alerts", { query: { ...params }, options });
  }

  listAll(params: ListUsageAlertsParams = {}, options?: RequestOptions): AsyncGenerator<UsageAlert> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListUsageAlertsParams = {}, options?: RequestOptions): AsyncGenerator<UsageAlert> {
    return this.listAll(params, options);
  }

  archive(alertId: string, options?: RequestOptions): Promise<UsageAlert> {
    return this.transport.request("POST", `/v1/usage_alerts/${segment(alertId, "a usage alert")}/archive`, { options });
  }
}

/** Links anyone can open to subscribe to your prices: share one, or put it behind a button. */
export class SubscriptionLinks {
  constructor(private readonly transport: Transport) {}

  create(params: CreateSubscriptionLinkParams, options?: RequestOptions): Promise<SubscriptionLink> {
    return this.transport.request("POST", "/v1/subscription_links", { body: params, options });
  }

  list(params: ListSubscriptionLinksParams = {}, options?: RequestOptions): Promise<List<SubscriptionLink>> {
    return this.transport.request("GET", "/v1/subscription_links", { query: { ...params }, options });
  }

  listAll(params: ListSubscriptionLinksParams = {}, options?: RequestOptions): AsyncGenerator<SubscriptionLink> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListSubscriptionLinksParams = {}, options?: RequestOptions): AsyncGenerator<SubscriptionLink> {
    return this.listAll(params, options);
  }

  retrieve(linkId: string, options?: RequestOptions): Promise<SubscriptionLink> {
    return this.transport.request("GET", `/v1/subscription_links/${segment(linkId, "a subscription link")}`, { options });
  }

  /** Renames it, changes its trial or return address, or turns it off (active false). Its prices never change. */
  update(linkId: string, params: UpdateSubscriptionLinkParams, options?: RequestOptions): Promise<SubscriptionLink> {
    return this.transport.request("POST", `/v1/subscription_links/${segment(linkId, "a subscription link")}`, { body: params, options });
  }
}

export class BillingPortalSessions {
  constructor(private readonly transport: Transport) {}

  /** An address, good for an hour, where the customer manages their subscriptions, card and invoices. Send them straight to it. */
  create(params: CreateBillingPortalSessionParams, options?: RequestOptions): Promise<BillingPortalSession> {
    return this.transport.request("POST", "/v1/billing_portal/sessions", { body: params, options });
  }
}

/** The customer portal, where your customers manage their own subscriptions. */
export class BillingPortal {
  readonly sessions: BillingPortalSessions;

  constructor(transport: Transport) {
    this.sessions = new BillingPortalSessions(transport);
  }
}
