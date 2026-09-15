import { IsOptional } from 'class-validator';
import { IsEmailToken, IsNewPassword, IsPersonName } from './validators';

export class AcceptInvitationDto {
  @IsEmailToken()
  token!: string;

  @IsNewPassword()
  password!: string;

  /** Lets the new staff member correct the name the admin typed. */
  @IsOptional()
  @IsPersonName()
  name?: string;
}
