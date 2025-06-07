import { Controller, Post, Body, Headers, RawBodyRequest, Req, Get, Param, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Request } from 'express';
import Stripe from 'stripe';
import { Payment } from './entities/payment.entity';
import { CreateKeeperAccountDto } from '../stripe/dto/create-keeper-account.dto';

@Controller('payments')
export class PaymentsController {
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
  async getPaymentById(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.getPaymentById(id);
  }

  @Get()
  async getAllPayments(): Promise<Payment[]> {
    return this.paymentsService.getAllPayments();
  }

  @Get('status/:status')
  async getPaymentsByStatus(
    @Param('status') status: 'pending' | 'paid' | 'failed' | 'refunded',
  ): Promise<Payment[]> {
    return this.paymentsService.getPaymentsByStatus(status);
  }

  @Get('keeper/:keeperId')
  async getPaymentsByKeeper(@Param('keeperId') keeperId: string): Promise<Payment[]> {
    return this.paymentsService.getPaymentsByKeeper(keeperId);
  }

  @Post('keeper/account')
  async createKeeperAccount(@Body() createKeeperAccountDto: CreateKeeperAccountDto) {
    return this.paymentsService.createKeeperAccount(createKeeperAccountDto.email);
  }

  @Get('keeper/account/:accountId/link')
  async createKeeperAccountLink(@Param('accountId') accountId: string) {
    return this.paymentsService.createKeeperAccountLink(accountId);
  }
} 