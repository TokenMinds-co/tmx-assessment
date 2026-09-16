import { applyDecorators } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/error-response.dto';
import { UserRole } from '../../generated/prisma/enums';
import { Roles } from './roles.decorator';

/** Limits a route to admins, and says so in the API docs. */
export const AdminOnly = () =>
  applyDecorators(
    Roles(UserRole.ADMIN),
    ApiForbiddenResponse({
      description: 'Admins only.',
      type: ErrorResponseDto,
    }),
  );
