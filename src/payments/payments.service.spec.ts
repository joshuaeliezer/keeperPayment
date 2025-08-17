import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Logger, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StripeService } from '../stripe/stripe.service';
import { Payments } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import Stripe from 'stripe';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: Repository<Payments>;
  let stripeService: StripeService;
  let configService: ConfigService;
  let clientProxy: ClientProxy;

  const mockPaymentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockStripeService = {
    createPaymentIntent: jest.fn(),
    createKeeperAccount: jest.fn(),
    createAccountLink: jest.fn(),
    findAccountByEmail: jest.fn(),
    retrieveAccount: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockClientProxy = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payments),
          useValue: mockPaymentsRepository,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'RABBITMQ_CLIENT',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentsRepository = module.get<Repository<Payments>>(getRepositoryToken(Payments));
    stripeService = module.get<StripeService>(StripeService);
    configService = module.get<ConfigService>(ConfigService);
    clientProxy = module.get<ClientProxy>('RABBITMQ_CLIENT');

    // Mock the client property
    (service as any).client = mockClientProxy;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    const createPaymentDto: CreatePaymentDto = {
      reservationId: '123e4567-e89b-12d3-a456-426614174000',
      amountTotal: 1000,
      keeperId: 'acct_keeper123',
    };

    const mockPaymentIntent: Stripe.PaymentIntent = {
      id: 'pi_test123',
      client_secret: 'pi_test123_secret',
      amount: 1000,
      currency: 'eur',
      status: 'requires_payment_method',
    } as Stripe.PaymentIntent;

    const mockPayment: Payments = {
      id: 'payment123',
      reservationId: createPaymentDto.reservationId,
      stripePaymentId: mockPaymentIntent.id,
      amountTotal: createPaymentDto.amountTotal,
      commissionAmount: 100,
      keeperAmount: 900,
      status: 'pending',
      keeperStripeAccountId: createPaymentDto.keeperId,
      paidAt: null,
    };

    it('should create a payment successfully', async () => {
      mockStripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
      mockPaymentsRepository.create.mockReturnValue(mockPayment);
      mockPaymentsRepository.save.mockResolvedValue(mockPayment);

      const result = await service.createPayment(createPaymentDto);

      expect(mockStripeService.createPaymentIntent).toHaveBeenCalledWith(
        1000,
        'eur',
        'acct_keeper123',
      );
      expect(mockPaymentsRepository.create).toHaveBeenCalledWith({
        reservationId: createPaymentDto.reservationId,
        stripePaymentId: mockPaymentIntent.id,
        amountTotal: createPaymentDto.amountTotal,
        commissionAmount: 100,
        keeperAmount: 900,
        status: 'pending',
        keeperStripeAccountId: createPaymentDto.keeperId,
      });
      expect(mockPaymentsRepository.save).toHaveBeenCalledWith(mockPayment);
      expect(result).toEqual({
        clientSecret: mockPaymentIntent.client_secret,
        paymentId: mockPayment.id,
      });
    });

    it('should calculate commission correctly (10%)', async () => {
      const dtoWithDifferentAmount = { ...createPaymentDto, amountTotal: 2000 };
      const expectedCommission = 200;
      const expectedKeeperAmount = 1800;

      mockStripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
      mockPaymentsRepository.create.mockReturnValue(mockPayment);
      mockPaymentsRepository.save.mockResolvedValue(mockPayment);

      await service.createPayment(dtoWithDifferentAmount);

      expect(mockPaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commissionAmount: expectedCommission,
          keeperAmount: expectedKeeperAmount,
        }),
      );
    });

    it('should handle Stripe service errors', async () => {
      const stripeError = new Error('Stripe API error');
      mockStripeService.createPaymentIntent.mockRejectedValue(stripeError);

      await expect(service.createPayment(createPaymentDto)).rejects.toThrow('Stripe API error');
    });
  });

  describe('handleStripeWebhook', () => {
    const mockPaymentIntent: Stripe.PaymentIntent = {
      id: 'pi_test123',
      amount: 1000,
      currency: 'eur',
      status: 'succeeded',
    } as Stripe.PaymentIntent;

    const mockEvent: Stripe.Event = {
      id: 'evt_test123',
      type: 'payment_intent.succeeded',
      data: {
        object: mockPaymentIntent,
      },
    } as Stripe.Event;

    const mockPayment: Payments = {
      id: 'payment123',
      reservationId: 'reservation123',
      stripePaymentId: 'pi_test123',
      amountTotal: 1000,
      commissionAmount: 100,
      keeperAmount: 900,
      status: 'pending',
      keeperStripeAccountId: 'acct_keeper123',
      paidAt: null,
    };

    it('should handle payment_intent.succeeded event', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentsRepository.save.mockResolvedValue(mockPayment);
      mockClientProxy.emit.mockResolvedValue(undefined);

      await service.handleStripeWebhook(mockEvent);

      expect(mockPaymentsRepository.findOne).toHaveBeenCalledWith({
        where: { stripePaymentId: 'pi_test123' },
      });
      expect(mockPaymentsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid',
          paidAt: expect.any(Date),
        }),
      );
      expect(mockClientProxy.emit).toHaveBeenCalledWith('payment.succeeded', {
        paymentId: mockPayment.id,
        reservationId: mockPayment.reservationId,
        amountTotal: mockPayment.amountTotal,
        keeperAmount: mockPayment.keeperAmount,
        commissionAmount: mockPayment.commissionAmount,
      });
    });

    it('should handle payment not found', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(null);

      await service.handleStripeWebhook(mockEvent);

      expect(mockPaymentsRepository.findOne).toHaveBeenCalledWith({
        where: { stripePaymentId: 'pi_test123' },
      });
      expect(mockPaymentsRepository.save).not.toHaveBeenCalled();
      expect(mockClientProxy.emit).not.toHaveBeenCalled();
    });

    it('should ignore non-payment_intent.succeeded events', async () => {
      const otherEvent: Stripe.Event = {
        id: 'evt_test456',
        type: 'customer.created',
        data: {
          object: {},
        },
      } as Stripe.Event;

      await service.handleStripeWebhook(otherEvent);

      expect(mockPaymentsRepository.findOne).not.toHaveBeenCalled();
      expect(mockPaymentsRepository.save).not.toHaveBeenCalled();
      expect(mockClientProxy.emit).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentById', () => {
    const mockPayment: Payments = {
      id: 'payment123',
      reservationId: 'reservation123',
      stripePaymentId: 'pi_test123',
      amountTotal: 1000,
      commissionAmount: 100,
      keeperAmount: 900,
      status: 'paid',
      keeperStripeAccountId: 'acct_keeper123',
      paidAt: new Date(),
    };

    it('should return payment when found', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.getPaymentById('payment123');

      expect(mockPaymentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'payment123' },
      });
      expect(result).toEqual(mockPayment);
    });

    it('should throw NotFoundException when payment not found', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(null);

      await expect(service.getPaymentById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPaymentById('nonexistent')).rejects.toThrow(
        'Payment with ID nonexistent not found',
      );
    });
  });

  describe('getAllPayments', () => {
    const mockPayments: Payments[] = [
      {
        id: 'payment1',
        reservationId: 'reservation1',
        stripePaymentId: 'pi_test1',
        amountTotal: 1000,
        commissionAmount: 100,
        keeperAmount: 900,
        status: 'paid',
        keeperStripeAccountId: 'acct_keeper1',
        paidAt: new Date(),
      },
      {
        id: 'payment2',
        reservationId: 'reservation2',
        stripePaymentId: 'pi_test2',
        amountTotal: 2000,
        commissionAmount: 200,
        keeperAmount: 1800,
        status: 'pending',
        keeperStripeAccountId: 'acct_keeper2',
        paidAt: null,
      },
    ];

    it('should return all payments', async () => {
      mockPaymentsRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getAllPayments();

      expect(mockPaymentsRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockPayments);
    });
  });

  describe('getPaymentsByStatus', () => {
    const mockPaidPayments: Payments[] = [
      {
        id: 'payment1',
        reservationId: 'reservation1',
        stripePaymentId: 'pi_test1',
        amountTotal: 1000,
        commissionAmount: 100,
        keeperAmount: 900,
        status: 'paid',
        keeperStripeAccountId: 'acct_keeper1',
        paidAt: new Date(),
      },
    ];

    it('should return payments by status', async () => {
      mockPaymentsRepository.find.mockResolvedValue(mockPaidPayments);

      const result = await service.getPaymentsByStatus('paid');

      expect(mockPaymentsRepository.find).toHaveBeenCalledWith({
        where: { status: 'paid' },
      });
      expect(result).toEqual(mockPaidPayments);
    });
  });

  describe('getPaymentsByKeeper', () => {
    const mockKeeperPayments: Payments[] = [
      {
        id: 'payment1',
        reservationId: 'reservation1',
        stripePaymentId: 'pi_test1',
        amountTotal: 1000,
        commissionAmount: 100,
        keeperAmount: 900,
        status: 'paid',
        keeperStripeAccountId: 'acct_keeper123',
        paidAt: new Date(),
      },
    ];

    it('should return payments by keeper ID', async () => {
      mockPaymentsRepository.find.mockResolvedValue(mockKeeperPayments);

      const result = await service.getPaymentsByKeeper('acct_keeper123');

      expect(mockPaymentsRepository.find).toHaveBeenCalledWith({
        where: { keeperStripeAccountId: 'acct_keeper123' },
      });
      expect(result).toEqual(mockKeeperPayments);
    });
  });

  describe('createKeeperAccount', () => {
    const mockAccount: Stripe.Account = {
      id: 'acct_keeper123',
      email: 'keeper@example.com',
      type: 'express',
      charges_enabled: false,
      payouts_enabled: false,
    } as Stripe.Account;

    it('should create keeper account successfully', async () => {
      mockStripeService.createKeeperAccount.mockResolvedValue(mockAccount);

      const result = await service.createKeeperAccount('keeper@example.com');

      expect(mockStripeService.createKeeperAccount).toHaveBeenCalledWith('keeper@example.com');
      expect(result).toEqual(mockAccount);
    });

    it('should handle Stripe service errors', async () => {
      const stripeError = new Error('Stripe account creation failed');
      mockStripeService.createKeeperAccount.mockRejectedValue(stripeError);

      await expect(service.createKeeperAccount('keeper@example.com')).rejects.toThrow(
        'Stripe account creation failed',
      );
    });
  });

  describe('createKeeperAccountLink', () => {
    const mockAccountLink: Stripe.AccountLink = {
      id: 'acctlink_test123',
      object: 'account_link',
      url: 'https://connect.stripe.com/setup/s/test',
      expires_at: 1234567890,
      created: 1234567890,
    } as Stripe.AccountLink;

    it('should create account link successfully', async () => {
      mockStripeService.createAccountLink.mockResolvedValue(mockAccountLink);

      const result = await service.createKeeperAccountLink('acct_keeper123');

      expect(mockStripeService.createAccountLink).toHaveBeenCalledWith('acct_keeper123');
      expect(result).toEqual(mockAccountLink);
    });
  });

  describe('findKeeperAccountByEmail', () => {
    const mockAccount: Stripe.Account = {
      id: 'acct_keeper123',
      email: 'keeper@example.com',
      type: 'express',
    } as Stripe.Account;

    it('should find account by email', async () => {
      mockStripeService.findAccountByEmail.mockResolvedValue(mockAccount);

      const result = await service.findKeeperAccountByEmail('keeper@example.com');

      expect(mockStripeService.findAccountByEmail).toHaveBeenCalledWith('keeper@example.com');
      expect(result).toEqual(mockAccount);
    });
  });

  describe('checkKeeperAccountStatus', () => {
    const mockCompleteAccount: Stripe.Account = {
      id: 'acct_keeper123',
      email: 'keeper@example.com',
      type: 'express',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    } as Stripe.Account;

    const mockIncompleteAccount: Stripe.Account = {
      id: 'acct_keeper123',
      email: 'keeper@example.com',
      type: 'express',
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
    } as Stripe.Account;

    it('should return complete status for fully onboarded account', async () => {
      mockStripeService.retrieveAccount.mockResolvedValue(mockCompleteAccount);

      const result = await service.checkKeeperAccountStatus('acct_keeper123');

      expect(mockStripeService.retrieveAccount).toHaveBeenCalledWith('acct_keeper123');
      expect(result).toEqual({
        isComplete: true,
        account: mockCompleteAccount,
        status: {
          chargesEnabled: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
        },
      });
    });

    it('should return incomplete status for partially onboarded account', async () => {
      mockStripeService.retrieveAccount.mockResolvedValue(mockIncompleteAccount);

      const result = await service.checkKeeperAccountStatus('acct_keeper123');

      expect(result).toEqual({
        isComplete: false,
        account: mockIncompleteAccount,
        status: {
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        },
      });
    });

    it('should handle Stripe service errors', async () => {
      const stripeError = new Error('Stripe account retrieval failed');
      mockStripeService.retrieveAccount.mockRejectedValue(stripeError);

      await expect(service.checkKeeperAccountStatus('acct_keeper123')).rejects.toThrow(
        'Stripe account retrieval failed',
      );
    });
  });
}); 