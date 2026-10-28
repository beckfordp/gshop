import { afterEach, describe, expect, it, vi } from 'vitest';
import { userClient, UserClientError } from './userClient';

const input = { email: 'ada@example.com', password: 'correct horse' };

describe('userClient', () => {
  const baseUrl = 'http://user.test';

  afterEach(() => {
    userClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it('signup POSTs /auth/signup and returns the userId + token', async () => {
    userClient.baseUrl = baseUrl;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ userId: 'user-1', token: 'token-1' }), {
        status: 201,
      }),
    );

    const result = await userClient.signup(input.email, input.password);

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    expect(result).toEqual({ userId: 'user-1', token: 'token-1' });
  });

  it('login POSTs /auth/login and returns userId, token and refreshToken', async () => {
    userClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          userId: 'user-1',
          token: 'token-1',
          refreshToken: 'refresh-1',
        }),
        { status: 200 },
      ),
    );

    const result = await userClient.login(input.email, input.password);

    expect(result).toEqual({
      userId: 'user-1',
      token: 'token-1',
      refreshToken: 'refresh-1',
    });
  });

  it('surfaces the server error message and status on 409', async () => {
    userClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'An account with this email already exists' }),
        { status: 409 },
      ),
    );

    try {
      await userClient.signup(input.email, input.password);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(UserClientError);
      expect((error as UserClientError).status).toBe(409);
      expect((error as UserClientError).message).toBe(
        'An account with this email already exists',
      );
    }
  });

  it('surfaces the generic 401 message', async () => {
    userClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Email or password is incorrect' }), {
        status: 401,
      }),
    );

    await expect(
      userClient.login(input.email, 'wrong'),
    ).rejects.toThrow('Email or password is incorrect');
  });

  it('throws UserClientError when the network fails', async () => {
    userClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      userClient.signup(input.email, input.password),
    ).rejects.toBeInstanceOf(UserClientError);
  });

  it('throws when the base URL is not configured', async () => {
    userClient.baseUrl = undefined;

    await expect(
      userClient.signup(input.email, input.password),
    ).rejects.toThrow('User service URL is not configured');
  });
});
