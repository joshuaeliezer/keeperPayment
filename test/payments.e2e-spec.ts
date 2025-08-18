import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payments } from '../src/payments/entities/payment.entity';
import { ValidationPipe } from '@nestjs/common';
import { PaymentsService } from '../src/payments/payments.service';
import { StripeService } from '../src/stripe/stripe.service';
import { TestDatabaseModule } from './test-database.module';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let paymentsRepository: Repository<Payments>;

  const mockPaymentsService = {
    createPayment: jest.fn(),
    getPaymentById: jest.fn(),
    getAllPayments: jest.fn(),
    getPaymentsByStatus: jest.fn(),
    getPaymentsByKeeper: jest.fn(),
    createKeeperAccount: jest.fn(),
    createKeeperAccountLink: jest.fn(),
    findKeeperAccountByEmail: jest.fn(),
    checkKeeperAccountStatus: jest.fn(),
  };

  const mockStripeService = {
    createPaymentIntent: jest.fn(),
    createKeeperAccount: jest.fn(),
    createAccountLink: jest.fn(),
    findAccountByEmail: jest.fn(),
    retrieveAccount: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PaymentsService)
      .useValue(mockPaymentsService)
      .overrideProvider(StripeService)
      .useValue(mockStripeService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    paymentsRepository = moduleFixture.get<Repository<Payments>>(
      getRepositoryToken(Payments),
    );

    await app.init();

    // Clear mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/payments (POST)', () => {
    it('should create a payment', () => {
      const createPaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_keeper123',
      };

      const mockResponse = {
        clientSecret: 'pi_test123_secret',
        paymentId: 'pay_123',
      };

      mockPaymentsService.createPayment.mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .post('/payments')
        .send(createPaymentDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(mockResponse);
        });
    });

    it('should validate required fields', () => {
      const invalidDto = {
        // Missing required fields
      };

      return request(app.getHttpServer())
        .post('/payments')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/payments (GET)', () => {
    it('should return all payments', () => {
      const mockPayments = [
        {
          id: 'pay_123',
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          status: 'pending',
        },
      ];

      mockPaymentsService.getAllPayments.mockResolvedValue(mockPayments);

      return request(app.getHttpServer())
        .get('/payments')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockPayments);
        });
    });
  });

  describe('/payments/:id (GET)', () => {
    it('should return a payment by id', async () => {
      const mockPayment = {
        id: 'pay_123',
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        status: 'pending',
      };

      mockPaymentsService.getPaymentById.mockResolvedValue(mockPayment);

      return request(app.getHttpServer())
        .get('/payments/pay_123')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockPayment);
        });
    });

    it('should return 404 for non-existent payment', () => {
      mockPaymentsService.getPaymentById.mockRejectedValue(
        new Error('Payment not found'),
      );

      return request(app.getHttpServer())
        .get('/payments/nonexistent-id')
        .expect(404);
    });
  });

  describe('/payments/status/:status (GET)', () => {
    it('should return payments by status', () => {
      const mockPayments = [
        {
          id: 'pay_123',
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          status: 'pending',
        },
      ];

      mockPaymentsService.getPaymentsByStatus.mockResolvedValue(mockPayments);

      return request(app.getHttpServer())
        .get('/payments/status/pending')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockPayments);
        });
    });
  });

  describe('/payments/keeper/:keeperId (GET)', () => {
    it('should return payments by keeper', () => {
      const mockPayments = [
        {
          id: 'pay_123',
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          status: 'pending',
          keeperStripeAccountId: 'acct_keeper123',
        },
      ];

      mockPaymentsService.getPaymentsByKeeper.mockResolvedValue(mockPayments);

      return request(app.getHttpServer())
        .get('/payments/keeper/acct_keeper123')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockPayments);
        });
    });
  });

  describe('/payments/keeper/account (POST)', () => {
    it('should create a keeper account', () => {
      const createKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      const mockAccount = {
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
      };

      mockPaymentsService.createKeeperAccount.mockResolvedValue(mockAccount);

      return request(app.getHttpServer())
        .post('/payments/keeper/account')
        .send(createKeeperAccountDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(mockAccount);
        });
    });

    it('should validate email format', () => {
      const invalidDto = {
        email: 'invalid-email',
      };

      return request(app.getHttpServer())
        .post('/payments/keeper/account')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/payments/keeper/account/:id/link (GET)', () => {
    it('should create a keeper account link', async () => {
      const mockAccountLink = {
        id: 'acctlink_test123',
        url: 'https://connect.stripe.com/setup/s/test',
        expires_at: 1234567890,
      };

      mockPaymentsService.createKeeperAccountLink.mockResolvedValue(
        mockAccountLink,
      );

      return request(app.getHttpServer())
        .get('/payments/keeper/account/acct_keeper123/link')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockAccountLink);
        });
    });
  });

  describe('/payments/keeper/account/email/:email (GET)', () => {
    it('should find keeper account by email', async () => {
      const mockAccount = {
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
      };

      mockPaymentsService.findKeeperAccountByEmail.mockResolvedValue(
        mockAccount,
      );

      return request(app.getHttpServer())
        .get('/payments/keeper/account/email/keeper@example.com')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockAccount);
        });
    });

    it('should return null for non-existent email', () => {
      mockPaymentsService.findKeeperAccountByEmail.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/payments/keeper/account/email/nonexistent@example.com')
        .expect(200)
        .expect((res) => {
          // Le contrôleur peut retourner null ou un objet vide selon la configuration
          expect(res.body === null || Object.keys(res.body).length === 0).toBe(true);
        });
    });
  });

  describe('/payments/keeper/onboarding/success (GET)', () => {
    it('should handle onboarding success for complete account', () => {
      const mockAccountStatus = {
        isComplete: true,
        account: {
          id: 'acct_keeper123',
          charges_enabled: true,
          payouts_enabled: true,
        },
        status: {
          chargesEnabled: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
        },
      };

      mockPaymentsService.checkKeeperAccountStatus.mockResolvedValue(
        mockAccountStatus,
      );

      return request(app.getHttpServer())
        .get('/payments/keeper/onboarding/success?account_id=acct_keeper123')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('success');
          expect(res.body.message).toBe('Onboarding complété avec succès');
        });
    });

    it('should handle onboarding success for incomplete account', () => {
      const mockAccountStatus = {
        isComplete: false,
        account: {
          id: 'acct_keeper123',
          charges_enabled: false,
          payouts_enabled: false,
        },
        status: {
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        },
      };

      mockPaymentsService.checkKeeperAccountStatus.mockResolvedValue(
        mockAccountStatus,
      );

      return request(app.getHttpServer())
        .get('/payments/keeper/onboarding/success?account_id=acct_keeper123')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('incomplete');
          expect(res.body.message).toBe(
            "L'onboarding n'est pas encore complet",
          );
        });
    });
  });

  describe('/payments/keeper/onboarding/refresh (GET)', () => {
    it('should return refresh response', () => {
      return request(app.getHttpServer())
        .get('/payments/keeper/onboarding/refresh?account_id=acct_keeper123')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('refresh_needed');
          expect(res.body.message).toBe("Veuillez compléter l'onboarding");
        });
    });
  });
});
