import {
  CanActivate,
  ExecutionContext,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashToken } from '../../common/tokens';
import { AttemptStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEADLINE_GRACE_MS,
  INVALID_TAKE_LINK,
  TAKE_LINK_EXPIRED,
} from '../assessments.constants';
import { takeInvitationInclude, type TakeRequest } from '../take.types';

/** The shape of generateToken(): 32 bytes as base64url. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * Candidates have no accounts: the token in their link is their access. This
 * finds the invitation by the token's hash and attaches it to the request.
 * Unknown and revoked links get 404. An expired link gets 410, unless a test
 * is still running, so a candidate who started in time can finish.
 */
@Injectable()
export class InvitationTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<TakeRequest>();
    const token = req.params.token;
    if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
      throw new NotFoundException(INVALID_TAKE_LINK);
    }

    const invitation = await this.prisma.assessmentInvitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: takeInvitationInclude,
    });
    if (!invitation || invitation.revokedAt) {
      throw new NotFoundException(INVALID_TAKE_LINK);
    }

    const now = Date.now();
    const running = invitation.attempts.some(
      (attempt) =>
        attempt.status === AttemptStatus.IN_PROGRESS &&
        attempt.deadlineAt !== null &&
        attempt.deadlineAt.getTime() + DEADLINE_GRACE_MS > now,
    );
    if (invitation.expiresAt.getTime() <= now && !running) {
      throw new GoneException(TAKE_LINK_EXPIRED);
    }

    req.invitation = invitation;
    return true;
  }
}
