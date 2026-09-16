import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { FileStorage } from './file-storage';

/** Keeps files in a folder on this machine (STORAGE_DIR). */
export class LocalDiskStorage implements FileStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    // Write beside the target, then rename, so a reader never sees half a file.
    const partial = `${path}.${process.pid}.${Date.now()}.partial`;
    await writeFile(partial, data);
    await rename(partial, path);
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  async localPath(key: string): Promise<string | null> {
    const path = this.pathFor(key);
    try {
      return (await stat(path)).isFile() ? path : null;
    } catch {
      return null;
    }
  }

  /** The key as a path inside the root. Keys come from our own code, but check anyway. */
  private pathFor(key: string): string {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root + sep)) {
      throw new Error(
        `Storage key "${key}" points outside the storage folder.`,
      );
    }
    return path;
  }
}
