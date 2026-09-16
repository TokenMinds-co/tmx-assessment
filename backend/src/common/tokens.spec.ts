import { generateToken, hashToken } from './tokens';

describe('tokens', () => {
  it('generates unique, URL-safe tokens', () => {
    const token = generateToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(token);
  });

  it('hashes deterministically to a SHA-256 hex digest', () => {
    const token = generateToken();

    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toBe(hashToken(generateToken()));
  });
});
