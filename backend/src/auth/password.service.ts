import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// Argon2id (the library default) with OWASP's baseline cost:
// 19 MiB of memory, 2 iterations, 1 degree of parallelism.
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService {
  // Verified against when the email is unknown, so a failed sign-in takes the
  // same time whether or not the account exists.
  private readonly dummyHash = hash(
    'tmx-assessment-timing-equalizer',
    ARGON2_OPTIONS,
  );

  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  /** Takes as long as verify() does, for an account that doesn't exist. */
  async verifyAgainstDummy(password: string): Promise<void> {
    await this.verify(await this.dummyHash, password);
  }
}
