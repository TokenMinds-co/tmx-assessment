import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { User } from '../generated/prisma/client';
import { AuthTokenType, UserStatus } from '../generated/prisma/enums';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { PASSWORD_RESET_TTL_MS, toMinutes } from './auth.constants';
import { AuthTokensService, INVALID_LINK_MESSAGE } from './auth-tokens.service';
import { RequestMeta } from './auth.types';
import { FRONTEND_ROUTES, frontendLink } from '../common/frontend-links';
import { PasswordService } from './password.service';
import { SessionsService, SignedIn } from './sessions.service';

const INVALID_CREDENTIALS = 'Invalid email or password.';

/** Password sign-in, password changes and password resets. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
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

  async login(
    email: string,
    password: string,
    meta: RequestMeta,
  ): Promise<SignedIn> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      await this.passwords.verifyAgainstDummy(password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    // The account's state is only revealed to someone who knows the password.
    if (user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    await this.sessions.deleteExpiredForUser(user.id);
    const session = await this.sessions.create(user.id, meta);
    const signedIn = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return { user: signedIn, ...session };
  }

  getUser(userId: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  /** Keeps the current session and signs out every other one. */
  async changePassword(
    userId: string,
    currentSessionId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.getUser(userId);
    const matches =
      user.passwordHash !== null &&
      (await this.passwords.verify(user.passwordHash, currentPassword));
    if (!matches) {
      throw new BadRequestException('Current password is incorrect.');
    }
    if (newPassword === currentPassword) {
      throw new BadRequestException(
        'Choose a password that is different from your current one.',
      );
    }

    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      });
      await this.sessions.revokeAllForUser(userId, currentSessionId, tx);
    });
    this.notifyPasswordChanged(user);
  }

  /**
   * Emails a reset link if the address belongs to an active account. It
   * returns straight away and does the work in the background, so neither the
   * response nor its timing shows whether the account exists.
   */
  requestPasswordReset(email: string): void {
    this.sendPasswordReset(email).catch((error: unknown) =>
      this.logger.error('Password reset email failed', errorStack(error)),
    );
  }

  /** Sets a new password from an emailed link and signs out every session. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const passwordHash = await this.passwords.hash(newPassword);
    const user = await this.prisma.$transaction(async (tx) => {
      const owner = await this.tokens.consume(
        token,
        AuthTokenType.PASSWORD_RESET,
        tx,
      );
      if (owner.status !== UserStatus.ACTIVE) {
        throw new BadRequestException(INVALID_LINK_MESSAGE);
      }
      await this.sessions.revokeAllForUser(owner.id, undefined, tx);
      return tx.user.update({
        where: { id: owner.id },
        data: { passwordHash, passwordChangedAt: new Date() },
      });
    });
    this.notifyPasswordChanged(user);
  }

  private async sendPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.status !== UserStatus.ACTIVE) return;

    const { token } = await this.tokens.issue(
      user.id,
      AuthTokenType.PASSWORD_RESET,
      PASSWORD_RESET_TTL_MS,
    );
    await this.mail.sendPasswordReset(user.email, {
      name: user.name,
      resetUrl: frontendLink(
        this.frontendUrl,
        FRONTEND_ROUTES.resetPassword,
        token,
      ),
      expiresInMinutes: toMinutes(PASSWORD_RESET_TTL_MS),
    });
  }

  // A security notice. If it fails, the password change still stands.
  private notifyPasswordChanged(user: User): void {
    this.mail
      .sendPasswordChanged(user.email, { name: user.name })
      .catch((error: unknown) =>
        this.logger.error(
          `Password-changed email to user ${user.id} failed`,
          errorStack(error),
        ),
      );
  }
}

function errorStack(error: unknown): string {
  return error instanceof Error
    ? (error.stack ?? error.message)
    : String(error);
}
