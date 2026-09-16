import { frontendLink, frontendPathLink } from './frontend-links';

describe('frontend links', () => {
  it('puts the token in the query string', () => {
    expect(
      frontendLink('https://hr.example.com', '/reset-password', 'a_b-c'),
    ).toBe('https://hr.example.com/reset-password?token=a_b-c');
  });

  it('puts the token in the path', () => {
    expect(frontendPathLink('https://hr.example.com/', '/take', 'a_b-c')).toBe(
      'https://hr.example.com/take/a_b-c',
    );
  });
});
