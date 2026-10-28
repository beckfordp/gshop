// Per-browser identity registry (prototype): maps a userId to the email it
// signed up/logged in with, so Order History can show a User badge. Orders
// only carry customerId until the order contract gains userId (follow-up).
// Cross-browser identities remain anonymous.

const KNOWN_IDENTITIES_KEY = 'gshop:knownIdentities';

export type OrderIdentity =
  | { type: 'user'; userId: string; email: string }
  | { type: 'anonymous'; customerId: string };

function read(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KNOWN_IDENTITIES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberIdentity(userId: string, email: string): void {
  try {
    const next = { ...read(), [userId]: email };
    localStorage.setItem(KNOWN_IDENTITIES_KEY, JSON.stringify(next));
  } catch {
    // Best-effort; identity badges fall back to Anonymous.
  }
}

export function resolveIdentity(customerId: string): OrderIdentity {
  const email = read()[customerId];
  return email
    ? { type: 'user', userId: customerId, email }
    : { type: 'anonymous', customerId };
}
