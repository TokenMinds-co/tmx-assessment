import { IsEmailToken, IsNewPassword } from './validators';

export class ResetPasswordDto {
  @IsEmailToken()
  token!: string;

  @IsNewPassword()
  password!: string;
}
