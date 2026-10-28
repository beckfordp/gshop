import { USER_SERVICE_URL } from './env';
import { serverErrorMessage } from './httpError';
import { errorMessage } from '../lib/format';

// Real user-service auth contracts (US-16.1/16.2):
// gluon/docs/system-design.md's "REST contracts". Tokens are opaque; only the
// user-service stores their hashes.

export interface SignupResult {
  userId: string;
  token: string;
}

export interface LoginResult {
  userId: string;
  token: string;
  refreshToken: string;
}

export class UserClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'UserClientError';
    this.status = status;
  }
}

async function post<T>(
  path: string,
  body: { email: string; password: string },
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  if (!userClient.baseUrl) {
    throw new UserClientError('User service URL is not configured');
  }

  let response: Response;
  try {
    response = await fetch(`${userClient.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    throw new UserClientError(`Failed to reach user service: ${errorMessage(error)}`);
  }

  if (!response.ok) {
    const fallback = `User request failed with status ${response.status}`;
    throw new UserClientError(
      await serverErrorMessage(response, fallback),
      response.status,
    );
  }

  return (await response.json()) as T;
}

async function signup(
  email: string,
  password: string,
  options: { signal?: AbortSignal } = {},
): Promise<SignupResult> {
  return post<SignupResult>('/auth/signup', { email, password }, options);
}

async function login(
  email: string,
  password: string,
  options: { signal?: AbortSignal } = {},
): Promise<LoginResult> {
  return post<LoginResult>('/auth/login', { email, password }, options);
}

export const userClient: {
  baseUrl: string | undefined;
  signup: typeof signup;
  login: typeof login;
} = {
  baseUrl: USER_SERVICE_URL,
  signup,
  login,
};
