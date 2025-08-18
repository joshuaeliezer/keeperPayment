import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { Payments } from './entities/payment.entity';
import { StripeService } from '../stripe/stripe.service';
import { ConfigService } from '@nestjs/config';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPaymentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
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
          provide: 'PAYMENTS_SERVICE',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const createPaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_keeper123',
      };

      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        amount: 1000,
        currency: 'eur',
        status: 'requires_payment_method',
      };

      const mockPayment = {
        id: 'pay_123',
        reservationId: createPaymentDto.reservationId,
        amountTotal: createPaymentDto.amountTotal,
        commissionAmount: 100,
        keeperAmount: 900,
        status: 'pending',
        keeperStripeAccountId: createPaymentDto.keeperId,
        stripePaymentId: mockPaymentIntent.id,
        paidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStripeService.createPaymentIntent.mockResolvedValue(
        mockPaymentIntent,
      );
      mockPaymentsRepository.create.mockReturnValue(mockPayment);
      mockPaymentsRepository.save.mockResolvedValue(mockPayment);

      const result = await service.createPayment(createPaymentDto);

      expect(mockStripeService.createPaymentIntent).toHaveBeenCalledWith(
        1000,
        'eur',
        createPaymentDto.keeperId,
      );
      expect(mockPaymentsRepository.create).toHaveBeenCalledWith({
        reservationId: createPaymentDto.reservationId,
        amountTotal: createPaymentDto.amountTotal,
        commissionAmount: 100,
        keeperAmount: 900,
        status: 'pending',
        keeperStripeAccountId: createPaymentDto.keeperId,
        stripePaymentId: mockPaymentIntent.id,
      });
      expect(mockPaymentsRepository.save).toHaveBeenCalledWith(mockPayment);
      expect(result).toEqual({
        clientSecret: mockPaymentIntent.client_secret,
        paymentId: mockPayment.id,
      });
    });

    it('should handle errors when creating payment', async () => {
      const createPaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_keeper123',
      };

      const error = new Error('Stripe API error');
      mockStripeService.createPaymentIntent.mockRejectedValue(error);

      await expect(service.createPayment(createPaymentDto)).rejects.toThrow(
        'Stripe API error',
      );
    });
  });

  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      const paymentId = 'pay_123';
      const mockPayment = {
        id: paymentId,
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        commissionAmount: 100,
        keeperAmount: 900,
        status: 'paid',
        keeperStripeAccountId: 'acct_keeper123',
        stripePaymentId: 'pi_123',
        paidAt: new Date(),
      };

      mockPaymentsRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.getPaymentById(paymentId);

      expect(mockPaymentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: paymentId },
      });
      expect(result).toEqual(mockPayment);
    });

    it('should throw NotFoundException when payment not found', async () => {
      const paymentId = 'pay_nonexistent';
      mockPaymentsRepository.findOne.mockResolvedValue(null);

      await expect(service.getPaymentById(paymentId)).rejects.toThrow(
        `Payment with ID ${paymentId} not found`,
      );
    });
  });

  describe('getAllPayments', () => {
    it('should return all payments', async () => {
      const mockPayments = [
        {
          id: 'pay_123',
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          commissionAmount: 100,
          keeperAmount: 900,
          status: 'paid',
          keeperStripeAccountId: 'acct_keeper123',
          stripePaymentId: 'pi_123',
          paidAt: new Date(),
        },
      ];

      mockPaymentsRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getAllPayments();

      expect(mockPaymentsRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockPayments);
    });
  });

  describe('getPaymentsByStatus', () => {
    it('should return payments by status', async () => {
      const status = 'paid';
      const mockPayments = [
        {
          id: 'pay_123',
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          commissionAmount: 100,
          keeperAmount: 900,
          status: 'paid',
          keeperStripeAccountId: 'acct_keeper123',
          stripePaymentId: 'pi_123',
          paidAt: new Date(),
        },
      ];

      mockPaymentsRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getPaymentsByStatus(status);

      expect(mockPaymentsRepository.find).toHaveBeenCalledWith({
        where: { status },
      });
      expect(result).toEqual(mockPayments);
    });
  });

  describe('getPaymentsByKeeper', () => {
    it('should return payments by keeper', async () => {
      const keeperId = 'acct_keeper123';
      const mockPayments = [
        {
          id: 'pay_123',
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          commissionAmount: 100,
          keeperAmount: 900,
          status: 'paid',
          keeperStripeAccountId: 'acct_keeper123',
          stripePaymentId: 'pi_123',
          paidAt: new Date(),
        },
      ];

      mockPaymentsRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getPaymentsByKeeper(keeperId);

      expect(mockPaymentsRepository.find).toHaveBeenCalledWith({
        where: { keeperStripeAccountId: keeperId },
      });
      expect(result).toEqual(mockPayments);
    });
  });

  describe('createKeeperAccount', () => {
    it('should create a keeper account successfully', async () => {
      const email = 'keeper@example.com';
      const mockAccount = {
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
        charges_enabled: false,
        payouts_enabled: false,
      };

      mockStripeService.createKeeperAccount.mockResolvedValue(mockAccount);

      const result = await service.createKeeperAccount(email);

      expect(mockStripeService.createKeeperAccount).toHaveBeenCalledWith(email);
      expect(result).toEqual(mockAccount);
    });

    it('should handle errors when creating keeper account', async () => {
      const email = 'keeper@example.com';
      const error = new Error('Stripe account creation failed');
      mockStripeService.createKeeperAccount.mockRejectedValue(error);

      await expect(service.createKeeperAccount(email)).rejects.toThrow(
        'Stripe account creation failed',
      );
    });
  });

  describe('createKeeperAccountLink', () => {
    it('should create a keeper account link successfully', async () => {
      const accountId = 'acct_keeper123';
      const mockAccountLink = {
        id: 'acctlink_test123',
        object: 'account_link',
        url: 'https://connect.stripe.com/setup/s/test',
        expires_at: 1234567890,
        created: 1234567890,
      };

      mockStripeService.createAccountLink.mockResolvedValue(mockAccountLink);

      const result = await service.createKeeperAccountLink(accountId);

      expect(mockStripeService.createAccountLink).toHaveBeenCalledWith(
        accountId,
      );
      expect(result).toEqual(mockAccountLink);
    });

    it('should handle errors when creating account link', async () => {
      const accountId = 'acct_keeper123';
      const error = new Error('Stripe account link creation failed');
      mockStripeService.createAccountLink.mockRejectedValue(error);

      await expect(service.createKeeperAccountLink(accountId)).rejects.toThrow(
        'Stripe account link creation failed',
      );
    });
  });

  describe('findKeeperAccountByEmail', () => {
    it('should find keeper account by email', async () => {
      const email = 'keeper@example.com';
      const mockAccount = {
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
        charges_enabled: true,
        payouts_enabled: true,
      };

      mockStripeService.findAccountByEmail.mockResolvedValue(mockAccount);

      const result = await service.findKeeperAccountByEmail(email);

      expect(mockStripeService.findAccountByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(mockAccount);
    });

    it('should return null when account not found', async () => {
      const email = 'nonexistent@example.com';
      mockStripeService.findAccountByEmail.mockResolvedValue(null);

      const result = await service.findKeeperAccountByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('checkKeeperAccountStatus', () => {
    it('should check keeper account status successfully', async () => {
      const accountId = 'acct_keeper123';
      const mockAccount = {
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      };

      mockStripeService.retrieveAccount.mockResolvedValue(mockAccount);

      const result = await service.checkKeeperAccountStatus(accountId);

      expect(mockStripeService.retrieveAccount).toHaveBeenCalledWith(accountId);
      expect(result).toEqual({
        isComplete: true,
        account: mockAccount,
        status: {
          chargesEnabled: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
        },
      });
    });

    it('should handle incomplete account status', async () => {
      const accountId = 'acct_keeper123';
      const mockAccount = {
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      };

      mockStripeService.retrieveAccount.mockResolvedValue(mockAccount);

      const result = await service.checkKeeperAccountStatus(accountId);

      expect(result).toEqual({
        isComplete: false,
        account: mockAccount,
        status: {
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        },
      });
    });

    it('should handle errors when checking account status', async () => {
      const accountId = 'acct_keeper123';
      const error = new Error('Stripe account retrieval failed');
      mockStripeService.retrieveAccount.mockRejectedValue(error);

      await expect(service.checkKeeperAccountStatus(accountId)).rejects.toThrow(
        'Stripe account retrieval failed',
      );
    });
  });
});
