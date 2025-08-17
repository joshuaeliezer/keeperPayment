import { validate } from 'class-validator';
import { CreateKeeperAccountDto } from './create-keeper-account.dto';

describe('CreateKeeperAccountDto', () => {
  describe('validation', () => {
    it('should pass validation with valid email', async () => {
      const dto = new CreateKeeperAccountDto();
      dto.email = 'keeper@example.com';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid email format', async () => {
      const dto = new CreateKeeperAccountDto();
      dto.email = 'invalid-email';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEmail).toBeDefined();
    });

    it('should fail validation with missing email', async () => {
      const dto = new CreateKeeperAccountDto();

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEmail).toBeDefined();
    });

    it('should fail validation with empty email', async () => {
      const dto = new CreateKeeperAccountDto();
      dto.email = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEmail).toBeDefined();
    });

    it('should fail validation with non-string email', async () => {
      const dto = new CreateKeeperAccountDto();
      (dto as any).email = 123; // Type assertion to bypass TypeScript

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEmail).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should pass validation with complex email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        '123@numbers.com',
        'user@subdomain.example.com',
        'user@example-domain.com',
      ];

      for (const email of validEmails) {
        const dto = new CreateKeeperAccountDto();
        dto.email = email;

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should fail validation with invalid email formats', async () => {
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'spaces @example.com',
        'multiple@@example.com',
        'user@',
        '.user@example.com',
        'user.@example.com',
      ];

      for (const email of invalidEmails) {
        const dto = new CreateKeeperAccountDto();
        dto.email = email;

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.isEmail).toBeDefined();
      }
    });

    it('should pass validation with very long but valid email', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      const dto = new CreateKeeperAccountDto();
      dto.email = longEmail;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
