import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Request } from 'express';
import Stripe from 'stripe';
import { Payments } from './entities/payment.entity';
import { CreateKeeperAccountDto } from '../stripe/dto/create-keeper-account.dto';
import { Logger } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  @Post('webhooks/stripe')
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = request.rawBody;
    if (!event) {
      throw new Error('No event body received');
    }

    try {
      const stripeEvent = JSON.parse(event.toString()) as Stripe.Event;
      await this.paymentsService.handleStripeWebhook(stripeEvent);
      return { received: true };
    } catch (err) {
      throw new Error(`Webhook Error: ${err.message}`);
    }
  }

  @Get(':id')
  async getPaymentById(@Param('id') id: string): Promise<Payments> {
    return this.paymentsService.getPaymentById(id);
  }

  @Get()
  async getAllPayments(): Promise<Payments[]> {
    return this.paymentsService.getAllPayments();
  }

  @Get('status/:status')
  async getPaymentsByStatus(
    @Param('status') status: 'pending' | 'paid' | 'failed' | 'refunded',
  ): Promise<Payments[]> {
    return this.paymentsService.getPaymentsByStatus(status);
  }

  @Get('keeper/:keeperId')
  async getPaymentsByKeeper(
    @Param('keeperId') keeperId: string,
  ): Promise<Payments[]> {
    return this.paymentsService.getPaymentsByKeeper(keeperId);
  }

  @Post('keeper/account')
  async createKeeperAccount(
    @Body() createKeeperAccountDto: CreateKeeperAccountDto,
  ) {
    console.log('compte keeper:', createKeeperAccountDto);
    return this.paymentsService.createKeeperAccount(
      createKeeperAccountDto.email,
    );
  }

  @Get('keeper/account/:accountId/link')
  async createKeeperAccountLink(@Param('accountId') accountId: string) {
    console.log('compte keeper:', accountId);
    return this.paymentsService.createKeeperAccountLink(accountId);
  }

  @Get('keeper/account/email/:email')
  async findKeeperAccountByEmail(@Param('email') email: string) {
    return this.paymentsService.findKeeperAccountByEmail(email);
  }

  @Get('keeper/onboarding/success')
  async handleOnboardingSuccess(@Query('account_id') accountId: string) {
    this.logger.log(
      `Route /payments/keeper/onboarding/success appelée avec account_id: ${accountId}`,
    );
    try {
      const accountStatus = await this.paymentsService.checkKeeperAccountStatus(accountId);
      
      if (accountStatus.isComplete) {
        this.logger.log(`Onboarding complet pour le compte: ${accountId}`);
        return {
          status: 'success',
          message: 'Onboarding complété avec succès',
          deepLink: `keeperApp://onboarding/success?account_id=${accountId}`,
          accountId,
          accountStatus: accountStatus.status
        };
      } else {
        this.logger.log(`Onboarding incomplet pour le compte: ${accountId}`);
        return {
          status: 'incomplete',
          message: "L'onboarding n'est pas encore complet",
          deepLink: `keeperapp://onboarding/refresh?account_id=${accountId}`,
          accountId,
          accountStatus: accountStatus.status
        };
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du statut du compte: ${error.message}`);
      return {
        status: 'error',
        message: 'Erreur lors de la vérification du statut du compte',
        deepLink: `keeperpayment://onboarding/error?account_id=${accountId}`,
        accountId,
        error: error.message
      };
    }
  }

  @Get('keeper/onboarding/refresh')
  async handleOnboardingRefresh(@Query('account_id') accountId: string) {
    this.logger.log(
      `Route /payments/keeper/onboarding/refresh appelée avec account_id: ${accountId}`,
    );
    return {
      status: 'refresh_needed',
      message: "Veuillez compléter l'onboarding",
      deepLink: `keeperpayment://onboarding/refresh?account_id=${accountId}`,
      accountId,
    };
  }
}
