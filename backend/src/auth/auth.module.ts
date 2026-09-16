import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MailModule } from '../mail/mail.module';
import { AuthTokensService } from './auth-tokens.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { InvitationsService } from './invitations.service';
import { PasswordService } from './password.service';
import { SessionCookieService } from './session-cookie.service';
import { SessionsService } from './sessions.service';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokensService,
    InvitationsService,
    PasswordService,
    SessionCookieService,
    SessionsService,
    // Order matters: find the user first, then check their role.
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
