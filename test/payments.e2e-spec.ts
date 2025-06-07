import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let stripe: Stripe;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const configService = app.get(ConfigService);
    stripe = new Stripe(configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/payments (POST)', () => {
    it('should create a payment intent', async () => {
      const createPaymentDto = {
        reservationId: 'res_123',
        amountTotal: 1000,
        keeperId: 'acct_123',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(createPaymentDto)
        .expect(201);

      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('paymentId');
    });
  });

  describe('/payments/webhooks/stripe (POST)', () => {
    it('should handle stripe webhook', async () => {
      const mockEvent = {
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
  });
}); 