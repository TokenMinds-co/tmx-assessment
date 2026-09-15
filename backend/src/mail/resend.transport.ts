import { Resend } from 'resend';
import {
  MailDeliveryError,
  MailMessage,
  MailTransport,
} from './mail.transport';

/** Sends email through Resend. Used whenever RESEND_API_KEY is set. */
export class ResendMailTransport implements MailTransport {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(message: MailMessage): Promise<void> {
    let result: Awaited<ReturnType<Resend['emails']['send']>>;
    try {
      result = await this.client.emails.send({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    } catch (cause) {
      throw new MailDeliveryError('Could not reach Resend.', { cause });
    }

    if (result.error) {
      throw new MailDeliveryError(
        `Resend rejected the email: ${result.error.message}`,
        { cause: result.error },
      );
    }
  }
}
