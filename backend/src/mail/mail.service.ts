import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import {
  assessmentInvitationEmail,
  AssessmentInvitationEmailInput,
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
  /** The company name candidates see. Callers never pass it. */
  private readonly companyName: string;

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.companyName = config.get('COMPANY_NAME', { infer: true });
  }

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

  sendAssessmentInvitation(
    to: string,
    input: Omit<AssessmentInvitationEmailInput, 'companyName'>,
  ): Promise<void> {
    return this.transport.send({
      to,
      ...assessmentInvitationEmail({
        ...input,
        companyName: this.companyName,
      }),
    });
  }
}
