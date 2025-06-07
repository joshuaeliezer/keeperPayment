import { IsEmail, IsString } from 'class-validator';

export class CreateKeeperAccountDto {
  @IsEmail()
  email: string;
} 