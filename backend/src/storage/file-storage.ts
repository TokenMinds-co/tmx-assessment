/**
 * Where uploaded files are kept. The app stores them on local disk
 * (LocalDiskStorage); the interface leaves room for a bucket later. See
 * docs/assessments.md.
 */
export interface FileStorage {
  /** Saves the bytes under `key`, replacing any file already there. */
  put(key: string, data: Buffer): Promise<void>;
  /** Deletes the file. Does nothing if it's already gone. */
  remove(key: string): Promise<void>;
  /** The file's absolute path on this machine, or null if it doesn't exist. */
  localPath(key: string): Promise<string | null>;
}

/** Injection token for the active FileStorage. Tests override it. */
export const FILE_STORAGE = Symbol('FILE_STORAGE');
