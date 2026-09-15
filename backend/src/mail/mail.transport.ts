export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Delivers one email. Throws MailDeliveryError when it can't. */
export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

/** Injection token for the active MailTransport. Tests override it. */
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export class MailDeliveryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MailDeliveryError';
  }
}
