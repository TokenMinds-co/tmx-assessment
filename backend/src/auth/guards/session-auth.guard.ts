import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SessionCookieService } from '../session-cookie.service';
import { SessionsService } from '../sessions.service';

/**
 * Global guard: every route needs a valid session unless it's marked
 * @Public(). Registered in AuthModule; see docs/authentication.md.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    private readonly cookie: SessionCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<AuthenticatedRequest>();

    const token = this.cookie.readToken(req);
    if (!token) throw new UnauthorizedException('Sign in to continue.');

    const result = await this.sessions.validate(token);
    if (!result) {
      // Drop the dead cookie so the browser stops looking signed in.
      this.cookie.clear(http.getResponse<Response>());
      throw new UnauthorizedException('Your session has ended. Sign in again.');
    }

    const { session, user } = result;
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionId: session.id,
    };
    return true;
  }
}
