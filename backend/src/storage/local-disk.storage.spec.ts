import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDiskStorage } from './local-disk.storage';

describe('LocalDiskStorage', () => {
  let root: string;
  let storage: LocalDiskStorage;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'tmx-assessment-storage-'));
    storage = new LocalDiskStorage(root);
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  it('saves, finds and removes a file', async () => {
    await storage.put('media/a.mp3', Buffer.from('hello'));

    const path = await storage.localPath('media/a.mp3');
    expect(path).toBe(join(root, 'media/a.mp3'));
    expect(await readFile(path!, 'utf8')).toBe('hello');

    await storage.remove('media/a.mp3');
    expect(await storage.localPath('media/a.mp3')).toBeNull();
  });

  it('returns null for a missing file and ignores removing it', async () => {
    expect(await storage.localPath('media/missing.mp3')).toBeNull();
    await expect(storage.remove('media/missing.mp3')).resolves.toBeUndefined();
  });

  it('refuses keys that escape the storage folder', async () => {
    await expect(
      storage.put('../escape.txt', Buffer.from('x')),
    ).rejects.toThrow(/outside the storage folder/);
  });
});
