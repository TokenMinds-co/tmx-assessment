import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('hashes with Argon2id and never stores the password', async () => {
    const hash = await passwords.hash('correct horse battery');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('correct horse');
  });

  it('salts each hash', async () => {
    const [first, second] = await Promise.all([
      passwords.hash('same password 123'),
      passwords.hash('same password 123'),
    ]);

    expect(first).not.toBe(second);
  });

  it('accepts only the right password', async () => {
    const hash = await passwords.hash('the right password');

    await expect(passwords.verify(hash, 'the right password')).resolves.toBe(
      true,
    );
    await expect(passwords.verify(hash, 'the wrong password')).resolves.toBe(
      false,
    );
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    await expect(passwords.verify('not-a-hash', 'anything')).resolves.toBe(
      false,
    );
  });
});
