import {
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
