import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../generated/prisma/enums';
import { IsNormalizedEmail, IsPersonName } from './validators';

export class CreateInvitationDto {
  @IsNormalizedEmail()
  email!: string;

  @IsPersonName()
  name!: string;

  /** Defaults to MEMBER. */
  @IsOptional()
  @IsEnum(UserRole, {
    message: `role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
  role?: UserRole;
}
