import { afterEach, describe, expect, it } from 'vitest';
import {
  AuthError,
  getSession,
  resolveIdentity,
  signIn,
  signOut,
  signUp,
} from './mockAuth';

const EMAIL = 'ada@example.com';
const PASSWORD = 'correct horse battery';

describe('mockAuth', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('signUp creates a session and persists it', async () => {
    const session = await signUp(EMAIL, PASSWORD);

    expect(session.user.email).toBe(EMAIL);
    expect(session.user.userId).not.toBe('');
    expect(session.token).not.toBe('');
    expect(getSession()).toEqual(session);
  });

  it('normalises the email for signup and login', async () => {
    const created = await signUp('  Ada@Example.COM ', PASSWORD);

    expect(created.user.email).toBe(EMAIL);
    await expect(signIn('ada@example.com', PASSWORD)).resolves.toMatchObject({
      user: created.user,
    });
  });

  it('stores only a hash of the password', async () => {
    await signUp(EMAIL, PASSWORD);

    const raw = JSON.stringify(localStorage);
    expect(raw).not.toContain(PASSWORD);
    const users = JSON.parse(localStorage.getItem('gshop:mockUsers') ?? '[]');
    expect(users[0].passwordHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects a second signup for the same email, case-insensitively', async () => {
    await signUp(EMAIL, PASSWORD);

    await expect(signUp('ADA@example.com', 'another password')).rejects.toThrow(
      AuthError,
    );
    await expect(signUp(EMAIL, PASSWORD)).rejects.toThrow(
      'An account with this email already exists',
    );
  });

  it('signIn succeeds with the right password', async () => {
    const created = await signUp(EMAIL, PASSWORD);

    const session = await signIn(EMAIL, PASSWORD);
    expect(session.user).toEqual(created.user);
    expect(session.token).not.toBe('');
  });

  it('signIn rejects an unknown email with the generic message', async () => {
    await expect(signIn(EMAIL, PASSWORD)).rejects.toThrow(
      'Email or password is incorrect',
    );
  });

  it('signIn rejects a wrong password with the same generic message', async () => {
    await signUp(EMAIL, PASSWORD);

    await expect(signIn(EMAIL, 'wrong password')).rejects.toThrow(
      'Email or password is incorrect',
    );
  });

  it('signOut clears the stored session but keeps the account', async () => {
    await signUp(EMAIL, PASSWORD);

    signOut();

    expect(getSession()).toBeNull();
    await expect(signIn(EMAIL, PASSWORD)).resolves.toMatchObject({
      user: { email: EMAIL },
    });
  });

  it('getSession returns null for corrupt storage', () => {
    localStorage.setItem('gshop:authSession', '{not json');

    expect(getSession()).toBeNull();
  });

  it('resolveIdentity maps a stored user id to their email', async () => {
    const session = await signUp(EMAIL, PASSWORD);

    expect(resolveIdentity(session.user.userId)).toEqual({
      type: 'user',
      userId: session.user.userId,
      email: EMAIL,
    });
  });

  it('resolveIdentity treats an unknown id as anonymous', () => {
    expect(resolveIdentity('anonymous-1')).toEqual({
      type: 'anonymous',
      customerId: 'anonymous-1',
    });
  });
});
