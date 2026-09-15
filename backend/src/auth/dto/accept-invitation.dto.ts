import { IsEmailToken, IsNewPassword, IsPersonName } from './validators';

export class AcceptInvitationDto {
  @IsEmailToken()
  token!: string;

  @IsNewPassword()
  password!: string;

  /** Lets the new staff member correct the name the admin typed. */
  @IsPersonName({ required: false })
  name?: string;
}
