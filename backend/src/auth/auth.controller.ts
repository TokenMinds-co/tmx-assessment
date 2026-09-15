import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { UserRole } from '../generated/prisma/enums';
import { AuthService } from './auth.service';
import { type AuthUser, requestMeta } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  InvitationResponse,
  UserEnvelope,
  UserResponseDto,
} from './dto/user-response.dto';
import { InvitationsService } from './invitations.service';
import { SessionCookieService } from './session-cookie.service';
import { SessionsService, SignedIn } from './sessions.service';

const MINUTE = 60_000;

/** Staff sign-in, sessions, passwords and invitations. See docs/authentication.md. */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly invitations: InvitationsService,
    private readonly sessions: SessionsService,
    private readonly cookie: SessionCookieService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserEnvelope> {
    const signedIn = await this.auth.login(
      dto.email,
      dto.password,
      requestMeta(req),
    );
    return this.startSession(res, signedIn);
  }

  /** Public, so a stale cookie can always be cleared. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = this.cookie.readToken(req);
    if (token) await this.sessions.revokeByToken(token);
    this.cookie.clear(res);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserEnvelope> {
    return { user: UserResponseDto.from(await this.auth.getUser(user.id)) };
  }

  @Throttle({ default: { limit: 10, ttl: 15 * MINUTE } })
  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(
      user.id,
      user.sessionId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  /** Always 202, whether or not the email has an account. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * MINUTE } })
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() dto: ForgotPasswordDto): void {
    this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 15 * MINUTE } })
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(dto.token, dto.password);
  }

  @Roles(UserRole.ADMIN)
  @Post('invitations')
  async invite(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationResponse> {
    const { user, expiresAt } = await this.invitations.invite(dto, admin);
    return { user: UserResponseDto.from(user), expiresAt };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 15 * MINUTE } })
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserEnvelope> {
    const signedIn = await this.invitations.accept(
      dto.token,
      dto.password,
      dto.name,
      requestMeta(req),
    );
    return this.startSession(res, signedIn);
  }

  private startSession(res: Response, signedIn: SignedIn): UserEnvelope {
    this.cookie.set(res, signedIn.token, signedIn.absoluteExpiresAt);
    return { user: UserResponseDto.from(signedIn.user) };
  }
}
