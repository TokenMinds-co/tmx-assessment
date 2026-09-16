import type { Request } from 'express';
import type { UserRole } from '../generated/prisma/enums';

/** The signed-in staff member. SessionAuthGuard attaches it to the request. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/** Stored on each session so staff can later see where they're signed in. */
export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.get('user-agent')?.slice(0, 512),
  };
}
