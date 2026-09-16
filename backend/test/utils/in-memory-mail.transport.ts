import type { MailMessage, MailTransport } from '../../src/mail/mail.transport';

/** Keeps emails in memory instead of sending them, so tests can follow links. */
export class InMemoryMailTransport implements MailTransport {
  readonly sent: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }

  /**
   * The latest email to `to` whose subject matches. Waits for it, because some
   * emails are sent in the background after the response.
   */
  async waitFor(
    to: string,
    subject: RegExp,
    timeoutMs = 5000,
  ): Promise<MailMessage> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const found = this.sent.findLast(
        (message) => message.to === to && subject.test(message.subject),
      );
      if (found) return found;
      if (Date.now() > deadline) {
        throw new Error(`No email to ${to} matching ${String(subject)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  clear(): void {
    this.sent.length = 0;
  }
}

/** The token from the link in an invitation or reset email. */
export function tokenFrom(message: MailMessage): string {
  const match = /[?&]token=([A-Za-z0-9_-]+)/.exec(message.text);
  if (!match) throw new Error(`No token link in "${message.subject}"`);
  return match[1];
}

/** The token from the link in a candidate's assessment email. */
export function takeTokenFrom(message: MailMessage): string {
  const match = /\/take\/([A-Za-z0-9_-]+)/.exec(message.text);
  if (!match) throw new Error(`No assessment link in "${message.subject}"`);
  return match[1];
}
