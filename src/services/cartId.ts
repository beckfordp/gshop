import { cartClient } from './cartClient';

// cart-service has no auth/session system — carts are anonymous UUIDs with
// no way to look one up except by that exact id. Only the id is persisted
// client-side; cart contents always come from the server.
const CART_ID_KEY = 'gshop:cartId';

export async function getOrCreateCartId(): Promise<string> {
  const existing = getStoredCartId();
  if (existing) {
    return existing;
  }

  const cart = await cartClient.create();
  localStorage.setItem(CART_ID_KEY, cart.id);
  return cart.id;
}

export function getStoredCartId(): string | null {
  return localStorage.getItem(CART_ID_KEY);
}
