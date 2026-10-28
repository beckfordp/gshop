import type { Address } from './checkoutTypes';

// Prototype-only saved checkout address, keyed by the mock user id (US-16.5).
// Replaced by user-service's address storage when it lands. Card details are
// never stored — only the two addresses and the "same as shipping" choice.

export interface SavedCheckoutAddress {
  shipping: Address;
  billing: Address;
  sameAsShipping: boolean;
}

function storageKey(userId: string): string {
  return `gshop:savedAddress:${userId}`;
}

function isAddress(value: unknown): value is Address {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const address = value as Record<string, unknown>;
  return ['line1', 'city', 'postalCode', 'country'].every(
    (field) => typeof address[field] === 'string' && address[field] !== '',
  );
}

export function saveCheckoutAddress(
  userId: string,
  saved: SavedCheckoutAddress,
): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(saved));
  } catch {
    // Storage can be unavailable (private mode, quota); saving is best-effort.
  }
}

export function getCheckoutAddress(
  userId: string,
): SavedCheckoutAddress | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return null;
    }
    const saved = JSON.parse(raw) as SavedCheckoutAddress;
    return isAddress(saved.shipping) &&
      isAddress(saved.billing) &&
      typeof saved.sameAsShipping === 'boolean'
      ? saved
      : null;
  } catch {
    return null;
  }
}
