import { IsExistingPassword, IsNormalizedEmail } from './validators';

export class LoginDto {
  @IsNormalizedEmail()
  email!: string;

  @IsExistingPassword()
  password!: string;
}
