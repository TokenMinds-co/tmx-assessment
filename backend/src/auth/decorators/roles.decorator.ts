import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../generated/prisma/enums';

export const ROLES_KEY = 'roles';

/** Limits a route to staff with one of these roles. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
