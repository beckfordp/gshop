import { sha256Hex } from '../lib/sha256';
import type { AuthSession } from './authTypes';

// In-browser stand-in for user-service (US-16, Checkout Journey 2). Prototype
// only: accounts and the fake token live in localStorage, no request leaves the
// browser, and the password is stored only as a SHA-256 hash. Replaced by a
// real userClient when the service lands.

const USERS_KEY = 'gshop:mockUsers';
const SESSION_KEY = 'gshop:authSession';

interface MockUserRecord {
  userId: string;
  email: string;
  passwordHash: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readUsers(): MockUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as MockUserRecord[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: MockUserRecord[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function hashPassword(email: string, password: string): string {
  return sha256Hex(`${email}:${password}`);
}

export async function signUp(
  email: string,
  password: string,
): Promise<AuthSession> {
  const normalised = normaliseEmail(email);
  const users = readUsers();
  if (users.some((user) => user.email === normalised)) {
    throw new AuthError('An account with this email already exists');
  }

  const record: MockUserRecord = {
    userId: crypto.randomUUID(),
    email: normalised,
    passwordHash: hashPassword(normalised, password),
  };
  writeUsers([...users, record]);

  const session: AuthSession = {
    user: { userId: record.userId, email: record.email },
    token: crypto.randomUUID(),
  };
  saveSession(session);
  return session;
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthSession> {
  const normalised = normaliseEmail(email);
  const user = readUsers().find((candidate) => candidate.email === normalised);
  // Same message for an unknown email and a wrong password — don't leak which.
  if (!user || user.passwordHash !== hashPassword(normalised, password)) {
    throw new AuthError('Email or password is incorrect');
  }

  const session: AuthSession = {
    user: { userId: user.userId, email: user.email },
    token: crypto.randomUUID(),
  };
  saveSession(session);
  return session;
}

export type OrderIdentity =
  | { type: 'user'; userId: string; email: string }
  | { type: 'anonymous'; customerId: string };

/** Resolves an order's customerId to a reviewed identity: a known mock user
  * (matched by userId) or an anonymous browser id. Prototype-only join — the
  * real design adds a nullable userId to the order contract instead. */
export function resolveIdentity(customerId: string): OrderIdentity {
  const user = readUsers().find((candidate) => candidate.userId === customerId);
  return user
    ? { type: 'user', userId: customerId, email: user.email }
    : { type: 'anonymous', customerId };
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw) as AuthSession;
    return session.user?.userId && session.token ? session : null;
  } catch {
    return null;
  }
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY);
}
