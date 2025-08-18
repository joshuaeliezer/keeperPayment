import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payments } from '../src/payments/entities/payment.entity';
import { ValidationPipe } from '@nestjs/common';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let paymentsRepository: Repository<Payments>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    paymentsRepository = moduleFixture.get<Repository<Payments>>(
      getRepositoryToken(Payments),
    );

    await app.init();

    // Clear database before each test
    await paymentsRepository.clear();
  });

  afterEach(async () => {
    await paymentsRepository.clear();
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

      return request(app.getHttpServer())
        .post('/payments')
        .send(createPaymentDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.reservationId).toBe(createPaymentDto.reservationId);
          expect(res.body.amountTotal).toBe(createPaymentDto.amountTotal);
          expect(res.body.keeperStripeAccountId).toBe(
            createPaymentDto.keeperId,
          );
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
      return request(app.getHttpServer())
        .get('/payments')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/payments/:id (GET)', () => {
    it('should return a payment by id', async () => {
      // First create a payment
      const createPaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_keeper123',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/payments')
        .send(createPaymentDto)
        .expect(201);

      const paymentId = createResponse.body.id;

      // Then get the payment by id
      return request(app.getHttpServer())
        .get(`/payments/${paymentId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(paymentId);
          expect(res.body.reservationId).toBe(createPaymentDto.reservationId);
        });
    });

    it('should return 404 for non-existent payment', () => {
      return request(app.getHttpServer())
        .get('/payments/nonexistent-id')
        .expect(404);
    });
  });

  describe('/payments/status/:status (GET)', () => {
    it('should return payments by status', () => {
      return request(app.getHttpServer())
        .get('/payments/status/pending')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/payments/keeper/:keeperId (GET)', () => {
    it('should return payments by keeper', () => {
      return request(app.getHttpServer())
        .get('/payments/keeper/acct_keeper123')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/payments/keeper/account (POST)', () => {
    it('should create a keeper account', () => {
      const createKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      return request(app.getHttpServer())
        .post('/payments/keeper/account')
        .send(createKeeperAccountDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe(createKeeperAccountDto.email);
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
      // First create a keeper account
      const createKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/payments/keeper/account')
        .send(createKeeperAccountDto)
        .expect(201);

      const accountId = createResponse.body.id;

      // Then create account link
      return request(app.getHttpServer())
        .get(`/payments/keeper/account/${accountId}/link`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('url');
          expect(res.body).toHaveProperty('expires_at');
        });
    });
  });

  describe('/payments/keeper/account/email/:email (GET)', () => {
    it('should find keeper account by email', async () => {
      // First create a keeper account
      const createKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      await request(app.getHttpServer())
        .post('/payments/keeper/account')
        .send(createKeeperAccountDto)
        .expect(201);

      // Then find by email
      return request(app.getHttpServer())
        .get('/payments/keeper/account/email/keeper@example.com')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('keeper@example.com');
        });
    });

    it('should return null for non-existent email', () => {
      return request(app.getHttpServer())
        .get('/payments/keeper/account/email/nonexistent@example.com')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeNull();
        });
    });
  });

  describe('/payments/webhooks/stripe (POST)', () => {
    it('should handle stripe webhook', () => {
      const webhookEvent = {
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
      };

      return request(app.getHttpServer())
        .post('/payments/webhooks/stripe')
        .send(webhookEvent)
        .expect(200);
    });

    it('should handle invalid webhook body', () => {
      return request(app.getHttpServer())
        .post('/payments/webhooks/stripe')
        .send({})
        .expect(400);
    });
  });
});
