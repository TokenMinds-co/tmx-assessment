const APP_NAME = 'TMX HR';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface EmailAction {
  label: string;
  url: string;
}

interface EmailContent {
  subject: string;
  heading: string;
  paragraphs: string[];
  action?: EmailAction;
  footnote?: string;
}

export interface InvitationEmailInput {
  name: string;
  invitedByName?: string;
  acceptUrl: string;
  expiresInDays: number;
}

export interface PasswordResetEmailInput {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface PasswordChangedEmailInput {
  name: string;
}

export function invitationEmail(input: InvitationEmailInput): RenderedEmail {
  const inviter = input.invitedByName
    ? `${input.invitedByName} has invited you`
    : 'You have been invited';

  return render({
    subject: `You're invited to ${APP_NAME}`,
    heading: 'Activate your account',
    paragraphs: [
      `Hi ${input.name},`,
      `${inviter} to join ${APP_NAME}, TokenMinds' internal HR app. Set a password to activate your account.`,
    ],
    action: { label: 'Set your password', url: input.acceptUrl },
    footnote: `This link expires in ${input.expiresInDays} days. If you weren't expecting this invitation, you can ignore this email.`,
  });
}

export function passwordResetEmail(
  input: PasswordResetEmailInput,
): RenderedEmail {
  return render({
    subject: `Reset your ${APP_NAME} password`,
    heading: 'Reset your password',
    paragraphs: [
      `Hi ${input.name},`,
      `We received a request to reset the password for your ${APP_NAME} account.`,
    ],
    action: { label: 'Choose a new password', url: input.resetUrl },
    footnote: `This link expires in ${input.expiresInMinutes} minutes and works once. If you didn't ask for a reset, ignore this email and your password stays the same.`,
  });
}

export function passwordChangedEmail(
  input: PasswordChangedEmailInput,
): RenderedEmail {
  return render({
    subject: `Your ${APP_NAME} password was changed`,
    heading: 'Your password was changed',
    paragraphs: [
      `Hi ${input.name},`,
      `The password for your ${APP_NAME} account was just changed, and your other signed-in devices were signed out.`,
      `If this wasn't you, reset your password straight away and tell a ${APP_NAME} admin.`,
    ],
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render(content: EmailContent): RenderedEmail {
  return {
    subject: content.subject,
    html: renderHtml(content),
    text: renderText(content),
  };
}

function renderText({
  heading,
  paragraphs,
  action,
  footnote,
}: EmailContent): string {
  const blocks = [heading, ...paragraphs];
  if (action) blocks.push(`${action.label}: ${action.url}`);
  if (footnote) blocks.push(footnote);
  return blocks.join('\n\n');
}

// Inline styles only: most email clients ignore <style> blocks.
function renderHtml({
  heading,
  paragraphs,
  action,
  footnote,
}: EmailContent): string {
  const text = 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#27272a;';
  const muted = 'margin:0 0 16px;font-size:13px;line-height:1.6;color:#71717a;';

  const body = paragraphs
    .map((paragraph) => `<p style="${text}">${escapeHtml(paragraph)}</p>`)
    .join('');

  const button = action
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:12px 20px;border-radius:6px;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(action.label)}</a></p>` +
      `<p style="${muted}">If the button doesn't work, paste this link into your browser:<br><a href="${escapeHtml(action.url)}" style="color:#3f3f46;word-break:break-all;">${escapeHtml(action.url)}</a></p>`
    : '';

  const note = footnote
    ? `<p style="${muted}">${escapeHtml(footnote)}</p>`
    : '';

  return (
    `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">` +
    `<div style="max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border-radius:8px;">` +
    `<p style="margin:0 0 24px;font-size:13px;font-weight:600;letter-spacing:0.04em;color:#71717a;">${APP_NAME}</p>` +
    `<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#18181b;">${escapeHtml(heading)}</h1>` +
    `${body}${button}${note}</div></body></html>`
  );
}
