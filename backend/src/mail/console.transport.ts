import { Logger } from '@nestjs/common';
import { MailMessage, MailTransport } from './mail.transport';

/**
 * Prints emails to the log instead of sending them. Used in development when
 * RESEND_API_KEY is empty, so links in invitations and resets can be copied
 * from the terminal.
 */
export class ConsoleMailTransport implements MailTransport {
  private readonly logger = new Logger('Mail');

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      `Email to ${message.to}: "${message.subject}"\n${message.text}`,
    );
    return Promise.resolve();
  }
}
