import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { User } from '../generated/prisma/client';
import { AuthTokenType, UserRole, UserStatus } from '../generated/prisma/enums';
import { MailService } from '../mail/mail.service';
import { isUniqueViolation } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { INVITATION_TTL_MS, toDays } from './auth.constants';
import { AuthTokensService, INVALID_LINK_MESSAGE } from './auth-tokens.service';
import { RequestMeta } from './auth.types';
import { FRONTEND_ROUTES, frontendLink } from '../common/frontend-links';
import { PasswordService } from './password.service';
import { SessionsService, SignedIn } from './sessions.service';

export interface InvitationInput {
  email: string;
  name: string;
  role?: UserRole;
}

export interface Inviter {
  id: string;
  name: string;
}

export interface CreatedInvitation {
  user: User;
  /** The link in the email. The CLI prints it; the API never returns it. */
  acceptUrl: string;
  expiresAt: Date;
}

const ALREADY_EXISTS = 'A user with this email already exists.';

/**
 * Staff accounts are invite-only: an admin invites someone by email, and they
 * set their own password from the link.
 */
@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly tokens: AuthTokensService,
    private readonly mail: MailService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.frontendUrl = config.get('FRONTEND_URL', { infer: true });
  }

  /** Saves the invitation and emails it. */
  async invite(
    input: InvitationInput,
    invitedBy: Inviter | null,
  ): Promise<CreatedInvitation> {
    const invitation = await this.create(input, invitedBy?.id ?? null);
    try {
      await this.send(invitation, invitedBy?.name);
    } catch (error) {
      this.logger.error(
        `Invitation email to user ${invitation.user.id} failed`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'The invitation was saved, but the email could not be sent. Invite the same email again to retry.',
      );
    }
    return invitation;
  }

  /**
   * Saves an invitation for a new user. For someone who was invited but
   * hasn't accepted yet, it issues a fresh link and the old one stops working.
   */
  async create(
    input: InvitationInput,
    invitedById: string | null,
  ): Promise<CreatedInvitation> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing && existing.status !== UserStatus.INVITED) {
      throw new ConflictException(ALREADY_EXISTS);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const details = {
          name: input.name,
          role: input.role ?? UserRole.MEMBER,
          invitedById,
        };
        const user = existing
          ? await tx.user.update({ where: { id: existing.id }, data: details })
          : await tx.user.create({
              data: {
                ...details,
                email: input.email,
                status: UserStatus.INVITED,
              },
            });
        const { token, expiresAt } = await this.tokens.issue(
          user.id,
          AuthTokenType.INVITATION,
          INVITATION_TTL_MS,
          tx,
        );
        const acceptUrl = frontendLink(
          this.frontendUrl,
          FRONTEND_ROUTES.acceptInvitation,
          token,
        );
        return { user, acceptUrl, expiresAt };
      });
    } catch (error) {
      // Another request invited the same email at the same moment.
      if (isUniqueViolation(error)) throw new ConflictException(ALREADY_EXISTS);
      throw error;
    }
  }

  send(invitation: CreatedInvitation, invitedByName?: string): Promise<void> {
    return this.mail.sendInvitation(invitation.user.email, {
      name: invitation.user.name,
      invitedByName,
      acceptUrl: invitation.acceptUrl,
      expiresInDays: toDays(INVITATION_TTL_MS),
    });
  }

  /** Sets the invitee's password, activates the account and signs them in. */
  async accept(
    token: string,
    password: string,
    name: string | undefined,
    meta: RequestMeta,
  ): Promise<SignedIn> {
    const passwordHash = await this.passwords.hash(password);
    const user = await this.prisma.$transaction(async (tx) => {
      const invitee = await this.tokens.consume(
        token,
        AuthTokenType.INVITATION,
        tx,
      );
      if (invitee.status !== UserStatus.INVITED) {
        throw new BadRequestException(INVALID_LINK_MESSAGE);
      }
      const now = new Date();
      return tx.user.update({
        where: { id: invitee.id },
        data: {
          passwordHash,
          passwordChangedAt: now,
          lastLoginAt: now,
          status: UserStatus.ACTIVE,
          ...(name ? { name } : {}),
        },
      });
    });

    const session = await this.sessions.create(user.id, meta);
    return { user, ...session };
  }
}
