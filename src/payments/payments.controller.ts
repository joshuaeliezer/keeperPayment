import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateKeeperAccountDto } from '../stripe/dto/create-keeper-account.dto';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    try {
      return await this.paymentsService.createPayment(createPaymentDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la création du paiement',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('webhooks/stripe')
  async handleStripeWebhook(@Body() request: Request & { rawBody: Buffer }) {
    try {
      if (!request.rawBody) {
        throw new Error('No webhook body provided');
      }

      let event;
      try {
        event = JSON.parse(request.rawBody.toString());
      } catch (err) {
        throw new Error('Invalid JSON in webhook body');
      }

      return await this.paymentsService.handleStripeWebhook(event);
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors du traitement du webhook',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  async getPaymentById(@Param('id') id: string) {
    try {
      return await this.paymentsService.getPaymentById(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la récupération du paiement',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get()
  async getAllPayments() {
    try {
      return await this.paymentsService.getAllPayments();
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la récupération des paiements',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status/:status')
  async getPaymentsByStatus(@Param('status') status: 'pending' | 'paid' | 'failed' | 'refunded') {
    try {
      return await this.paymentsService.getPaymentsByStatus(status);
    } catch (error) {
      throw new HttpException(
        error.message ||
          'Erreur lors de la récupération des paiements par statut',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('keeper/:keeperId')
  async getPaymentsByKeeper(@Param('keeperId') keeperId: string) {
    try {
      return await this.paymentsService.getPaymentsByKeeper(keeperId);
    } catch (error) {
      throw new HttpException(
        error.message ||
          'Erreur lors de la récupération des paiements par keeper',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('keeper/account')
  async createKeeperAccount(
    @Body() createKeeperAccountDto: CreateKeeperAccountDto,
  ) {
    try {
      return await this.paymentsService.createKeeperAccount(
        createKeeperAccountDto.email,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la création du compte keeper',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('keeper/account/:id/link')
  async createKeeperAccountLink(@Param('id') accountId: string) {
    try {
      return await this.paymentsService.createKeeperAccountLink(accountId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la création du lien de compte',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('keeper/account/email/:email')
  async findKeeperAccountByEmail(@Param('email') email: string) {
    try {
      return await this.paymentsService.findKeeperAccountByEmail(email);
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la recherche du compte keeper',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('keeper/onboarding/success')
  async handleOnboardingSuccess(@Param('account_id') accountId: string) {
    try {
      const accountStatus =
        await this.paymentsService.checkKeeperAccountStatus(accountId);

      if (accountStatus.isComplete) {
        return {
          status: 'success',
          message: 'Onboarding complété avec succès',
          deepLink: `keeperApp://onboarding/success?account_id=${accountId}`,
          accountId,
          accountStatus: accountStatus.status,
        };
      } else {
        return {
          status: 'incomplete',
          message: "L'onboarding n'est pas encore complet",
          deepLink: `keeperapp://onboarding/refresh?account_id=${accountId}`,
          accountId,
          accountStatus: accountStatus.status,
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'Erreur lors de la vérification du statut du compte',
        deepLink: `keeperpayment://onboarding/error?account_id=${accountId}`,
        accountId,
        error: error.message,
      };
    }
  }

  @Get('keeper/onboarding/refresh')
  async handleOnboardingRefresh(@Param('account_id') accountId: string) {
    return {
      status: 'refresh_needed',
      message: "Veuillez compléter l'onboarding",
      deepLink: `keeperpayment://onboarding/refresh?account_id=${accountId}`,
      accountId,
    };
  }
}
