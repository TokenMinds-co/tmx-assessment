import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TakeInvitation, TakeRequest } from '../take.types';

/** The invitation behind a candidate link. Needs InvitationTokenGuard on the route. */
export const CurrentInvitation = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TakeInvitation => {
    const { invitation } = ctx.switchToHttp().getRequest<TakeRequest>();
    if (!invitation) {
      throw new Error(
        '@CurrentInvitation() was used on a route without InvitationTokenGuard.',
      );
    }
    return invitation;
  },
);
