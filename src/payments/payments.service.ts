import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport, RmqOptions } from '@nestjs/microservices';
import { StripeService } from '../stripe/stripe.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly client: ClientProxy;

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
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
      commissionAmount: Math.round(amountTotal * 0.10), // 10% commission
      keeperAmount: amountTotal - Math.round(amountTotal * 0.10),
      status: 'pending',
      keeperStripeAccountId: keeperId,
    });

    await this.paymentsRepository.save(payment);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  }

  async handleStripeWebhook(event: Stripe.Event) {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const payment = await this.paymentsRepository.findOne({
        where: { stripePaymentId: paymentIntent.id },
      });

      if (payment) {
        payment.status = 'paid';
        payment.paidAt = new Date();
        await this.paymentsRepository.save(payment);

        // Le transfert est déjà géré par Stripe via le payment intent
        // avec application_fee_amount et transfer_data

        // Notify the main application
        await this.client.emit('payment.succeeded', {
          paymentId: payment.id,
          reservationId: payment.reservationId,
          amountTotal: payment.amountTotal,
          keeperAmount: payment.keeperAmount,
          commissionAmount: payment.commissionAmount,
        });
      }
    }
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async getAllPayments(): Promise<Payment[]> {
    return this.paymentsRepository.find();
  }

  async getPaymentsByStatus(status: 'pending' | 'paid' | 'failed' | 'refunded'): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { status },
    });
  }

  async getPaymentsByKeeper(keeperId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { keeperStripeAccountId: keeperId },
    });
  }

  async createKeeperAccount(email: string): Promise<Stripe.Account> {
    return this.stripeService.createKeeperAccount(email);
  }

  async createKeeperAccountLink(accountId: string): Promise<Stripe.AccountLink> {
    return this.stripeService.createAccountLink(accountId);
  }
} 