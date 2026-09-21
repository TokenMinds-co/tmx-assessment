# Security policy

## Reporting a vulnerability

**Please don't open a public issue for a security problem.** A public report tells everyone
running TMX HR about the hole at the same moment it tells us, and this app holds people's
personal data.

Report it privately, either way round:

- **GitHub private vulnerability reporting** (preferred). Go to the
  [Security tab](https://github.com/TokenMinds-co/tmx-hr/security) of
  `TokenMinds-co/tmx-hr` and choose **Report a vulnerability**. The report is visible only to
  the maintainers, and the whole exchange stays in one place.
- **Email tech@tokenminds.co**, if you'd rather not use GitHub or can't reach the form.

What helps us confirm it quickly:

- Which package it's in, `backend/` or `frontend/`, and the commit or version you tested.
- What an attacker gets out of it: read another candidate's results, sign in as someone else,
  run code on the server.
- The steps to reproduce it, with a request or a short script where that's clearer than prose.
- Anything you already know about the fix. You're welcome to suggest one, but please don't
  open a public pull request for it before we've agreed how to handle the disclosure.

Use invented names and addresses in your report. If reproducing the problem meant reading
real candidate data, tell us that it happened and roughly how much you saw, and don't include
the data itself.

## What happens next

TMX HR is maintained by a small team, so here is what we can honestly promise:

- **An acknowledgement within a few business days.** If a week goes by with nothing, send a
  reminder — assume it got lost, not ignored.
- **An assessment after that**, telling you whether we've reproduced it, how serious we think
  it is, and roughly when a fix will land.
- **A note when it's fixed**, and credit in the release notes if you'd like it. Say so if
  you'd rather stay anonymous.

Please give us a reasonable window to ship a fix before writing about the problem in public.
We'd rather agree a date with you than ask you to wait indefinitely.

There is no bug bounty.

## Supported versions

| Version | Supported |
| --- | --- |
| `main` | Yes. Fixes land here first. |
| The latest tagged release | Yes |
| Anything older | No. Update to the latest release. |

Deployments run from `main`, so that is where a fix appears first; it is then included in the
next tagged release. We don't backport fixes to older tags.

## What this app holds

TMX HR is a recruitment tool. Its database stores candidates' names and email addresses,
their answers to assessment questions, and their scores, alongside staff accounts and
sessions.

**Anything that exposes candidate data is treated as high priority,** even if it takes an
unusual setup to trigger. That includes one candidate's link reaching another candidate's
tests or results, staff data leaking through a public endpoint, broken access control on the
assessment routes, and anything that puts personal data into logs, error responses or
uploaded files.

If you run TMX HR yourself, the same applies to your own deployment: keep `DATABASE_URL`,
`RESEND_API_KEY` and the session cookie settings out of version control, and serve it over
HTTPS so the session cookie's `Secure` flag does its job.
