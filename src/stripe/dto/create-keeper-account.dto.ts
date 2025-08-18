import { IsEmail } from 'class-validator';

export class CreateKeeperAccountDto {
  @IsEmail()
  email: string;
}
