import Stripe from 'stripe';

export const mockStripePaymentIntent: Stripe.PaymentIntent = {
  id: 'pi_test123',
  object: 'payment_intent',
  amount: 1000,
  currency: 'eur',
  status: 'requires_payment_method',
  client_secret: 'pi_test123_secret',
  application_fee_amount: 100,
  transfer_data: {
    destination: 'acct_keeper123',
  },
  created: 1234567890,
  livemode: false,
  metadata: {},
  next_action: null,
  payment_method: null,
  payment_method_types: ['card'],
  receipt_email: null,
  setup_future_usage: null,
  shipping: null,
  source: null,
  statement_descriptor: null,
  statement_descriptor_suffix: null,
  transfer_group: null,
} as Stripe.PaymentIntent;

export const mockStripeAccount: Stripe.Account = {
  id: 'acct_keeper123',
  object: 'account',
  business_profile: {
    mcc: null,
    name: null,
    product_description: null,
    support_address: null,
    support_email: null,
    support_phone: null,
    support_url: null,
    url: null,
  },
  business_type: null,
  capabilities: {
    card_payments: 'active',
    transfers: 'active',
  },
  charges_enabled: true,
  country: 'FR',
  created: 1234567890,
  default_currency: 'eur',
  details_submitted: true,
  email: 'keeper@example.com',
  external_accounts: {
    data: [],
    has_more: false,
    object: 'list',
    total_count: 0,
    url: '/v1/accounts/acct_keeper123/external_accounts',
  },
  future_requirements: null,
  individual: null,
  livemode: false,
  metadata: {},
  payouts_enabled: true,
  requirements: {
    alternatives: [],
    current_deadline: null,
    currently_due: [],
    disabled_reason: null,
    errors: [],
    eventually_due: [],
    past_due: [],
    pending_verification: [],
  },
  settings: {
    bacs_debit_payments: null,
    branding: {
      icon: null,
      logo: null,
      primary_color: null,
      secondary_color: null,
    },
    card_issuing: null,
    card_payments: {
      decline_on: {
        avs_failure: false,
        cvc_failure: false,
      },
      statement_descriptor_prefix: null,
      statement_descriptor_prefix_kana: null,
      statement_descriptor_prefix_kanji: null,
    },
    dashboard: {
      display_name: null,
      timezone: null,
    },
    payments: {
      statement_descriptor: null,
      statement_descriptor_kana: null,
      statement_descriptor_kanji: null,
    },
    payouts: {
      debit_negative_balances: false,
      schedule: {
        delay_days: 7,
        interval: 'daily',
      },
      statement_descriptor: null,
    },
    sepa_debit_payments: null,
    treasury: null,
  },
  tos_acceptance: null,
  type: 'express',
} as Stripe.Account;

export const mockStripeAccountLink: Stripe.AccountLink = {
  id: 'acctlink_test123',
  object: 'account_link',
  account: 'acct_keeper123',
  created: 1234567890,
  expires_at: 1234567890,
  url: 'https://connect.stripe.com/setup/s/test',
  collect: null,
  refresh_url: 'https://api.example.com/payments/keeper/onboarding/refresh?account_id=acct_keeper123',
  return_url: 'https://api.example.com/payments/keeper/onboarding/success?account_id=acct_keeper123',
  type: 'account_onboarding',
} as Stripe.AccountLink;

export const mockStripeEvent: Stripe.Event = {
  id: 'evt_test123',
  object: 'event',
  api_version: '2023-10-16',
  created: 1234567890,
  data: {
    object: mockStripePaymentIntent,
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: 'req_test123',
    idempotency_key: null,
  },
  type: 'payment_intent.succeeded',
} as Stripe.Event;

export const createMockStripe = () => {
  return {
    paymentIntents: {
      create: jest.fn().mockResolvedValue(mockStripePaymentIntent),
    },
    accounts: {
      create: jest.fn().mockResolvedValue(mockStripeAccount),
      list: jest.fn().mockResolvedValue({ data: [mockStripeAccount] }),
      retrieve: jest.fn().mockResolvedValue(mockStripeAccount),
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue(mockStripeAccountLink),
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue(mockStripeEvent),
    },
  };
};
