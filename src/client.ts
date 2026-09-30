import { Transport, type ClientOptions, type RequestOptions } from "./transport.js";
import type {
  Account,
  ChargeSavedCardParams,
  Checkout,
  CreateCheckoutParams,
  CreatePaymentLinkParams,
  CreateRefundParams,
  List,
  ListEventsParams,
  ListPaymentsParams,
  ListRefundsParams,
  ListSavedCardsParams,
  Payment,
  PaymentLink,
  Refund,
  SavedCard,
  WebhookEvent,
} from "./types.js";
import { constructEvent, verifyWebhookSignature } from "./webhooks.js";
import { pages, segment } from "./paging.js";
import {
  BillingPortal,
  Coupons,
  CreditNotes,
  Customers,
  Entitlements,
  InvoiceItems,
  Invoices,
  MeterEvents,
  Meters,
  Prices,
  Products,
  SubscriptionLinks,
  SubscriptionSchedules,
  Subscriptions,
  TaxRates,
  TestClocks,
  UsageAlerts,
} from "./billing.js";

const KEY = /^(sk|pk)_(test|live)_[A-Za-z0-9_-]+$/;

export class Checkouts {
  constructor(private readonly transport: Transport) {}

  /**
   * Creates a checkout. Send the customer to checkout.url. Pass amountCents and
   * description, or lineItems and let the API add them up.
   */
  create(params: CreateCheckoutParams, options?: RequestOptions): Promise<Checkout> {
    return this.transport.request("POST", "/v1/checkouts", { body: params, options });
  }

  retrieve(checkoutId: string, options?: RequestOptions): Promise<Checkout> {
    return this.transport.request("GET", `/v1/checkouts/${segment(checkoutId, "a checkout")}`, { options });
  }
}

export class Payments {
  constructor(private readonly transport: Transport) {}

  list(params: ListPaymentsParams = {}, options?: RequestOptions): Promise<List<Payment>> {
    return this.transport.request("GET", "/v1/payments", { query: { ...params }, options });
  }

  /** Every payment, newest first, reading page after page as you iterate. */
  listAll(params: ListPaymentsParams = {}, options?: RequestOptions): AsyncGenerator<Payment> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListPaymentsParams = {}, options?: RequestOptions): AsyncGenerator<Payment> {
    return this.listAll(params, options);
  }

  retrieve(paymentId: string, options?: RequestOptions): Promise<Payment> {
    return this.transport.request("GET", `/v1/payments/${segment(paymentId, "a payment")}`, { options });
  }
}

export class Refunds {
  constructor(private readonly transport: Transport) {}

  /**
   * Records a refund, pending, and queues it for Payable (live) or Payable's
   * sandbox (test); refund.succeeded or refund.failed says how it ended.
   * Payable refunds a card payment only once it has settled, from the next
   * bank working day. Only a payment taken by a local development API's
   * simulator refunds at once.
   */
  create(params: CreateRefundParams, options?: RequestOptions): Promise<Refund> {
    return this.transport.request("POST", "/v1/refunds", { body: params, options });
  }

  list(params: ListRefundsParams = {}, options?: RequestOptions): Promise<List<Refund>> {
    return this.transport.request("GET", "/v1/refunds", { query: { ...params }, options });
  }

  listAll(params: ListRefundsParams = {}, options?: RequestOptions): AsyncGenerator<Refund> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListRefundsParams = {}, options?: RequestOptions): AsyncGenerator<Refund> {
    return this.listAll(params, options);
  }

  retrieve(refundId: string, options?: RequestOptions): Promise<Refund> {
    return this.transport.request("GET", `/v1/refunds/${segment(refundId, "a refund")}`, { options });
  }
}

export class PaymentLinks {
  constructor(private readonly transport: Transport) {}

  create(params: CreatePaymentLinkParams, options?: RequestOptions): Promise<PaymentLink> {
    return this.transport.request("POST", "/v1/payment_links", { body: params, options });
  }

  list(options?: RequestOptions): Promise<List<PaymentLink>> {
    return this.transport.request("GET", "/v1/payment_links", { options });
  }

  /** Stops the link taking payments. Payments already made are unaffected. */
  retire(linkId: string, options?: RequestOptions): Promise<PaymentLink> {
    return this.transport.request("DELETE", `/v1/payment_links/${segment(linkId, "a payment link")}`, { options });
  }
}

/**
 * Cards your customers chose to keep on file at a checkout. A card id is not a
 * card number: it works only with your key, in the mode it was saved in.
 */
export class Cards {
  constructor(private readonly transport: Transport) {}

  /** One page of the cards still usable, newest first. Filter by customerEmail. */
  list(params: ListSavedCardsParams = {}, options?: RequestOptions): Promise<List<SavedCard>> {
    return this.transport.request("GET", "/v1/cards", { query: { ...params }, options });
  }

  /** Every card matching params, newest first, reading page after page as you iterate. */
  listAll(params: ListSavedCardsParams = {}, options?: RequestOptions): AsyncGenerator<SavedCard> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListSavedCardsParams = {}, options?: RequestOptions): AsyncGenerator<SavedCard> {
    return this.listAll(params, options);
  }

  /** One card, deleted ones included, with its expiry month and the consent the customer gave. */
  retrieve(cardId: string, options?: RequestOptions): Promise<SavedCard> {
    return this.transport.request("GET", `/v1/cards/${segment(cardId, "a saved card")}`, { options });
  }

  /** Charges a saved card without the customer present. */
  charge(cardId: string, params: ChargeSavedCardParams, options?: RequestOptions): Promise<Payment> {
    return this.transport.request("POST", `/v1/cards/${segment(cardId, "a saved card")}/charge`, { body: params, options });
  }

  /** Removes the card here and its token at the processor. Removing one already removed answers the same card. */
  delete(cardId: string, options?: RequestOptions): Promise<SavedCard> {
    return this.transport.request("DELETE", `/v1/cards/${segment(cardId, "a saved card")}`, { options });
  }
}

/**
 * The events your webhooks receive, in the same shape, newest first. Only the
 * types a webhook can deliver are listed. Useful to catch up after downtime.
 */
export class Events {
  constructor(private readonly transport: Transport) {}

  list(params: ListEventsParams = {}, options?: RequestOptions): Promise<List<WebhookEvent>> {
    return this.transport.request("GET", "/v1/events", { query: { ...params }, options });
  }

  /** Every event matching params, newest first, reading page after page as you iterate. */
  listAll(params: ListEventsParams = {}, options?: RequestOptions): AsyncGenerator<WebhookEvent> {
    return pages((p) => this.list(p, options), params);
  }

  /** The same as listAll, under the name the PHP library uses. */
  all(params: ListEventsParams = {}, options?: RequestOptions): AsyncGenerator<WebhookEvent> {
    return this.listAll(params, options);
  }

  retrieve(eventId: string, options?: RequestOptions): Promise<WebhookEvent> {
    return this.transport.request("GET", `/v1/events/${segment(eventId, "an event")}`, { options });
  }
}

export class AccountResource {
  constructor(private readonly transport: Transport) {}

  /** The merchant behind the key: status, clearance, pricing plan and whether live payments are enabled. */
  retrieve(options?: RequestOptions): Promise<Account> {
    return this.transport.request("GET", "/v1/account", { options });
  }
}

/**
 * The Payments.lk API. Use a secret key (sk_test_ or sk_live_) on your
 * server only; never ship it in a browser or an app.
 */
export class PaymentsLk {
  readonly checkouts: Checkouts;
  readonly payments: Payments;
  readonly refunds: Refunds;
  readonly paymentLinks: PaymentLinks;
  readonly cards: Cards;
  readonly events: Events;
  readonly account: AccountResource;
  readonly customers: Customers;
  readonly prices: Prices;
  readonly products: Products;
  readonly subscriptions: Subscriptions;
  readonly invoices: Invoices;
  readonly creditNotes: CreditNotes;
  readonly coupons: Coupons;
  readonly taxRates: TaxRates;
  readonly invoiceItems: InvoiceItems;
  readonly subscriptionSchedules: SubscriptionSchedules;
  readonly subscriptionLinks: SubscriptionLinks;
  readonly billingPortal: BillingPortal;
  readonly meters: Meters;
  readonly meterEvents: MeterEvents;
  readonly usageAlerts: UsageAlerts;
  readonly entitlements: Entitlements;
  /** Sandbox only. */
  readonly testClocks: TestClocks;
  readonly webhooks = { constructEvent, verifySignature: verifyWebhookSignature };

  constructor(secretKey: string, options: ClientOptions = {}) {
    if (typeof secretKey !== "string" || !KEY.test(secretKey)) {
      throw new TypeError("Pass your Payments.lk secret key. It starts with sk_test_ or sk_live_ and is in the dashboard under Developers.");
    }
    const transport = new Transport(secretKey, options);
    this.checkouts = new Checkouts(transport);
    this.payments = new Payments(transport);
    this.refunds = new Refunds(transport);
    this.paymentLinks = new PaymentLinks(transport);
    this.cards = new Cards(transport);
    this.events = new Events(transport);
    this.account = new AccountResource(transport);
    this.customers = new Customers(transport);
    this.prices = new Prices(transport);
    this.products = new Products(transport);
    this.subscriptions = new Subscriptions(transport);
    this.invoices = new Invoices(transport);
    this.creditNotes = new CreditNotes(transport);
    this.coupons = new Coupons(transport);
    this.taxRates = new TaxRates(transport);
    this.invoiceItems = new InvoiceItems(transport);
    this.subscriptionSchedules = new SubscriptionSchedules(transport);
    this.subscriptionLinks = new SubscriptionLinks(transport);
    this.billingPortal = new BillingPortal(transport);
    this.meters = new Meters(transport);
    this.meterEvents = new MeterEvents(transport);
    this.usageAlerts = new UsageAlerts(transport);
    this.entitlements = new Entitlements(transport);
    this.testClocks = new TestClocks(transport);
  }
}
