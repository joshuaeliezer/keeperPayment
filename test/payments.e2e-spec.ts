import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payments } from '../src/payments/entities/payment.entity';
import Stripe from 'stripe';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let stripe: Stripe;
  let paymentsRepository: Repository<Payments>;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Add validation pipe for DTO validation
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

    await app.init();

    configService = app.get(ConfigService);
    paymentsRepository = app.get<Repository<Payments>>(getRepositoryToken(Payments));
    
    // Initialize Stripe with test key
    const stripeKey = configService.get('STRIPE_SECRET_KEY') || 'sk_test_dummy';
    stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await paymentsRepository.clear();
  });

  describe('/payments (POST)', () => {
    it('should create a payment intent successfully', async () => {
      const createPaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_test123',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(createPaymentDto)
        .expect(201);

      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('paymentId');
      expect(typeof response.body.clientSecret).toBe('string');
      expect(typeof response.body.paymentId).toBe('string');
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        amountTotal: 1000,
        // Missing reservationId and keeperId
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('reservationId');
      expect(response.body.message).toContain('keeperId');
    });

    it('should validate UUID format for reservationId', async () => {
      const invalidDto = {
        reservationId: 'invalid-uuid',
        amountTotal: 1000,
        keeperId: 'acct_test123',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('reservationId');
    });

    it('should validate minimum amount', async () => {
      const invalidDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: -100,
        keeperId: 'acct_test123',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('amountTotal');
    });

    it('should handle Stripe API errors gracefully', async () => {
      const createPaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'invalid_keeper_id',
      };

      // This should fail due to invalid keeper ID
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(createPaymentDto)
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('/payments/:id (GET)', () => {
    it('should get payment by ID', async () => {
      // First create a payment
      const createPaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_test123',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/payments')
        .send(createPaymentDto)
        .expect(201);

      const paymentId = createResponse.body.paymentId;

      // Then retrieve it
      const response = await request(app.getHttpServer())
        .get(`/payments/${paymentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', paymentId);
      expect(response.body).toHaveProperty('reservationId', createPaymentDto.reservationId);
      expect(response.body).toHaveProperty('amountTotal', createPaymentDto.amountTotal);
      expect(response.body).toHaveProperty('status', 'pending');
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/non-existent-id')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('/payments (GET)', () => {
    it('should get all payments', async () => {
      // Create multiple payments
      const payments = [
        {
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          keeperId: 'acct_test123',
        },
        {
          reservationId: '123e4567-e89b-12d3-a456-426614174001',
          amountTotal: 2000,
          keeperId: 'acct_test456',
        },
      ];

      for (const payment of payments) {
        await request(app.getHttpServer())
          .post('/payments')
          .send(payment)
          .expect(201);
      }

      const response = await request(app.getHttpServer())
        .get('/payments')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('/payments/status/:status (GET)', () => {
    it('should get payments by status', async () => {
      // Create a payment (which will be pending by default)
      const createPaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_test123',
      };

      await request(app.getHttpServer())
        .post('/payments')
        .send(createPaymentDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/payments/status/pending')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('status', 'pending');
    });

    it('should return empty array for non-existent status', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/status/refunded')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('/payments/keeper/:keeperId (GET)', () => {
    it('should get payments by keeper ID', async () => {
      const keeperId = 'acct_test123';
      
      // Create a payment for this keeper
      const createPaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId,
      };

      await request(app.getHttpServer())
        .post('/payments')
        .send(createPaymentDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/payments/keeper/${keeperId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('keeperStripeAccountId', keeperId);
    });
  });

  describe('/payments/keeper/account (POST)', () => {
    it('should create keeper account', async () => {
      const createKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/payments/keeper/account')
        .send(createKeeperAccountDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', createKeeperAccountDto.email);
      expect(response.body).toHaveProperty('type', 'express');
    });

    it('should validate email format', async () => {
      const invalidDto = {
        email: 'invalid-email',
      };

      const response = await request(app.getHttpServer())
        .post('/payments/keeper/account')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('email');
    });
  });

  describe('/payments/keeper/account/:accountId/link (GET)', () => {
    it('should create account link', async () => {
      // First create an account
      const createKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      const accountResponse = await request(app.getHttpServer())
        .post('/payments/keeper/account')
        .send(createKeeperAccountDto)
        .expect(201);

      const accountId = accountResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/payments/keeper/account/${accountId}/link`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('expires_at');
    });

    it('should handle invalid account ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/keeper/account/invalid-account-id/link')
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('/payments/keeper/account/email/:email (GET)', () => {
    it('should find account by email', async () => {
      const email = 'keeper@example.com';
      
      // First create an account
      const createKeeperAccountDto = { email };

      await request(app.getHttpServer())
        .post('/payments/keeper/account')
        .send(createKeeperAccountDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/payments/keeper/account/email/${email}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', email);
    });

    it('should return null for non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/keeper/account/email/nonexistent@example.com')
        .expect(200);

      expect(response.body).toBeNull();
    });
  });

  describe('/payments/keeper/onboarding/success (GET)', () => {
    it('should handle onboarding success for complete account', async () => {
      // First create an account
      const createKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      const accountResponse = await request(app.getHttpServer())
        .post('/payments/keeper/account')
        .send(createKeeperAccountDto)
        .expect(201);

      const accountId = accountResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/payments/keeper/onboarding/success?account_id=${accountId}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('deepLink');
      expect(response.body).toHaveProperty('accountId', accountId);
    });

    it('should handle missing account_id parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/keeper/onboarding/success')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('/payments/keeper/onboarding/refresh (GET)', () => {
    it('should return refresh response', async () => {
      const accountId = 'acct_test123';

      const response = await request(app.getHttpServer())
        .get(`/payments/keeper/onboarding/refresh?account_id=${accountId}`)
        .expect(200);

      expect(response.body).toEqual({
        status: 'refresh_needed',
        message: "Veuillez compléter l'onboarding",
        deepLink: `keeperpayment://onboarding/refresh?account_id=${accountId}`,
        accountId,
      });
    });
  });

  describe('/payments/webhooks/stripe (POST)', () => {
    it('should handle stripe webhook successfully', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
          },
        },
      };

      const signature = 'test_signature';

      const response = await request(app.getHttpServer())
        .post('/payments/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(mockEvent)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });

    it('should handle missing raw body', async () => {
      const signature = 'test_signature';

      const response = await request(app.getHttpServer())
        .post('/payments/webhooks/stripe')
        .set('stripe-signature', signature)
        .expect(500);

      expect(response.body.message).toContain('No event body received');
    });

    it('should handle invalid JSON', async () => {
      const signature = 'test_signature';

      const response = await request(app.getHttpServer())
        .post('/payments/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(500);

      expect(response.body.message).toContain('Webhook Error');
    });
  });
}); 