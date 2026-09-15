import { Inject, Injectable } from '@nestjs/common';
import {
  invitationEmail,
  InvitationEmailInput,
  passwordChangedEmail,
  PasswordChangedEmailInput,
  passwordResetEmail,
  PasswordResetEmailInput,
} from './mail.templates';
import { MAIL_TRANSPORT, type MailTransport } from './mail.transport';

/** Renders the app's emails and hands them to the active transport. */
@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {}

  sendInvitation(to: string, input: InvitationEmailInput): Promise<void> {
    return this.transport.send({ to, ...invitationEmail(input) });
  }

  sendPasswordReset(to: string, input: PasswordResetEmailInput): Promise<void> {
    return this.transport.send({ to, ...passwordResetEmail(input) });
  }

  sendPasswordChanged(
    to: string,
    input: PasswordChangedEmailInput,
  ): Promise<void> {
    return this.transport.send({ to, ...passwordChangedEmail(input) });
  }
}
