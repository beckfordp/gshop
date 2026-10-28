// Prototype-only identity types. Replaced by user-service's real contracts
// when Checkout Journey 2's backend lands — see gluon/docs/system-design.md.

export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  // Present after a real login; no refresh endpoint exists yet.
  refreshToken?: string;
}
