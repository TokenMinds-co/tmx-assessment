import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/error-response.dto';
import { SESSION_COOKIE_NAME } from '../auth.constants';

/**
 * Marks a route as needing a session in the API docs. It changes nothing at
 * runtime (SessionAuthGuard does the checking). Put it on a controller whose
 * routes all need a session, or on single routes.
 */
export const ApiSession = () =>
  applyDecorators(
    ApiCookieAuth(SESSION_COOKIE_NAME),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'No session, or it has ended.',
      type: ErrorResponseDto,
    }),
  );
