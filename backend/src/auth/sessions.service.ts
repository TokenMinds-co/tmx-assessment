import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { Prisma, Session, User } from '../generated/prisma/client';
import { UserStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_RENEW_INTERVAL_MS,
} from './auth.constants';
import { RequestMeta } from './auth.types';
import { generateToken, hashToken } from './tokens';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface IssuedSession {
  /** Goes in the cookie. Only its hash is stored. */
  token: string;
  /** The latest the session can last. The cookie expires at this time. */
  absoluteExpiresAt: Date;
}

export interface SignedIn extends IssuedSession {
  user: User;
}

export interface ValidSession {
  session: Session;
  user: User;
}

/**
 * Server-side sessions. The browser holds a random token in an httpOnly
 * cookie and the database holds its hash, so a session can be ended at once:
 * on sign-out, password change or deactivation.
 */
@Injectable()
export class SessionsService {
  private readonly idleTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.idleTtlMs = config.get('SESSION_TTL_DAYS', { infer: true }) * DAY_MS;
  }

  async create(userId: string, meta: RequestMeta): Promise<IssuedSession> {
    const now = new Date();
    const token = generateToken();
    const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS);

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: this.idleExpiry(now, absoluteExpiresAt),
        lastUsedAt: now,
        createdAt: now,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
    return { token, absoluteExpiresAt };
  }

  /**
   * The session and its user, or null when the token is unknown or expired,
   * or the user can no longer sign in. Pushes the idle expiry forward.
   */
  async validate(token: string): Promise<ValidSession | null> {
    const found = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!found) return null;

    const { user, ...session } = found;
    const now = new Date();
    if (session.expiresAt <= now) {
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }
    if (user.status !== UserStatus.ACTIVE) return null;

    const sinceLastUse = now.getTime() - session.lastUsedAt.getTime();
    if (sinceLastUse < SESSION_RENEW_INTERVAL_MS) return { session, user };

    const absoluteExpiresAt = new Date(
      session.createdAt.getTime() + SESSION_ABSOLUTE_TTL_MS,
    );
    const expiresAt = this.idleExpiry(now, absoluteExpiresAt);
    const { count } = await this.prisma.session.updateMany({
      where: { id: session.id },
      data: { lastUsedAt: now, expiresAt },
    });
    // Zero means the session was signed out while this request was running.
    if (count === 0) return null;
    return { session: { ...session, lastUsedAt: now, expiresAt }, user };
  }

  async revokeByToken(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  /** Signs the user out everywhere, except in `keepSessionId` if given. */
  async revokeAllForUser(
    userId: string,
    keepSessionId?: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await db.session.deleteMany({
      where: {
        userId,
        ...(keepSessionId ? { id: { not: keepSessionId } } : {}),
      },
    });
  }

  async deleteExpiredForUser(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
  }

  private idleExpiry(now: Date, absoluteExpiresAt: Date): Date {
    return new Date(
      Math.min(now.getTime() + this.idleTtlMs, absoluteExpiresAt.getTime()),
    );
  }
}
