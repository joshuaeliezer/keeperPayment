import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payments } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
  RmqOptions,
} from '@nestjs/microservices';
import { StripeService } from '../stripe/stripe.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly client: ClientProxy;

  constructor(
    @InjectRepository(Payments)
    private paymentsRepository: Repository<Payments>,
    private configService: ConfigService,
    private stripeService: StripeService,
  ) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [this.configService.get('RABBITMQ_URL')],
        queue: 'payment_notifications',
        queueOptions: {
          durable: true,
        },
        noAck: false,
        prefetchCount: 1,
      },
    } as RmqOptions);
  }

  async createPayment(createPaymentDto: CreatePaymentDto) {
    const { reservationId, amountTotal, keeperId } = createPaymentDto;

    const paymentIntent = await this.stripeService.createPaymentIntent(
      amountTotal,
      'eur',
      keeperId,
    );

    const payment = this.paymentsRepository.create({
      reservationId,
      stripePaymentId: paymentIntent.id,
      amountTotal,
      commissionAmount: Math.round(amountTotal * 0.1), // 10% commission
      keeperAmount: amountTotal - Math.round(amountTotal * 0.1),
      status: 'pending',
      keeperStripeAccountId: keeperId,
    });

    await this.paymentsRepository.save(payment);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  }

  async getPaymentById(id: string): Promise<Payments> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async getAllPayments(): Promise<Payments[]> {
    return this.paymentsRepository.find();
  }

  async getPaymentsByStatus(
    status: 'pending' | 'paid' | 'failed' | 'refunded',
  ): Promise<Payments[]> {
    return this.paymentsRepository.find({
      where: { status },
    });
  }

  async getPaymentsByKeeper(keeperId: string): Promise<Payments[]> {
    return this.paymentsRepository.find({
      where: { keeperStripeAccountId: keeperId },
    });
  }

  async createKeeperAccount(email: string): Promise<Stripe.Account> {
    this.logger.log(`Création du compte keeper pour l'email: ${email}`);
    try {
      const account = await this.stripeService.createKeeperAccount(email);
      this.logger.log(`Compte keeper créé avec succès - ID: ${account.id}`);
      return account;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la création du compte keeper: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createKeeperAccountLink(
    accountId: string,
  ): Promise<Stripe.AccountLink> {
    return this.stripeService.createAccountLink(accountId);
  }

  async findKeeperAccountByEmail(email: string) {
    return this.stripeService.findAccountByEmail(email);
  }

  async checkKeeperAccountStatus(accountId: string) {
    try {
      const account = await this.stripeService.retrieveAccount(accountId);
      const isOnboardingComplete =
        account.charges_enabled && account.payouts_enabled;

      return {
        isComplete: isOnboardingComplete,
        account,
        status: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        },
      };
    } catch (error) {
      this.logger.error(
        `Erreur lors de la vérification du statut du compte: ${error.message}`,
      );
      throw error;
    }
  }
}
