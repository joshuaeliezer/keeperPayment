import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Stripe for tests - more flexible mock
jest.mock('stripe', () => {
  const mockStripe = {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        amount: 1000,
        currency: 'eur',
        status: 'requires_payment_method',
      }),
    },
    accounts: {
      create: jest.fn().mockResolvedValue({
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
        charges_enabled: false,
        payouts_enabled: false,
      }),
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'acct_keeper123',
            email: 'keeper@example.com',
            type: 'express',
          },
        ],
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      }),
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue({
        id: 'acctlink_test123',
        object: 'account_link',
        url: 'https://connect.stripe.com/setup/s/test',
        expires_at: 1234567890,
        created: 1234567890,
      }),
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 1000,
            currency: 'eur',
            status: 'succeeded',
          },
        },
      }),
    },
  };

  return jest.fn(() => mockStripe);
});

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Handle async operations cleanup
afterAll(async () => {
  // Wait for any pending promises to resolve
  await new Promise((resolve) => setTimeout(resolve, 100));
});

// Force Jest to exit after tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
