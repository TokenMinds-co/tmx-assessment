import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PasswordService } from '../../src/auth/password.service';
import { UserRole, UserStatus } from '../../src/generated/prisma/enums';
import { PrismaService } from '../../src/prisma/prisma.service';

/** A Supertest agent that keeps a session cookie between requests. */
export type Agent = ReturnType<typeof request.agent>;

export interface StaffAccount {
  id: string;
  email: string;
  password: string;
}

const PASSWORD = 'e2e-password-123';

/** An active staff account, written straight to the database. */
export async function createStaff(
  app: NestExpressApplication,
  email: string,
  role: UserRole = UserRole.MEMBER,
): Promise<StaffAccount> {
  const { id } = await app.get(PrismaService).user.create({
    data: {
      email,
      name: role === UserRole.ADMIN ? 'E2E Admin' : 'E2E Member',
      role,
      status: UserStatus.ACTIVE,
      passwordHash: await app.get(PasswordService).hash(PASSWORD),
    },
  });
  return { id, email, password: PASSWORD };
}

/** Signs a staff member in and returns an agent holding their session. */
export async function signIn(
  app: NestExpressApplication,
  account: StaffAccount,
): Promise<Agent> {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/api/auth/login')
    .send({ email: account.email, password: account.password })
    .expect(200);
  return agent;
}

/** Reads a binary response body into a Buffer (Supertest skips unknown types). */
export function binaryParser(
  res: NodeJS.ReadableStream,
  callback: (error: Error | null, body: Buffer) => void,
): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
  res.on('error', (error: Error) => callback(error, Buffer.alloc(0)));
}
