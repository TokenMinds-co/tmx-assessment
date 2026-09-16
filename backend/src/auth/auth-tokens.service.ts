import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, User } from '../generated/prisma/client';
import { AuthTokenType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { generateToken, hashToken } from '../common/tokens';

export const INVALID_LINK_MESSAGE = 'This link is invalid or has expired.';

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

/**
 * Single-use tokens sent by email: invitations and password resets. A user has
 * at most one token of each type; issuing a new one cancels the old one.
 */
@Injectable()
export class AuthTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(
    userId: string,
    type: AuthTokenType,
    ttlMs: number,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<IssuedToken> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + ttlMs);

    await db.authToken.deleteMany({ where: { userId, type } });
    await db.authToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt },
    });
    return { token, expiresAt };
  }

  /**
   * Marks the token used and returns its user, or throws if the token is
   * unknown, expired or already used. Call it inside the transaction that acts
   * on the token, so a failure later in that transaction un-uses it.
   */
  async consume(
    token: string,
    type: AuthTokenType,
    db: Prisma.TransactionClient,
  ): Promise<User> {
    const tokenHash = hashToken(token);
    const now = new Date();

    // A single conditional update, so two requests with one token can't both win.
    const { count } = await db.authToken.updateMany({
      where: { tokenHash, type, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count !== 1) throw new BadRequestException(INVALID_LINK_MESSAGE);

    const record = await db.authToken.findUniqueOrThrow({
      where: { tokenHash },
      include: { user: true },
    });
    return record.user;
  }
}
