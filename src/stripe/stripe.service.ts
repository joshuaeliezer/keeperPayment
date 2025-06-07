import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly commissionRate = 0.1; // 10% de commission

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2023-10-16',
      },
    );
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    keeperId: string,
  ): Promise<Stripe.PaymentIntent> {
    const commission = Math.round(amount * this.commissionRate);

    return this.stripe.paymentIntents.create({
      amount,
      currency,
      application_fee_amount: commission,
      transfer_data: {
        destination: keeperId,
      },
    });
  }

  async createKeeperAccount(email: string): Promise<Stripe.Account> {
    return this.stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
  }

  async createAccountLink(accountId: string): Promise<Stripe.AccountLink> {
    return this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: this.configService.get<string>('STRIPE_REFRESH_URL'),
      return_url: this.configService.get<string>('STRIPE_RETURN_URL'),
      type: 'account_onboarding',
    });
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
} 