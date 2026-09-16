import { ApiProperty } from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client';
import { UserRole, UserStatus } from '../../generated/prisma/enums';

/** A user as the API returns it. Never includes the password hash. */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email', example: 'ada@tokenminds.co' })
  email!: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  name!: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status!: UserStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static from(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}

export class UserEnvelopeDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class InvitationResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'When the emailed link stops working.',
  })
  expiresAt!: Date;
}
