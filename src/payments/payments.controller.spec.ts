import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateKeeperAccountDto } from '../stripe/dto/create-keeper-account.dto';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPaymentsService = {
    createPayment: jest.fn(),
    getPaymentById: jest.fn(),
    getPaymentsByStatus: jest.fn(),
    createKeeperAccount: jest.fn(),
    checkKeeperAccountStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const createPaymentDto: CreatePaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_keeper123',
      };

      const mockResult = {
        clientSecret: 'pi_test123_secret',
        paymentId: 'pi_test123',
      };

      mockPaymentsService.createPayment.mockResolvedValue(mockResult);

      const result = await controller.createPayment(createPaymentDto);

      expect(service.createPayment).toHaveBeenCalledWith(createPaymentDto);
      expect(result).toEqual(mockResult);
    });

    it('should handle payment creation error', async () => {
      const createPaymentDto: CreatePaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_keeper123',
      };

      mockPaymentsService.createPayment.mockRejectedValue(
        new Error('Payment creation failed'),
      );

      await expect(controller.createPayment(createPaymentDto)).rejects.toThrow(
        'Payment creation failed',
      );
    });
  });

  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      const paymentId = 'pay_123';
      const mockPayment = {
        id: 'pay_123',
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        status: 'paid',
        keeperStripeAccountId: 'acct_keeper123',
        stripePaymentId: 'pi_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPaymentsService.getPaymentById.mockResolvedValue(mockPayment);

      const result = await controller.getPaymentById(paymentId);

      expect(service.getPaymentById).toHaveBeenCalledWith(paymentId);
      expect(result).toEqual(mockPayment);
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
          status: 'paid',
          keeperStripeAccountId: 'acct_keeper123',
          stripePaymentId: 'pi_123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPaymentsService.getPaymentsByStatus.mockResolvedValue(mockPayments);

      const result = await controller.getPaymentsByStatus(status);

      expect(service.getPaymentsByStatus).toHaveBeenCalledWith(status);
      expect(result).toEqual(mockPayments);
    });
  });

  describe('createKeeperAccount', () => {
    it('should create a keeper account successfully', async () => {
      const createKeeperAccountDto: CreateKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      const mockResult = {
        accountId: 'acct_keeper123',
        accountLink: 'https://connect.stripe.com/setup/s/test',
      };

      mockPaymentsService.createKeeperAccount.mockResolvedValue(mockResult);

      const result = await controller.createKeeperAccount(
        createKeeperAccountDto,
      );

      expect(service.createKeeperAccount).toHaveBeenCalledWith(
        createKeeperAccountDto.email,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle keeper account creation error', async () => {
      const createKeeperAccountDto: CreateKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      mockPaymentsService.createKeeperAccount.mockRejectedValue(
        new Error('Keeper account creation failed'),
      );

      await expect(
        controller.createKeeperAccount(createKeeperAccountDto),
      ).rejects.toThrow('Keeper account creation failed');
    });
  });

  describe('handleOnboardingSuccess', () => {
    it('should handle onboarding success for complete account', async () => {
      const accountId = 'acct_keeper123';
      const mockAccount = {
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      };

      mockPaymentsService.checkKeeperAccountStatus.mockResolvedValue({
        isComplete: true,
        account: mockAccount,
      });

      const result = await controller.handleOnboardingSuccess(accountId);

      expect(service.checkKeeperAccountStatus).toHaveBeenCalledWith(accountId);
      expect(result).toEqual({
        status: 'success',
        message: 'Onboarding complété avec succès',
        accountId: 'acct_keeper123',
        accountStatus: undefined,
        deepLink: 'keeperApp://onboarding/success?account_id=acct_keeper123',
      });
    });

    it('should handle onboarding success for incomplete account', async () => {
      const accountId = 'acct_keeper123';
      const mockAccount = {
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      };

      mockPaymentsService.checkKeeperAccountStatus.mockResolvedValue({
        isComplete: false,
        account: mockAccount,
      });

      const result = await controller.handleOnboardingSuccess(accountId);

      expect(service.checkKeeperAccountStatus).toHaveBeenCalledWith(accountId);
      expect(result).toEqual({
        status: 'incomplete',
        message: "L'onboarding n'est pas encore complet",
        accountId: 'acct_keeper123',
        accountStatus: undefined,
        deepLink: 'keeperapp://onboarding/refresh?account_id=acct_keeper123',
      });
    });

    it('should handle onboarding success error', async () => {
      const accountId = 'acct_keeper123';

      mockPaymentsService.checkKeeperAccountStatus.mockRejectedValue(
        new Error('Account status check failed'),
      );

      const result = await controller.handleOnboardingSuccess(accountId);

      expect(service.checkKeeperAccountStatus).toHaveBeenCalledWith(accountId);
      expect(result).toEqual({
        status: 'error',
        message: 'Erreur lors de la vérification du statut du compte',
        accountId: 'acct_keeper123',
        deepLink: 'keeperpayment://onboarding/error?account_id=acct_keeper123',
        error: 'Account status check failed',
      });
    });
  });
});
