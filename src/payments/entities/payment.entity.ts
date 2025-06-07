import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reservation_id' })
  reservationId: string;

  @Column({ name: 'stripe_payment_id', nullable: true })
  stripePaymentId: string;

  @Column({ name: 'amount_total' })
  amountTotal: number;

  @Column({ name: 'commission_amount' })
  commissionAmount: number;

  @Column({ name: 'keeper_amount' })
  keeperAmount: number;

  @Column({
    type: 'text',
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  })
  status: 'pending' | 'paid' | 'failed' | 'refunded';

  @Column({ name: 'paid_at', nullable: true })
  paidAt: Date;

  @Column({ name: 'keeper_stripe_account_id', nullable: true })
  keeperStripeAccountId: string;
} 