import { IsExistingPassword, IsNewPassword } from './validators';

export class ChangePasswordDto {
  @IsExistingPassword()
  currentPassword!: string;

  @IsNewPassword()
  newPassword!: string;
}
