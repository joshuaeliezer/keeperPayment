import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly commissionRate = 0.1; // 10% de commission
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
    
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });
  }

  // Méthode pour les tests - permet d'injecter une instance Stripe mockée
  setStripeInstance(stripeInstance: Stripe) {
    this.stripe = stripeInstance;
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
    const apiUrl = this.configService.get<string>('API_URL');
    if (!apiUrl) {
      throw new Error('API_URL is not defined in environment variables');
    }

    // S'assurer que l'URL de base ne se termine pas par un slash
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    
    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/payments/keeper/onboarding/refresh?account_id=${accountId}`,
      return_url: `${baseUrl}/payments/keeper/onboarding/success?account_id=${accountId}`,
      type: 'account_onboarding',
    });

    return accountLink;
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

  async findAccountByEmail(email: string): Promise<Stripe.Account | null> {
    const accounts = await this.stripe.accounts.list({
      limit: 100,
    });

    return accounts.data.find(account => account.email === email) || null;
  }

  async retrieveAccount(accountId: string): Promise<Stripe.Account> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      this.logger.log(`Compte Stripe récupéré avec succès - ID: ${accountId}`);
      return account;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du compte Stripe: ${error.message}`);
      throw error;
    }
  }
} 