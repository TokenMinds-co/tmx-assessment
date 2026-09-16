import {
  assessmentInvitationEmail,
  escapeHtml,
  invitationEmail,
  passwordChangedEmail,
  passwordResetEmail,
} from './mail.templates';

const acceptUrl = 'https://hr.example.com/accept-invite?token=abc&x=1';

describe('mail templates', () => {
  it('escapes user-supplied names in the HTML version', () => {
    const email = invitationEmail({
      name: '<script>alert(1)</script>',
      acceptUrl,
      expiresInDays: 7,
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.text).toContain('<script>alert(1)</script>');
  });

  it('puts the link in both the HTML and text versions', () => {
    const email = invitationEmail({
      name: 'Ada',
      acceptUrl,
      expiresInDays: 7,
    });

    expect(email.html).toContain(`href="${escapeHtml(acceptUrl)}"`);
    expect(email.text).toContain(acceptUrl);
    expect(email.text).toContain('7 days');
  });

  it('names the inviter when there is one', () => {
    const email = invitationEmail({
      name: 'Ada',
      invitedByName: 'Anchor',
      acceptUrl,
      expiresInDays: 7,
    });

    expect(email.text).toContain('Anchor has invited you');
  });

  it('renders the reset and password-changed emails', () => {
    const reset = passwordResetEmail({
      name: 'Ada',
      resetUrl: 'https://hr.example.com/reset-password?token=xyz',
      expiresInMinutes: 60,
    });
    const changed = passwordChangedEmail({ name: 'Ada' });

    expect(reset.subject).toBe('Reset your TMX HR password');
    expect(reset.text).toContain('60 minutes');
    expect(changed.subject).toBe('Your TMX HR password was changed');
    expect(changed.html).not.toContain('<a ');
  });
});

describe('assessment invitation email', () => {
  const input = {
    name: 'Ada',
    tests: [
      { name: 'Communication', durationMinutes: 8 },
      { name: 'Motivation', durationMinutes: 15 },
    ],
    startUrl: 'https://hr.example.com/take/abc_DEF-123',
    expiresAt: new Date('2026-09-29T10:00:00Z'),
    message: 'Good luck <3',
    sentByName: 'Anchor',
  };

  it('lists every test, the total time, the link and the expiry', () => {
    const email = assessmentInvitationEmail(input);

    expect(email.subject).toBe('Your TokenMinds assessments');
    expect(email.text).toContain(
      '- Communication (8 min)\n- Motivation (15 min)',
    );
    expect(email.text).toContain('about 23 minutes');
    expect(email.text).toContain('Anchor from TokenMinds');
    expect(email.text).toContain(input.startUrl);
    expect(email.text).toContain('29 September 2026');
    expect(email.html).toContain('<li>Communication (8 min)</li>');
    expect(email.html).toContain(`href="${escapeHtml(input.startUrl)}"`);
  });

  it('escapes the sender’s note and uses the company name, not the app’s', () => {
    const email = assessmentInvitationEmail(input);

    expect(email.html).toContain('Good luck &lt;3');
    expect(email.html).toContain('>TokenMinds</p>');
    expect(email.html).not.toContain('TMX HR');
  });

  it('reads naturally for a single test', () => {
    const email = assessmentInvitationEmail({
      ...input,
      tests: [input.tests[0]],
      message: null,
      sentByName: null,
    });

    expect(email.subject).toBe('Your TokenMinds assessment: Communication');
    expect(email.text).toContain(
      'The TokenMinds team has sent you a short assessment',
    );
    expect(email.text).toContain('It takes about 8 minutes');
  });
});
