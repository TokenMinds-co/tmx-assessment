# Email

**Status:** In progress · **Last updated:** 2026-09-21

## Scope

Sending email from the backend: the provider, templates, and what happens in development. Which account emails go out and when is in [authentication.md](authentication.md). When candidates get their assessment link is in [assessments.md](assessments.md#candidate-links).

## Current state

- **`MailModule`** in [src/mail/](../src/mail/). [`MailService`](../src/mail/mail.service.ts) renders an email and hands it to the active transport.
- **Four emails:** staff invitation, password reset, "your password was changed", and a candidate's assessment link. Templates are in [mail.templates.ts](../src/mail/mail.templates.ts).
- **Two transports:** [Resend](../src/mail/resend.transport.ts), and a [console transport](../src/mail/console.transport.ts) for local development.
- **Not set up yet:** a verified sending domain in Resend. See [Open decisions](#open-decisions).

## Requirements

- Email goes through **Resend**.

## How it works

- **The transport is picked at startup.** If `RESEND_API_KEY` is set, emails go through Resend. If it's empty, they're printed to the terminal, and the app logs a warning saying so. Production refuses to start without the key (see [configuration.md](configuration.md)).
- **The sender is `EMAIL_FROM`.** Its domain must be verified in Resend. The default, `onboarding@resend.dev`, only delivers to the email address of the Resend account's owner, which is fine for a first test.
- **Templates are plain functions** that return a subject, an HTML body and a plain-text body. The HTML uses inline styles only, because many email clients drop `<style>` blocks. Every piece of user-supplied text is HTML-escaped.
- **The candidate email** (`assessmentInvitationEmail()`, sent by `MailService.sendAssessmentInvitation()`) carries the company's name, not the app's, because candidates don't know TMX Assessment. The name comes from `COMPANY_NAME` (see [configuration.md](configuration.md)), which defaults to `TMX Assessment`. `MailService` reads it through `ConfigService` and fills in the template's `companyName`, so callers never pass it. The email lists each test with its minutes and the total, gives the link's expiry as a date such as "29 September 2026" (in UTC, so every server writes the same date), and adds the sender's note if there is one. With one test, the subject names it.
- **Failures throw `MailDeliveryError`.** Invitations turn it into a 503; the invitation stays saved, and inviting the same email again retries. Reset emails and password-changed notices are sent after the response, so failures there are only logged. A failed candidate email is logged too, and the send still succeeds: the API returns the link with `emailSent: false`, so staff can share it another way or resend.
- **Tests never send email.** They replace the `MAIL_TRANSPORT` provider with an [in-memory transport](../test/utils/in-memory-mail.transport.ts) and read the links from it (see [testing.md](testing.md)).

To add an email: write a template function in `mail.templates.ts`, add a method to `MailService`, and cover it in [mail.templates.spec.ts](../src/mail/mail.templates.spec.ts).

## Decisions

"Requested" means the maintainers asked for it. "Build default" means it was chosen while building and is open to change.

| Question | Decision | Why | Source |
| --- | --- | --- | --- |
| Provider | Resend | | Requested |
| Templates | Plain TypeScript functions with inline styles, not React Email | A few short emails don't need another dependency. Resend supports React Email if we want designed emails later. | Build default |
| Development without a key | Print emails to the terminal | Anyone can run the app without a Resend account and still copy the links. | Build default |
| The name in candidate emails | The company's name, not the app's | Candidates don't know the internal app's name. | Build default |
| Where that name comes from | `COMPANY_NAME`, defaulting to `TMX Assessment` | It was hardcoded, so a fork would email candidates under someone else's name. The default matches the app's own name and the wordmark. | Requested |
| Sending | Straight away, with no queue | The volume is tiny: a few invitations and resets a week. | Build default |

## Open decisions

- **Sending domain.** Verify your own sending domain, or a subdomain of it such as `mail.example.com`, in Resend, then set `EMAIL_FROM` to an address on it. This needs someone with access to that domain's DNS.
- Whether replies should go to a shared inbox (a reply-to address).
- Moving sending to a queue with retries if volume grows. See [`micro-use-queues`](../.agents/skills/nestjs-best-practices/rules/micro-use-queues.md).
- A branded email design.

## References

- [authentication.md](authentication.md), [configuration.md](configuration.md), [testing.md](testing.md)
- [`test-mock-external-services`](../.agents/skills/nestjs-best-practices/rules/test-mock-external-services.md)
- [Resend: send email with Node.js](https://resend.com/docs/send-with-nodejs), [Resend: verify a domain](https://resend.com/docs/dashboard/domains/introduction)
