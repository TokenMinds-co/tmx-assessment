import type { User } from '../../generated/prisma/client';
import type { UserRole, UserStatus } from '../../generated/prisma/enums';

/** A user as the API returns it. Never includes the password hash. */
export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  status!: UserStatus;
  lastLoginAt!: Date | null;
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

export interface UserEnvelope {
  user: UserResponseDto;
}

export interface InvitationResponse {
  user: UserResponseDto;
  /** When the emailed link stops working. */
  expiresAt: Date;
}
