// A persistent, checkout-independent anonymous customer identity. Unlike
// the cart id (src/services/cartId.ts), this is never cleared — it's
// minted once and reused for every checkout's `customerId` and every
// order-history lookup, so history survives across the cart id resetting
// after each successful checkout. No server round trip needed; generated
// entirely client-side.
const CUSTOMER_ID_KEY = 'gshop:customerId';

export function getOrCreateCustomerId(): string {
  const existing = getStoredCustomerId();
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  localStorage.setItem(CUSTOMER_ID_KEY, id);
  return id;
}

export function getStoredCustomerId(): string | null {
  return localStorage.getItem(CUSTOMER_ID_KEY);
}
