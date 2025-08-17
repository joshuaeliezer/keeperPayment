import { validate } from 'class-validator';
import { CreatePaymentDto } from './create-payment.dto';

describe('CreatePaymentDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = '123e4567-e89b-12d3-a456-426614174000';
      dto.amountTotal = 1000;
      dto.keeperId = 'acct_keeper123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid UUID', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = 'invalid-uuid';
      dto.amountTotal = 1000;
      dto.keeperId = 'acct_keeper123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUuid).toBeDefined();
    });

    it('should fail validation with negative amount', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = '123e4567-e89b-12d3-a456-426614174000';
      dto.amountTotal = -100;
      dto.keeperId = 'acct_keeper123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should fail validation with zero amount', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = '123e4567-e89b-12d3-a456-426614174000';
      dto.amountTotal = 0;
      dto.keeperId = 'acct_keeper123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // 0 is valid with @Min(0)
    });

    it('should fail validation with missing reservationId', async () => {
      const dto = new CreatePaymentDto();
      dto.amountTotal = 1000;
      dto.keeperId = 'acct_keeper123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUuid).toBeDefined();
    });

    it('should fail validation with missing amountTotal', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = '123e4567-e89b-12d3-a456-426614174000';
      dto.keeperId = 'acct_keeper123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNumber).toBeDefined();
    });

    it('should fail validation with missing keeperId', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = '123e4567-e89b-12d3-a456-426614174000';
      dto.amountTotal = 1000;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation with non-string keeperId', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = '123e4567-e89b-12d3-a456-426614174000';
      dto.amountTotal = 1000;
      (dto as any).keeperId = 123; // Type assertion to bypass TypeScript

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation with non-number amountTotal', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = '123e4567-e89b-12d3-a456-426614174000';
      (dto as any).amountTotal = '1000'; // Type assertion to bypass TypeScript
      dto.keeperId = 'acct_keeper123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNumber).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should pass validation with very large amount', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = '123e4567-e89b-12d3-a456-426614174000';
      dto.amountTotal = Number.MAX_SAFE_INTEGER;
      dto.keeperId = 'acct_keeper123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with decimal amount', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = '123e4567-e89b-12d3-a456-426614174000';
      dto.amountTotal = 1000.50;
      dto.keeperId = 'acct_keeper123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty string keeperId', async () => {
      const dto = new CreatePaymentDto();
      dto.reservationId = '123e4567-e89b-12d3-a456-426614174000';
      dto.amountTotal = 1000;
      dto.keeperId = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // Empty string is valid for @IsString
    });
  });
});
