import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import { type Agent, binaryParser, createStaff, signIn } from './utils/staff';
import { createTestApp } from './utils/test-app';

// Accounts start with this run's prefix and are deleted at the end, with their uploads.
const RUN = `e2e-${randomUUID().slice(0, 8)}`;
const emailFor = (label: string) => `${RUN}-${label}@example.test`;

interface MediaBody {
  id: string;
  url: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
}

interface ErrorBody {
  message: string | string[];
}

const bodyOf = <T>(res: request.Response): T => res.body as T;

/** Bytes that pass as an MP3: an ID3 tag header, then padding. */
function fakeMp3(size = 2048): Buffer {
  const data = Buffer.alloc(size, 0);
  data.write('ID3', 0, 'latin1');
  data[3] = 3;
  return data;
}

describe('Media (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let storageDir: string;
  let admin: Agent;
  let member: Agent;

  const http = () => request(app.getHttpServer());
  const upload = (agent: Agent, data: Buffer, name = 'clip.mp3') =>
    agent.post('/api/media').attach('file', data, name);

  beforeAll(async () => {
    ({ app, storageDir } = await createTestApp());
    prisma = app.get(PrismaService);
    admin = await signIn(
      app,
      await createStaff(app, emailFor('admin'), UserRole.ADMIN),
    );
    member = await signIn(app, await createStaff(app, emailFor('member')));
  });

  afterAll(async () => {
    await prisma.mediaAsset.deleteMany({
      where: { uploadedBy: { email: { startsWith: RUN } } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await rm(storageDir, { recursive: true, force: true });
    await app.close();
  });

  it('lets an admin upload audio that anyone can download', async () => {
    const data = fakeMp3();
    const res = await upload(admin, data, 'listening_Q13.mp3').expect(201);
    const body = bodyOf<MediaBody>(res);

    expect(body).toMatchObject({
      mimeType: 'audio/mpeg',
      originalName: 'listening_Q13.mp3',
      sizeBytes: data.length,
      url: `/api/media/${body.id}`,
    });

    const download = await http()
      .get(body.url)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    expect(download.headers['content-type']).toBe('audio/mpeg');
    expect(download.headers['accept-ranges']).toBe('bytes');
    expect(download.headers['x-content-type-options']).toBe('nosniff');
    expect((download.body as Buffer).equals(data)).toBe(true);
  });

  it('answers Range requests, so audio can seek', async () => {
    const data = fakeMp3(4096);
    const { id } = bodyOf<MediaBody>(await upload(admin, data).expect(201));

    const res = await http()
      .get(`/api/media/${id}`)
      .set('Range', 'bytes=0-99')
      .buffer(true)
      .parse(binaryParser)
      .expect(206);
    expect(res.headers['content-range']).toBe(`bytes 0-99/${data.length}`);
    expect((res.body as Buffer).length).toBe(100);
  });

  it('reads the type from the file, not its name', async () => {
    const res = await upload(
      admin,
      Buffer.from('plain text'),
      'fake.mp3',
    ).expect(400);
    expect(bodyOf<ErrorBody>(res).message).toMatch(/Upload an MP3/);
  });

  it('asks for a file when there is none', async () => {
    const res = await admin.post('/api/media').send({}).expect(400);
    expect(bodyOf<ErrorBody>(res).message).toBe('Choose a file to upload.');
  });

  it('refuses files over 10 MB', async () => {
    await upload(admin, fakeMp3(10 * 1024 * 1024 + 1)).expect(413);
  });

  it('limits uploads to admins', async () => {
    await upload(member, fakeMp3()).expect(403);
    await http()
      .post('/api/media')
      .attach('file', fakeMp3(), 'clip.mp3')
      .expect(401);
  });

  it('answers 404 for an unknown file and 400 for a malformed id', async () => {
    await http().get(`/api/media/${randomUUID()}`).expect(404);
    await http().get('/api/media/not-a-uuid').expect(400);
  });

  it('lets an admin delete a file', async () => {
    const { id, url } = bodyOf<MediaBody>(
      await upload(admin, fakeMp3()).expect(201),
    );

    await member.delete(`/api/media/${id}`).expect(403);
    await admin.delete(`/api/media/${id}`).expect(204);
    await http().get(url).expect(404);
  });
});
