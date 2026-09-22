const APP_NAME = 'TMX Assessment';

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
  /** The small name above the heading. Defaults to the app's. */
  brand?: string;
  heading: string;
  paragraphs: string[];
  /** A bulleted list after the paragraphs. */
  list?: string[];
  /** Paragraphs after the list. */
  closing?: string[];
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

export interface AssessmentInvitationEmailInput {
  name: string;
  /**
   * Candidates don't know the internal app, so their emails carry the hiring
   * company's name. It comes from `COMPANY_NAME`; `MailService` fills it in.
   */
  companyName: string;
  tests: { name: string; durationMinutes: number }[];
  startUrl: string;
  expiresAt: Date;
  message?: string | null;
  sentByName?: string | null;
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
      `${inviter} to join ${APP_NAME}. Set a password to activate your account.`,
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

/** The link a candidate uses for all the tests they were sent. */
export function assessmentInvitationEmail(
  input: AssessmentInvitationEmailInput,
): RenderedEmail {
  const one = input.tests.length === 1;
  const minutes = input.tests.reduce(
    (sum, test) => sum + test.durationMinutes,
    0,
  );
  const company = input.companyName;
  const sender = input.sentByName
    ? `${input.sentByName} from ${company}`
    : `The ${company} team`;

  const closing = [
    one
      ? 'The test has a timer, which starts when you open it. Start when you can finish it in one go. Your answers are saved as you go, so a dropped connection won’t lose them.'
      : 'Each test has its own timer, which starts when you open that test. Start each one when you can finish it in one go. Your answers are saved as you go, so a dropped connection won’t lose them.',
  ];
  if (input.message) {
    closing.unshift(
      `A note from ${input.sentByName ?? 'the team'}: ${input.message}`,
    );
  }

  return render({
    brand: company,
    subject: one
      ? `Your ${company} assessment: ${input.tests[0]?.name ?? ''}`.trim()
      : `Your ${company} assessments`,
    heading: one ? 'Your assessment is ready' : 'Your assessments are ready',
    paragraphs: [
      `Hi ${input.name},`,
      `${sender} has sent you ${one ? 'a short assessment' : `${input.tests.length} short assessments`} as part of your application. ${one ? 'It takes' : 'Together they take'} about ${minutes} minutes:`,
    ],
    list: input.tests.map(
      (test) => `${test.name} (${test.durationMinutes} min)`,
    ),
    closing,
    action: {
      label: one ? 'Start the assessment' : 'Start the assessments',
      url: input.startUrl,
    },
    footnote: `The link works until ${longDate(input.expiresAt)}. It's personal to you, so please don't forward it.`,
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

const longDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "29 September 2026". In UTC, so every server writes the same date. */
function longDate(date: Date): string {
  return longDateFormat.format(date);
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
  list,
  closing,
  action,
  footnote,
}: EmailContent): string {
  const blocks = [heading, ...paragraphs];
  if (list?.length) blocks.push(list.map((item) => `- ${item}`).join('\n'));
  if (closing) blocks.push(...closing);
  if (action) blocks.push(`${action.label}: ${action.url}`);
  if (footnote) blocks.push(footnote);
  return blocks.join('\n\n');
}

// Inline styles only: most email clients ignore <style> blocks.
function renderHtml({
  brand,
  heading,
  paragraphs,
  list,
  closing,
  action,
  footnote,
}: EmailContent): string {
  const text = 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#27272a;';
  const muted = 'margin:0 0 16px;font-size:13px;line-height:1.6;color:#71717a;';
  const paragraph = (value: string) =>
    `<p style="${text}">${escapeHtml(value)}</p>`;

  const body = paragraphs.map(paragraph).join('');
  const items = list?.length
    ? `<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;color:#27272a;">${list
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul>`
    : '';
  const after = (closing ?? []).map(paragraph).join('');

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
    `<p style="margin:0 0 24px;font-size:13px;font-weight:600;letter-spacing:0.04em;color:#71717a;">${escapeHtml(brand ?? APP_NAME)}</p>` +
    `<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#18181b;">${escapeHtml(heading)}</h1>` +
    `${body}${items}${after}${button}${note}</div></body></html>`
  );
}
