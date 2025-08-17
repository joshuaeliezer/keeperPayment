import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateKeeperAccountDto } from '../stripe/dto/create-keeper-account.dto';
import { Payments } from './entities/payment.entity';
import Stripe from 'stripe';
import { Request } from 'express';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: PaymentsService;

  const mockPaymentsService = {
    createPayment: jest.fn(),
    handleStripeWebhook: jest.fn(),
    getPaymentById: jest.fn(),
    getAllPayments: jest.fn(),
    getPaymentsByStatus: jest.fn(),
    getPaymentsByKeeper: jest.fn(),
    createKeeperAccount: jest.fn(),
    createKeeperAccountLink: jest.fn(),
    findKeeperAccountByEmail: jest.fn(),
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
    paymentsService = module.get<PaymentsService>(PaymentsService);
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

    const expectedResult = {
      clientSecret: 'pi_test123_secret',
      paymentId: 'payment123',
    };

    it('should create a payment successfully', async () => {
      mockPaymentsService.createPayment.mockResolvedValue(expectedResult);

      const result = await controller.createPayment(createPaymentDto);

      expect(mockPaymentsService.createPayment).toHaveBeenCalledWith(createPaymentDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Payment creation failed');
      mockPaymentsService.createPayment.mockRejectedValue(serviceError);

      await expect(controller.createPayment(createPaymentDto)).rejects.toThrow('Payment creation failed');
    });
  });

  describe('handleStripeWebhook', () => {
    const mockRequest = {
      rawBody: Buffer.from(JSON.stringify({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
          },
        },
      })),
    } as Request & { rawBody: Buffer };

    const mockSignature = 'whsec_test_signature';

    it('should handle webhook successfully', async () => {
      mockPaymentsService.handleStripeWebhook.mockResolvedValue(undefined);

      const result = await controller.handleStripeWebhook(mockRequest, mockSignature);

      expect(mockPaymentsService.handleStripeWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'evt_test123',
          type: 'payment_intent.succeeded',
        }),
      );
      expect(result).toEqual({ received: true });
    });

    it('should handle missing raw body', async () => {
      const requestWithoutBody = { rawBody: null } as Request & { rawBody: null };

      await expect(controller.handleStripeWebhook(requestWithoutBody, mockSignature)).rejects.toThrow(
        'No event body received',
      );
    });

    it('should handle JSON parsing errors', async () => {
      const requestWithInvalidJson = {
        rawBody: Buffer.from('invalid json'),
      } as Request & { rawBody: Buffer };

      await expect(controller.handleStripeWebhook(requestWithInvalidJson, mockSignature)).rejects.toThrow(
        'Webhook Error:',
      );
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Webhook processing failed');
      mockPaymentsService.handleStripeWebhook.mockRejectedValue(serviceError);

      await expect(controller.handleStripeWebhook(mockRequest, mockSignature)).rejects.toThrow(
        'Webhook Error: Webhook processing failed',
      );
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

    it('should return payment by ID', async () => {
      mockPaymentsService.getPaymentById.mockResolvedValue(mockPayment);

      const result = await controller.getPaymentById('payment123');

      expect(mockPaymentsService.getPaymentById).toHaveBeenCalledWith('payment123');
      expect(result).toEqual(mockPayment);
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
      mockPaymentsService.getAllPayments.mockResolvedValue(mockPayments);

      const result = await controller.getAllPayments();

      expect(mockPaymentsService.getAllPayments).toHaveBeenCalled();
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
      mockPaymentsService.getPaymentsByStatus.mockResolvedValue(mockPaidPayments);

      const result = await controller.getPaymentsByStatus('paid');

      expect(mockPaymentsService.getPaymentsByStatus).toHaveBeenCalledWith('paid');
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
      mockPaymentsService.getPaymentsByKeeper.mockResolvedValue(mockKeeperPayments);

      const result = await controller.getPaymentsByKeeper('acct_keeper123');

      expect(mockPaymentsService.getPaymentsByKeeper).toHaveBeenCalledWith('acct_keeper123');
      expect(result).toEqual(mockKeeperPayments);
    });
  });

  describe('createKeeperAccount', () => {
    const createKeeperAccountDto: CreateKeeperAccountDto = {
      email: 'keeper@example.com',
    };

    const mockAccount: Stripe.Account = {
      id: 'acct_keeper123',
      email: 'keeper@example.com',
      type: 'express',
      charges_enabled: false,
      payouts_enabled: false,
    } as Stripe.Account;

    it('should create keeper account successfully', async () => {
      mockPaymentsService.createKeeperAccount.mockResolvedValue(mockAccount);

      const result = await controller.createKeeperAccount(createKeeperAccountDto);

      expect(mockPaymentsService.createKeeperAccount).toHaveBeenCalledWith('keeper@example.com');
      expect(result).toEqual(mockAccount);
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
      mockPaymentsService.createKeeperAccountLink.mockResolvedValue(mockAccountLink);

      const result = await controller.createKeeperAccountLink('acct_keeper123');

      expect(mockPaymentsService.createKeeperAccountLink).toHaveBeenCalledWith('acct_keeper123');
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
      mockPaymentsService.findKeeperAccountByEmail.mockResolvedValue(mockAccount);

      const result = await controller.findKeeperAccountByEmail('keeper@example.com');

      expect(mockPaymentsService.findKeeperAccountByEmail).toHaveBeenCalledWith('keeper@example.com');
      expect(result).toEqual(mockAccount);
    });
  });

  describe('handleOnboardingSuccess', () => {
    const accountId = 'acct_keeper123';

    it('should handle complete onboarding successfully', async () => {
      const mockAccountStatus = {
        isComplete: true,
        account: {
          id: accountId,
          charges_enabled: true,
          payouts_enabled: true,
        },
        status: {
          chargesEnabled: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
        },
      };

      mockPaymentsService.checkKeeperAccountStatus.mockResolvedValue(mockAccountStatus);

      const result = await controller.handleOnboardingSuccess(accountId);

      expect(mockPaymentsService.checkKeeperAccountStatus).toHaveBeenCalledWith(accountId);
      expect(result).toEqual({
        status: 'success',
        message: 'Onboarding complété avec succès',
        deepLink: `keeperApp://onboarding/success?account_id=${accountId}`,
        accountId,
        accountStatus: mockAccountStatus.status,
      });
    });

    it('should handle incomplete onboarding', async () => {
      const mockAccountStatus = {
        isComplete: false,
        account: {
          id: accountId,
          charges_enabled: false,
          payouts_enabled: false,
        },
        status: {
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        },
      };

      mockPaymentsService.checkKeeperAccountStatus.mockResolvedValue(mockAccountStatus);

      const result = await controller.handleOnboardingSuccess(accountId);

      expect(result).toEqual({
        status: 'incomplete',
        message: "L'onboarding n'est pas encore complet",
        deepLink: `keeperapp://onboarding/refresh?account_id=${accountId}`,
        accountId,
        accountStatus: mockAccountStatus.status,
      });
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Account status check failed');
      mockPaymentsService.checkKeeperAccountStatus.mockRejectedValue(serviceError);

      const result = await controller.handleOnboardingSuccess(accountId);

      expect(result).toEqual({
        status: 'error',
        message: 'Erreur lors de la vérification du statut du compte',
        deepLink: `keeperpayment://onboarding/error?account_id=${accountId}`,
        accountId,
        error: 'Account status check failed',
      });
    });
  });

  describe('handleOnboardingRefresh', () => {
    const accountId = 'acct_keeper123';

    it('should return refresh response', async () => {
      const result = await controller.handleOnboardingRefresh(accountId);

      expect(result).toEqual({
        status: 'refresh_needed',
        message: "Veuillez compléter l'onboarding",
        deepLink: `keeperpayment://onboarding/refresh?account_id=${accountId}`,
        accountId,
      });
    });
  });
});
