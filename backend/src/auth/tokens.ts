import { createHash, randomBytes } from 'node:crypto';

/**
 * A random, URL-safe token with 256 bits of entropy. It's given to the user once
 * (in a cookie or an email link) and never stored.
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * What the database stores instead of the token. The tokens are random and
 * long, so a fast hash is enough; a slow password hash would add nothing.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
