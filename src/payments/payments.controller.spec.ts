import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateKeeperAccountDto } from '../stripe/dto/create-keeper-account.dto';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPaymentsService = {
    createPayment: jest.fn(),
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
    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const createPaymentDto: CreatePaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_keeper123',
      };

      const expectedResult = {
        clientSecret: 'pi_test123_secret',
        paymentId: 'pay_123',
      };

      mockPaymentsService.createPayment.mockResolvedValue(expectedResult);

      const result = await controller.createPayment(createPaymentDto);

      expect(service.createPayment).toHaveBeenCalledWith(createPaymentDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle errors when creating payment', async () => {
      const createPaymentDto: CreatePaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_keeper123',
      };

      const error = new Error('Stripe API error');
      mockPaymentsService.createPayment.mockRejectedValue(error);

      await expect(controller.createPayment(createPaymentDto)).rejects.toThrow(
        HttpException,
      );

      try {
        await controller.createPayment(createPaymentDto);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(e.message).toBe('Stripe API error');
      }
    });

    it('should handle errors with default message when creating payment', async () => {
      const createPaymentDto: CreatePaymentDto = {
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        keeperId: 'acct_keeper123',
      };

      const error = new Error();
      mockPaymentsService.createPayment.mockRejectedValue(error);

      try {
        await controller.createPayment(createPaymentDto);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(e.message).toBe('Erreur lors de la création du paiement');
      }
    });
  });

  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      const paymentId = 'pay_123';
      const expectedPayment = {
        id: paymentId,
        reservationId: '123e4567-e89b-12d3-a456-426614174000',
        amountTotal: 1000,
        status: 'paid',
      };

      mockPaymentsService.getPaymentById.mockResolvedValue(expectedPayment);

      const result = await controller.getPaymentById(paymentId);

      expect(service.getPaymentById).toHaveBeenCalledWith(paymentId);
      expect(result).toEqual(expectedPayment);
    });

    it('should handle errors when getting payment by id', async () => {
      const paymentId = 'pay_123';
      const error = new Error('Payment not found');
      mockPaymentsService.getPaymentById.mockRejectedValue(error);

      try {
        await controller.getPaymentById(paymentId);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(e.message).toBe('Payment not found');
      }
    });

    it('should handle errors with default message when getting payment by id', async () => {
      const paymentId = 'pay_123';
      const error = new Error();
      mockPaymentsService.getPaymentById.mockRejectedValue(error);

      try {
        await controller.getPaymentById(paymentId);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(e.message).toBe('Erreur lors de la récupération du paiement');
      }
    });
  });

  describe('getAllPayments', () => {
    it('should return all payments', async () => {
      const expectedPayments = [
        {
          id: 'pay_123',
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          status: 'paid',
        },
      ];

      mockPaymentsService.getAllPayments.mockResolvedValue(expectedPayments);

      const result = await controller.getAllPayments();

      expect(service.getAllPayments).toHaveBeenCalled();
      expect(result).toEqual(expectedPayments);
    });

    it('should handle errors when getting all payments', async () => {
      const error = new Error('Database error');
      mockPaymentsService.getAllPayments.mockRejectedValue(error);

      try {
        await controller.getAllPayments();
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.message).toBe('Database error');
      }
    });

    it('should handle errors with default message when getting all payments', async () => {
      const error = new Error();
      mockPaymentsService.getAllPayments.mockRejectedValue(error);

      try {
        await controller.getAllPayments();
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.message).toBe('Erreur lors de la récupération des paiements');
      }
    });
  });

  describe('getPaymentsByStatus', () => {
    it('should return payments by status', async () => {
      const status = 'paid';
      const expectedPayments = [
        {
          id: 'pay_123',
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          status: 'paid',
        },
      ];

      mockPaymentsService.getPaymentsByStatus.mockResolvedValue(
        expectedPayments,
      );

      const result = await controller.getPaymentsByStatus(status);

      expect(service.getPaymentsByStatus).toHaveBeenCalledWith(status);
      expect(result).toEqual(expectedPayments);
    });

    it('should handle errors when getting payments by status', async () => {
      const status = 'paid';
      const error = new Error('Database error');
      mockPaymentsService.getPaymentsByStatus.mockRejectedValue(error);

      try {
        await controller.getPaymentsByStatus(status);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.message).toBe('Database error');
      }
    });

    it('should handle errors with default message when getting payments by status', async () => {
      const status = 'paid';
      const error = new Error();
      mockPaymentsService.getPaymentsByStatus.mockRejectedValue(error);

      try {
        await controller.getPaymentsByStatus(status);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.message).toBe(
          'Erreur lors de la récupération des paiements par statut',
        );
      }
    });
  });

  describe('getPaymentsByKeeper', () => {
    it('should return payments by keeper', async () => {
      const keeperId = 'acct_keeper123';
      const expectedPayments = [
        {
          id: 'pay_123',
          reservationId: '123e4567-e89b-12d3-a456-426614174000',
          amountTotal: 1000,
          status: 'paid',
          keeperStripeAccountId: keeperId,
        },
      ];

      mockPaymentsService.getPaymentsByKeeper.mockResolvedValue(
        expectedPayments,
      );

      const result = await controller.getPaymentsByKeeper(keeperId);

      expect(service.getPaymentsByKeeper).toHaveBeenCalledWith(keeperId);
      expect(result).toEqual(expectedPayments);
    });

    it('should handle errors when getting payments by keeper', async () => {
      const keeperId = 'acct_keeper123';
      const error = new Error('Database error');
      mockPaymentsService.getPaymentsByKeeper.mockRejectedValue(error);

      try {
        await controller.getPaymentsByKeeper(keeperId);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.message).toBe('Database error');
      }
    });

    it('should handle errors with default message when getting payments by keeper', async () => {
      const keeperId = 'acct_keeper123';
      const error = new Error();
      mockPaymentsService.getPaymentsByKeeper.mockRejectedValue(error);

      try {
        await controller.getPaymentsByKeeper(keeperId);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.message).toBe(
          'Erreur lors de la récupération des paiements par keeper',
        );
      }
    });
  });

  describe('createKeeperAccount', () => {
    it('should create a keeper account successfully', async () => {
      const createKeeperAccountDto: CreateKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      const expectedAccount = {
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
      };

      mockPaymentsService.createKeeperAccount.mockResolvedValue(
        expectedAccount,
      );

      const result = await controller.createKeeperAccount(
        createKeeperAccountDto,
      );

      expect(service.createKeeperAccount).toHaveBeenCalledWith(
        createKeeperAccountDto.email,
      );
      expect(result).toEqual(expectedAccount);
    });

    it('should handle errors when creating keeper account', async () => {
      const createKeeperAccountDto: CreateKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      const error = new Error('Stripe error');
      mockPaymentsService.createKeeperAccount.mockRejectedValue(error);

      try {
        await controller.createKeeperAccount(createKeeperAccountDto);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(e.message).toBe('Stripe error');
      }
    });

    it('should handle errors with default message when creating keeper account', async () => {
      const createKeeperAccountDto: CreateKeeperAccountDto = {
        email: 'keeper@example.com',
      };

      const error = new Error();
      mockPaymentsService.createKeeperAccount.mockRejectedValue(error);

      try {
        await controller.createKeeperAccount(createKeeperAccountDto);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(e.message).toBe('Erreur lors de la création du compte keeper');
      }
    });
  });

  describe('createKeeperAccountLink', () => {
    it('should create a keeper account link successfully', async () => {
      const accountId = 'acct_keeper123';
      const expectedAccountLink = {
        id: 'acctlink_test123',
        url: 'https://connect.stripe.com/setup/s/test',
      };

      mockPaymentsService.createKeeperAccountLink.mockResolvedValue(
        expectedAccountLink,
      );

      const result = await controller.createKeeperAccountLink(accountId);

      expect(service.createKeeperAccountLink).toHaveBeenCalledWith(accountId);
      expect(result).toEqual(expectedAccountLink);
    });

    it('should handle errors when creating keeper account link', async () => {
      const accountId = 'acct_keeper123';
      const error = new Error('Stripe error');
      mockPaymentsService.createKeeperAccountLink.mockRejectedValue(error);

      try {
        await controller.createKeeperAccountLink(accountId);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.message).toBe('Stripe error');
      }
    });

    it('should handle errors with default message when creating keeper account link', async () => {
      const accountId = 'acct_keeper123';
      const error = new Error();
      mockPaymentsService.createKeeperAccountLink.mockRejectedValue(error);

      try {
        await controller.createKeeperAccountLink(accountId);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.message).toBe('Erreur lors de la création du lien de compte');
      }
    });
  });

  describe('findKeeperAccountByEmail', () => {
    it('should find keeper account by email successfully', async () => {
      const email = 'keeper@example.com';
      const expectedAccount = {
        id: 'acct_keeper123',
        email: 'keeper@example.com',
        type: 'express',
      };

      mockPaymentsService.findKeeperAccountByEmail.mockResolvedValue(
        expectedAccount,
      );

      const result = await controller.findKeeperAccountByEmail(email);

      expect(service.findKeeperAccountByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(expectedAccount);
    });

    it('should handle errors when finding keeper account by email', async () => {
      const email = 'keeper@example.com';
      const error = new Error('Stripe error');
      mockPaymentsService.findKeeperAccountByEmail.mockRejectedValue(error);

      try {
        await controller.findKeeperAccountByEmail(email);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.message).toBe('Stripe error');
      }
    });

    it('should handle errors with default message when finding keeper account by email', async () => {
      const email = 'keeper@example.com';
      const error = new Error();
      mockPaymentsService.findKeeperAccountByEmail.mockRejectedValue(error);

      try {
        await controller.findKeeperAccountByEmail(email);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(e.message).toBe('Erreur lors de la recherche du compte keeper');
      }
    });
  });

  describe('handleOnboardingSuccess', () => {
    it('should handle successful onboarding completion', async () => {
      const accountId = 'acct_keeper123';
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

      mockPaymentsService.checkKeeperAccountStatus.mockResolvedValue(
        mockAccountStatus,
      );

      const result = await controller.handleOnboardingSuccess(accountId);

      expect(service.checkKeeperAccountStatus).toHaveBeenCalledWith(accountId);
      expect(result).toEqual({
        status: 'success',
        message: 'Onboarding complété avec succès',
        deepLink: `keeperApp://onboarding/success?account_id=${accountId}`,
        accountId,
        accountStatus: mockAccountStatus.status,
      });
    });

    it('should handle incomplete onboarding', async () => {
      const accountId = 'acct_keeper123';
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

      mockPaymentsService.checkKeeperAccountStatus.mockResolvedValue(
        mockAccountStatus,
      );

      const result = await controller.handleOnboardingSuccess(accountId);

      expect(service.checkKeeperAccountStatus).toHaveBeenCalledWith(accountId);
      expect(result).toEqual({
        status: 'incomplete',
        message: "L'onboarding n'est pas encore complet",
        deepLink: `keeperapp://onboarding/refresh?account_id=${accountId}`,
        accountId,
        accountStatus: mockAccountStatus.status,
      });
    });

    it('should handle errors during onboarding success check', async () => {
      const accountId = 'acct_keeper123';
      const error = new Error('Stripe error');

      mockPaymentsService.checkKeeperAccountStatus.mockRejectedValue(error);

      const result = await controller.handleOnboardingSuccess(accountId);

      expect(service.checkKeeperAccountStatus).toHaveBeenCalledWith(accountId);
      expect(result).toEqual({
        status: 'error',
        message: 'Erreur lors de la vérification du statut du compte',
        deepLink: `keeperpayment://onboarding/error?account_id=${accountId}`,
        accountId,
        error: error.message,
      });
    });
  });

  describe('handleOnboardingRefresh', () => {
    it('should return refresh response', async () => {
      const accountId = 'acct_keeper123';

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
