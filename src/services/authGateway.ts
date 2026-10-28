import { AUTH_MOCK_ENABLED } from './env';
import {
  saveSession,
  signIn as mockSignIn,
  signUp as mockSignUp,
} from './mockAuth';
import { rememberIdentity } from './identityStore';
import { userClient } from './userClient';
import type { AuthSession } from './authTypes';

// One auth API for the UI: the real user-service by default, or the
// in-browser mock when VITE_AUTH_MOCK=true. Both record the identity locally
// so Order History can show a User badge.

export interface AuthGateway {
  signup(email: string, password: string): Promise<AuthSession>;
  login(email: string, password: string): Promise<AuthSession>;
}

export interface AuthGatewayDeps {
  userClient: Pick<typeof userClient, 'signup' | 'login'>;
  mock: {
    signUp: typeof mockSignUp;
    signIn: typeof mockSignIn;
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createAuthGateway(
  mockEnabled: boolean,
  deps: AuthGatewayDeps = {
    userClient,
    mock: { signUp: mockSignUp, signIn: mockSignIn },
  },
): AuthGateway {
  if (mockEnabled) {
    return {
      async signup(email, password) {
        const session = await deps.mock.signUp(email, password);
        rememberIdentity(session.user.userId, session.user.email);
        return session;
      },
      async login(email, password) {
        const session = await deps.mock.signIn(email, password);
        rememberIdentity(session.user.userId, session.user.email);
        return session;
      },
    };
  }

  return {
    async signup(email, password) {
      const result = await deps.userClient.signup(email, password);
      const session: AuthSession = {
        user: { userId: result.userId, email: normalizeEmail(email) },
        token: result.token,
      };
      rememberIdentity(session.user.userId, session.user.email);
      saveSession(session);
      return session;
    },
    async login(email, password) {
      const result = await deps.userClient.login(email, password);
      const session: AuthSession = {
        user: { userId: result.userId, email: normalizeEmail(email) },
        token: result.token,
        refreshToken: result.refreshToken,
      };
      rememberIdentity(session.user.userId, session.user.email);
      saveSession(session);
      return session;
    },
  };
}

export const authGateway = createAuthGateway(AUTH_MOCK_ENABLED);
