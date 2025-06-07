import { IsUUID, IsNumber, Min, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  reservationId: string;

  @IsNumber()
  @Min(0)
  amountTotal: number;

  @IsString()
  keeperId: string;
} 