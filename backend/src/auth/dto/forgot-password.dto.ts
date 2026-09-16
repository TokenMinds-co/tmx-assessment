import { IsNormalizedEmail } from './validators';

export class ForgotPasswordDto {
  @IsNormalizedEmail()
  email!: string;
}
