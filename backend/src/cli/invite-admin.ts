import { NestFactory } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { parseArgs } from 'node:util';
import { AppModule } from '../app.module';
import { CreateInvitationDto } from '../auth/dto/create-invitation.dto';
import { InvitationsService } from '../auth/invitations.service';
import { UserRole } from '../generated/prisma/enums';

const USAGE =
  'Usage: pnpm auth:invite-admin --email <email> --name "<full name>"';

/**
 * Invites an admin from the command line. This is how the first account gets
 * created; after that, admins invite people from the app. It prints the link
 * as well, so it works before email is set up. See docs/authentication.md.
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, name: { type: 'string' } },
  });
  const input = plainToInstance(CreateInvitationDto, {
    email: values.email,
    name: values.name,
    role: UserRole.ADMIN,
  });
  const errors = await validate(input);
  if (errors.length > 0) {
    const problems = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );
    console.error(`${problems.join('\n')}\n\n${USAGE}`);
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const invitations = app.get(InvitationsService);
    const invitation = await invitations.create(input, null);
    const email = invitation.user.email;

    let status = `Invitation emailed to ${email}.`;
    try {
      await invitations.send(invitation);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      status = `Invitation saved, but the email to ${email} failed: ${reason}`;
    }

    console.log(
      [
        status,
        `Accept link (valid until ${invitation.expiresAt.toISOString()}):`,
        invitation.acceptUrl,
      ].join('\n'),
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
