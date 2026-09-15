import { NodeEnv, validateEnv } from './env.validation';

const required = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/tmx_hr',
  FRONTEND_URL: 'http://localhost:3000',
};

describe('validateEnv', () => {
  it('applies defaults to optional values', () => {
    const env = validateEnv(required);

    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(4000);
    expect(env.SESSION_TTL_DAYS).toBe(7);
    expect(env.TRUST_PROXY).toBe(0);
    expect(env.EMAIL_FROM).toBe('TMX HR <onboarding@resend.dev>');
  });

  it('converts numeric strings to numbers', () => {
    expect(validateEnv({ ...required, PORT: '5000' }).PORT).toBe(5000);
  });

  it('treats empty values as unset', () => {
    const env = validateEnv({ ...required, PORT: '', RESEND_API_KEY: '' });

    expect(env.PORT).toBe(4000);
    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  it('fails when a required value is missing', () => {
    expect(() => validateEnv({ FRONTEND_URL: required.FRONTEND_URL })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rejects a non-postgres database URL', () => {
    expect(() =>
      validateEnv({ ...required, DATABASE_URL: 'mysql://localhost/db' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('requires RESEND_API_KEY in production only', () => {
    const production = { ...required, NODE_ENV: 'production' };

    expect(() => validateEnv(production)).toThrow(/RESEND_API_KEY/);
    expect(
      validateEnv({ ...production, RESEND_API_KEY: 're_123' }).RESEND_API_KEY,
    ).toBe('re_123');
  });
});
