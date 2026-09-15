import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthUser } from '../auth.types';

/** The signed-in staff member. Only works on routes that need a session. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const { user } = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new Error(
        '@CurrentUser() was used on a route without a session. Is it marked @Public()?',
      );
    }
    return user;
  },
);
