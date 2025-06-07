import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { ConfigService } from '@nestjs/config';
import { StripeService } from '../stripe/stripe.service';
import { ClientProxy } from '@nestjs/microservices';
import Stripe from 'stripe';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let stripeService: StripeService;
  let paymentsRepository: Repository<Payment>;
  let client: ClientProxy;

  const mockPaymentIntent = {
    id: 'pi_test123',
    client_secret: 'pi_test123_secret',
  } as Stripe.PaymentIntent;

  const mockStripeService = {
    createPaymentIntent: jest.fn().mockResolvedValue(mockPaymentIntent),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockClient = {
    emit: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'RABBITMQ_URL':
                  return 'amqp://localhost:5672';
                default:
                  return 'test_value';
              }
            }),
          },
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: 'PAYMENT_SERVICE',
          useValue: mockClient,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    stripeService = module.get<StripeService>(StripeService);
    paymentsRepository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
    client = module.get<ClientProxy>('PAYMENT_SERVICE');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const createPaymentDto = {
        reservationId: 'res_123',
        amountTotal: 1000,
        keeperId: 'acct_123',
      };

      const mockPayment = {
        id: 'payment_123',
        ...createPaymentDto,
        stripePaymentId: mockPaymentIntent.id,
        commissionAmount: 100,
        keeperAmount: 900,
        status: 'pending',
        keeperStripeAccountId: createPaymentDto.keeperId,
      };

      mockRepository.create.mockReturnValue(mockPayment);
      mockRepository.save.mockResolvedValue(mockPayment);

      const result = await service.createPayment(createPaymentDto);

      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        1000,
        'eur',
        'acct_123',
      );
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        clientSecret: mockPaymentIntent.client_secret,
        paymentId: mockPayment.id,
      });
    });
  });

  describe('handleStripeWebhook', () => {
    it('should handle successful payment intent', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
          },
        },
      } as Stripe.Event;

      const mockPayment = {
        id: 'payment_123',
        stripePaymentId: 'pi_test123',
        status: 'pending',
        reservationId: 'res_123',
        amountTotal: 1000,
        keeperAmount: 900,
        commissionAmount: 100,
      };

      mockRepository.findOne.mockResolvedValue(mockPayment);
      mockRepository.save.mockResolvedValue({
        ...mockPayment,
        status: 'paid',
        paidAt: expect.any(Date),
      });

      await service.handleStripeWebhook(mockEvent);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { stripePaymentId: 'pi_test123' },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockClient.emit).toHaveBeenCalledWith('payment.succeeded', {
        paymentId: mockPayment.id,
        reservationId: mockPayment.reservationId,
        amountTotal: mockPayment.amountTotal,
        keeperAmount: mockPayment.keeperAmount,
        commissionAmount: mockPayment.commissionAmount,
      });
    });
  });
}); 