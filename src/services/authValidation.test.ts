import { describe, expect, it } from 'vitest';
import { validateSignIn, validateSignUp } from './authValidation';

describe('validateSignUp', () => {
  const valid = {
    email: 'ada@example.com',
    password: 'correct horse',
    confirmPassword: 'correct horse',
  };

  it('accepts a valid form', () => {
    expect(validateSignUp(valid)).toEqual({});
  });

  it('rejects a malformed email', () => {
    expect(validateSignUp({ ...valid, email: 'not-an-email' })).toMatchObject({
      email: expect.stringContaining('valid email'),
    });
  });

  it('requires a password of at least 8 characters', () => {
    expect(
      validateSignUp({ ...valid, password: 'short', confirmPassword: 'short' }),
    ).toMatchObject({ password: expect.stringContaining('8 characters') });
  });

  it('requires the confirmation to match', () => {
    expect(
      validateSignUp({ ...valid, confirmPassword: 'different' }),
    ).toMatchObject({ confirmPassword: expect.stringContaining('match') });
  });
});

describe('validateSignIn', () => {
  const valid = { email: 'ada@example.com', password: 'anything' };

  it('accepts a valid form', () => {
    expect(validateSignIn(valid)).toEqual({});
  });

  it('rejects a malformed email', () => {
    expect(validateSignIn({ ...valid, email: 'nope' })).toMatchObject({
      email: expect.any(String),
    });
  });

  it('requires a password', () => {
    expect(validateSignIn({ ...valid, password: '' })).toMatchObject({
      password: expect.any(String),
    });
  });
});
