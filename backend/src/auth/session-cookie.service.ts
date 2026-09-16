import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { EnvironmentVariables, NodeEnv } from '../config/env.validation';
import { SESSION_COOKIE_NAME } from './auth.constants';

/** Reads, sets and clears the httpOnly session cookie. */
@Injectable()
export class SessionCookieService {
  private readonly options: CookieOptions;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.options = {
      httpOnly: true,
      secure: config.get('NODE_ENV', { infer: true }) === NodeEnv.Production,
      sameSite: 'lax',
      path: '/',
      domain: config.get('COOKIE_DOMAIN', { infer: true }),
    };
  }

  /**
   * The session token from the cookie. Server-side callers (such as Next.js
   * server components) can send it as `Authorization: Bearer <token>` instead.
   */
  readToken(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const fromCookie = cookies?.[SESSION_COOKIE_NAME];
    if (typeof fromCookie === 'string' && fromCookie !== '') {
      return fromCookie;
    }

    const header = req.get('authorization');
    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim() || undefined;
    }
    return undefined;
  }

  set(res: Response, token: string, expiresAt: Date): void {
    res.cookie(SESSION_COOKIE_NAME, token, {
      ...this.options,
      expires: expiresAt,
    });
  }

  clear(res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, this.options);
  }
}
