import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { StripeService } from '../src/stripe/stripe.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

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
      .overrideProvider(StripeService)
      .useValue(mockStripeService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(response.text).toBe('Hello World!');
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(typeof response.body.timestamp).toBe('string');
    expect(typeof response.body.uptime).toBe('number');
  });
});
