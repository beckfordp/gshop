import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthGateway } from './authGateway';
import { getSession } from './mockAuth';
import { resolveIdentity } from './identityStore';

const EMAIL = 'ada@example.com';
const PASSWORD = 'correct horse';

function deps() {
  return {
    userClient: {
      signup: vi.fn(),
      login: vi.fn(),
    },
    mock: {
      signUp: vi.fn(),
      signIn: vi.fn(),
    },
  };
}

describe('createAuthGateway', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('real signup maps the response, persists the session and remembers the identity', async () => {
    const d = deps();
    d.userClient.signup.mockResolvedValue({ userId: 'user-1', token: 'token-1' });
    const gateway = createAuthGateway(false, d);

    const session = await gateway.signup('  Ada@Example.COM ', PASSWORD);

    expect(session).toEqual({
      user: { userId: 'user-1', email: EMAIL },
      token: 'token-1',
    });
    expect(getSession()).toEqual(session);
    expect(resolveIdentity('user-1')).toMatchObject({ type: 'user', email: EMAIL });
  });

  it('real login keeps the refresh token', async () => {
    const d = deps();
    d.userClient.login.mockResolvedValue({
      userId: 'user-1',
      token: 'token-1',
      refreshToken: 'refresh-1',
    });
    const gateway = createAuthGateway(false, d);

    const session = await gateway.login(EMAIL, PASSWORD);

    expect(session.refreshToken).toBe('refresh-1');
    expect(getSession()).toEqual(session);
  });

  it('uses the mock when enabled', async () => {
    const d = deps();
    const mockSession = {
      user: { userId: 'user-1', email: EMAIL },
      token: 'token-1',
    };
    d.mock.signUp.mockResolvedValue(mockSession);
    const gateway = createAuthGateway(true, d);

    await expect(gateway.signup(EMAIL, PASSWORD)).resolves.toEqual(mockSession);
    expect(d.userClient.signup).not.toHaveBeenCalled();
  });
});
