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
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ErrorResponseDto } from '../common/error-response.dto';
import { UserRole } from '../generated/prisma/enums';
import { AuthService } from './auth.service';
import { type AuthUser, requestMeta } from './auth.types';
import { ApiSession } from './decorators/api-session.decorator';
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
  InvitationResponseDto,
  UserEnvelopeDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { InvitationsService } from './invitations.service';
import { SessionCookieService } from './session-cookie.service';
import { SessionsService, SignedIn } from './sessions.service';

const MINUTE = 60_000;

/** Staff sign-in, sessions, passwords and invitations. See docs/authentication.md. */
@ApiTags('auth')
@ApiBadRequestResponse({
  description: 'The body failed validation.',
  type: ErrorResponseDto,
})
@ApiTooManyRequestsResponse({ description: 'Rate limit hit for this IP.' })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly invitations: InvitationsService,
    private readonly sessions: SessionsService,
    private readonly cookie: SessionCookieService,
  ) {}

  @ApiOperation({
    summary: 'Sign in',
    description: 'Sets the httpOnly session cookie. 10 attempts a minute.',
  })
  @ApiOkResponse({ type: UserEnvelopeDto })
  @ApiUnauthorizedResponse({
    description: 'Wrong email or password. The message is the same for both.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'The account has been deactivated.',
    type: ErrorResponseDto,
  })
  @Public()
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserEnvelopeDto> {
    const signedIn = await this.auth.login(
      dto.email,
      dto.password,
      requestMeta(req),
    );
    return this.startSession(res, signedIn);
  }

  /** Public, so a stale cookie can always be cleared. */
  @ApiOperation({
    summary: 'Sign out',
    description:
      'Ends the session and clears the cookie, even if the session has already ended.',
  })
  @ApiNoContentResponse()
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

  @ApiOperation({ summary: 'The signed-in user' })
  @ApiSession()
  @ApiOkResponse({ type: UserEnvelopeDto })
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserEnvelopeDto> {
    return { user: UserResponseDto.from(await this.auth.getUser(user.id)) };
  }

  @ApiOperation({
    summary: 'Change password',
    description:
      'Keeps this session and signs out every other one. 10 attempts per 15 minutes.',
  })
  @ApiSession()
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    description:
      'The current password is wrong, the new one is too short, or they are the same.',
    type: ErrorResponseDto,
  })
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

  @ApiOperation({
    summary: 'Email a password reset link',
    description:
      'Always 202, whether or not the account exists. 5 requests per 15 minutes.',
  })
  @ApiAcceptedResponse()
  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * MINUTE } })
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() dto: ForgotPasswordDto): void {
    this.auth.requestPasswordReset(dto.email);
  }

  @ApiOperation({
    summary: 'Set a new password from a reset link',
    description: 'Signs out every session. 10 attempts per 15 minutes.',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    description:
      'The link is invalid, used or expired, or the password is too short.',
    type: ErrorResponseDto,
  })
  @Public()
  @Throttle({ default: { limit: 10, ttl: 15 * MINUTE } })
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(dto.token, dto.password);
  }

  @ApiOperation({
    summary: 'Invite a staff member (admins only)',
    description:
      'Emails a link to set a password. Inviting someone who has not accepted yet sends a new link.',
  })
  @ApiSession()
  @ApiCreatedResponse({ type: InvitationResponseDto })
  @ApiForbiddenResponse({
    description: 'Only admins can invite.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'The email already has an account.',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description:
      'The invitation was saved, but the email failed. Invite again to retry.',
    type: ErrorResponseDto,
  })
  @Roles(UserRole.ADMIN)
  @Post('invitations')
  async invite(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationResponseDto> {
    const { user, expiresAt } = await this.invitations.invite(dto, admin);
    return { user: UserResponseDto.from(user), expiresAt };
  }

  @ApiOperation({
    summary: 'Accept an invitation',
    description:
      'Sets the password, activates the account and signs in. 10 attempts per 15 minutes.',
  })
  @ApiOkResponse({ type: UserEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'The link is invalid, used or expired, or the password is too short.',
    type: ErrorResponseDto,
  })
  @Public()
  @Throttle({ default: { limit: 10, ttl: 15 * MINUTE } })
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserEnvelopeDto> {
    const signedIn = await this.invitations.accept(
      dto.token,
      dto.password,
      dto.name,
      requestMeta(req),
    );
    return this.startSession(res, signedIn);
  }

  private startSession(res: Response, signedIn: SignedIn): UserEnvelopeDto {
    this.cookie.set(res, signedIn.token, signedIn.absoluteExpiresAt);
    return { user: UserResponseDto.from(signedIn.user) };
  }
}
