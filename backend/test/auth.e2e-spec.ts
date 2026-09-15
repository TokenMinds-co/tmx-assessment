import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { SESSION_COOKIE_NAME } from '../src/auth/auth.constants';
import { PasswordService } from '../src/auth/password.service';
import { UserRole, UserStatus } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  InMemoryMailTransport,
  tokenFrom,
} from './utils/in-memory-mail.transport';
import { createTestApp } from './utils/test-app';

// These tests use the database in DATABASE_URL. Every user they create has an
// email starting with this run's prefix, and all of them are deleted at the end.
const RUN = `e2e-${randomUUID().slice(0, 8)}`;
const emailFor = (label: string) => `${RUN}-${label}@example.test`;

interface ErrorBody {
  statusCode: number;
  message: string | string[];
}

interface UserBody {
  user: { email: string; name: string; role: string; status: string };
}

const bodyOf = <T>(res: request.Response): T => res.body as T;

function sessionCookie(res: request.Response): string {
  const cookies = res.get('Set-Cookie') ?? [];
  const cookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!cookie) throw new Error('The response set no session cookie');
  return cookie;
}

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let mail: InMemoryMailTransport;
  let prisma: PrismaService;

  const admin = {
    email: emailFor('admin'),
    password: 'admin-password-123',
    name: 'E2E Admin',
  };

  const http = () => request(app.getHttpServer());

  async function signedIn(email: string, password: string) {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email, password }).expect(200);
    return agent;
  }

  async function createActiveUser(label: string) {
    const user = { email: emailFor(label), password: `${label}-password-123` };
    const { id } = await prisma.user.create({
      data: {
        email: user.email,
        name: `User ${label}`,
        status: UserStatus.ACTIVE,
        passwordHash: await app.get(PasswordService).hash(user.password),
      },
    });
    return { ...user, id };
  }

  beforeAll(async () => {
    ({ app, mail } = await createTestApp());
    prisma = app.get(PrismaService);
    await prisma.user.create({
      data: {
        email: admin.email,
        name: admin.name,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: await app.get(PasswordService).hash(admin.password),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await app.close();
  });

  beforeEach(() => mail.clear());

  describe('sign-in', () => {
    it('rejects requests without a session', async () => {
      await http().get('/api/auth/me').expect(401);
    });

    it('sets an httpOnly, SameSite=Lax cookie and never returns the hash', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send({ email: admin.email, password: admin.password })
        .expect(200);

      const cookie = sessionCookie(res);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Path=\//);
      expect(bodyOf<UserBody>(res).user).toMatchObject({
        email: admin.email,
        role: 'ADMIN',
        status: 'ACTIVE',
      });
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });

    it('trims and lowercases the email', async () => {
      await http()
        .post('/api/auth/login')
        .send({
          email: `  ${admin.email.toUpperCase()} `,
          password: admin.password,
        })
        .expect(200);
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const wrongPassword = await http()
        .post('/api/auth/login')
        .send({ email: admin.email, password: 'not-the-password' })
        .expect(401);
      const unknownEmail = await http()
        .post('/api/auth/login')
        .send({ email: emailFor('nobody'), password: 'not-the-password' })
        .expect(401);

      expect(bodyOf<ErrorBody>(wrongPassword).message).toBe(
        bodyOf<ErrorBody>(unknownEmail).message,
      );
    });

    it('validates the body and rejects unknown fields', async () => {
      await http()
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'x' })
        .expect(400);
      await http()
        .post('/api/auth/login')
        .send({ email: admin.email, password: admin.password, admin: true })
        .expect(400);
    });

    it('accepts the session token as a bearer token', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send({ email: admin.email, password: admin.password })
        .expect(200);
      const token = sessionCookie(res).split(';')[0].split('=')[1];

      await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('signs out, ends the session and clears the cookie', async () => {
      const agent = await signedIn(admin.email, admin.password);
      await agent.get('/api/auth/me').expect(200);

      const res = await agent.post('/api/auth/logout').expect(204);

      expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
      await agent.get('/api/auth/me').expect(401);
    });

    it('blocks writes from an untrusted origin', async () => {
      await http()
        .post('/api/auth/login')
        .set('Origin', 'https://evil.example')
        .send({ email: admin.email, password: admin.password })
        .expect(403);
    });

    it('allows writes from the frontend origin', async () => {
      await http()
        .post('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .send({ email: admin.email, password: admin.password })
        .expect(200)
        .expect('Access-Control-Allow-Credentials', 'true');
    });
  });

  describe('invitations', () => {
    it('lets an admin invite a member, who sets a password and is signed in', async () => {
      const adminAgent = await signedIn(admin.email, admin.password);
      const email = emailFor('member');

      const invited = await adminAgent
        .post('/api/auth/invitations')
        .send({ email, name: 'New Member' })
        .expect(201);
      expect(bodyOf<UserBody>(invited).user).toMatchObject({
        email,
        role: 'MEMBER',
        status: 'INVITED',
      });

      const message = await mail.waitFor(email, /invited/);
      expect(message.text).toContain(`${admin.name} has invited you`);
      expect(message.text).toContain(
        'http://localhost:3000/accept-invite?token=',
      );
      const token = tokenFrom(message);

      // No password yet, so no sign-in.
      await http()
        .post('/api/auth/login')
        .send({ email, password: 'member-password-1' })
        .expect(401);
      await http()
        .post('/api/auth/invitations/accept')
        .send({ token, password: 'too-short' })
        .expect(400);

      const member = request.agent(app.getHttpServer());
      const accepted = await member
        .post('/api/auth/invitations/accept')
        .send({ token, password: 'member-password-1', name: 'Member Name' })
        .expect(200);
      expect(bodyOf<UserBody>(accepted).user).toMatchObject({
        email,
        name: 'Member Name',
        role: 'MEMBER',
        status: 'ACTIVE',
      });
      await member.get('/api/auth/me').expect(200);

      // The link works once.
      await http()
        .post('/api/auth/invitations/accept')
        .send({ token, password: 'another-password-1' })
        .expect(400);
      // Members can't invite.
      await member
        .post('/api/auth/invitations')
        .send({ email: emailFor('blocked'), name: 'Blocked' })
        .expect(403);
    });

    it('sends a new link when re-inviting, and the old link stops working', async () => {
      const adminAgent = await signedIn(admin.email, admin.password);
      const email = emailFor('pending');

      await adminAgent
        .post('/api/auth/invitations')
        .send({ email, name: 'Pending' })
        .expect(201);
      const first = tokenFrom(await mail.waitFor(email, /invited/));
      mail.clear();
      await adminAgent
        .post('/api/auth/invitations')
        .send({ email, name: 'Pending' })
        .expect(201);
      const second = tokenFrom(await mail.waitFor(email, /invited/));

      expect(second).not.toBe(first);
      await http()
        .post('/api/auth/invitations/accept')
        .send({ token: first, password: 'pending-password-1' })
        .expect(400);
      await http()
        .post('/api/auth/invitations/accept')
        .send({ token: second, password: 'pending-password-1' })
        .expect(200);
    });

    it('refuses to invite an email that already has an account', async () => {
      const adminAgent = await signedIn(admin.email, admin.password);

      await adminAgent
        .post('/api/auth/invitations')
        .send({ email: admin.email, name: 'Again' })
        .expect(409);
    });

    it('rejects an unknown role', async () => {
      const adminAgent = await signedIn(admin.email, admin.password);

      await adminAgent
        .post('/api/auth/invitations')
        .send({ email: emailFor('owner'), name: 'Owner', role: 'OWNER' })
        .expect(400);
    });

    it('needs a session', async () => {
      await http()
        .post('/api/auth/invitations')
        .send({ email: emailFor('anon'), name: 'Anon' })
        .expect(401);
    });
  });

  describe('password reset', () => {
    it('answers 202 for an unknown email and sends nothing', async () => {
      await http()
        .post('/api/auth/password/forgot')
        .send({ email: emailFor('ghost') })
        .expect(202);
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mail.sent).toHaveLength(0);
    });

    it('resets the password from the emailed link and signs out every session', async () => {
      const user = await createActiveUser('reset');
      const oldSession = await signedIn(user.email, user.password);

      await http()
        .post('/api/auth/password/forgot')
        .send({ email: user.email })
        .expect(202);
      const message = await mail.waitFor(user.email, /Reset your/);
      expect(message.text).toContain(
        'http://localhost:3000/reset-password?token=',
      );
      const token = tokenFrom(message);

      await http()
        .post('/api/auth/password/reset')
        .send({ token, password: 'brand-new-password-1' })
        .expect(204);

      await oldSession.get('/api/auth/me').expect(401);
      await http()
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(401);
      await signedIn(user.email, 'brand-new-password-1');
      await mail.waitFor(user.email, /was changed/);

      // The link works once.
      await http()
        .post('/api/auth/password/reset')
        .send({ token, password: 'another-password-12' })
        .expect(400);
    });
  });

  describe('password change', () => {
    it('checks the current password, keeps this session and ends the others', async () => {
      const user = await createActiveUser('change');
      const here = await signedIn(user.email, user.password);
      const elsewhere = await signedIn(user.email, user.password);

      await here
        .post('/api/auth/password/change')
        .send({
          currentPassword: 'wrong-password-1',
          newPassword: 'changed-password-1',
        })
        .expect(400);
      await here
        .post('/api/auth/password/change')
        .send({
          currentPassword: user.password,
          newPassword: 'changed-password-1',
        })
        .expect(204);

      await here.get('/api/auth/me').expect(200);
      await elsewhere.get('/api/auth/me').expect(401);
      await mail.waitFor(user.email, /was changed/);
    });
  });

  describe('deactivated accounts', () => {
    it('lose their sessions at once and cannot sign in', async () => {
      const user = await createActiveUser('deactivated');
      const agent = await signedIn(user.email, user.password);

      await prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.DEACTIVATED },
      });

      await agent.get('/api/auth/me').expect(401);
      const res = await http()
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(403);
      expect(bodyOf<ErrorBody>(res).message).toBe(
        'This account has been deactivated.',
      );
    });
  });
});
