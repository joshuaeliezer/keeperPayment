import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Security Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async () => {
      const sqlInjectionPayload = {
        reservationId: "'; DROP TABLE payments; --",
        amountTotal: 1000,
        keeperId: 'acct_test123',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(sqlInjectionPayload)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject XSS attempts in JSON payload', async () => {
      const xssPayload = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: '<script>alert("xss")</script>',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(xssPayload)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject oversized payloads', async () => {
      const oversizedPayload = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'a'.repeat(10000), // Very large string
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(oversizedPayload)
        .expect(413); // Payload Too Large

      expect(response.body.message).toBeDefined();
    });

    it('should reject malformed JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without proper headers', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should validate webhook signatures', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
          },
        },
      };

      // Test without signature
      const response1 = await request(app.getHttpServer())
        .post('/payments/webhooks/stripe')
        .send(mockEvent)
        .expect(500);

      expect(response1.body.message).toContain('No event body received');

      // Test with invalid signature
      const response2 = await request(app.getHttpServer())
        .post('/payments/webhooks/stripe')
        .set('stripe-signature', 'invalid_signature')
        .send(mockEvent)
        .expect(500);

      expect(response2.body.message).toContain('Webhook Error');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple rapid requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/payments').expect(200));

      const responses = await Promise.all(requests);

      // All requests should be processed (no rate limiting implemented yet)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate UUID format strictly', async () => {
      const invalidUuidPayload = {
        reservationId: 'not-a-uuid',
        amountTotal: 1000,
        keeperId: 'acct_test123',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(invalidUuidPayload)
        .expect(400);

      expect(response.body.message).toContain('reservationId');
    });

    it('should validate numeric constraints', async () => {
      const invalidAmountPayload = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: -1000, // Negative amount
        keeperId: 'acct_test123',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(invalidAmountPayload)
        .expect(400);

      expect(response.body.message).toContain('amountTotal');
    });

    it('should reject non-numeric amounts', async () => {
      const invalidAmountPayload = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 'not-a-number',
        keeperId: 'acct_test123',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(invalidAmountPayload)
        .expect(400);

      expect(response.body.message).toContain('amountTotal');
    });
  });

  describe('Error Handling', () => {
    it('should not expose internal errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/non-existent-id')
        .expect(404);

      // Should not expose internal stack traces
      expect(response.body.stack).toBeUndefined();
      expect(response.body.message).toBeDefined();
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Content-Type', 'application/json')
        .send('invalid json content')
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(response.body.stack).toBeUndefined();
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app.getHttpServer())
        .options('/payments')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);

      // CORS headers should be present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Content Security', () => {
    it('should set appropriate security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments')
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });
});
