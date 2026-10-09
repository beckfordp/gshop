import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateCustomerId, getStoredCustomerId } from './customerId';

describe('getOrCreateCustomerId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the existing localStorage id without generating a new one', () => {
    localStorage.setItem('gshop:customerId', 'existing-customer-id');
    const randomUUID = vi.spyOn(crypto, 'randomUUID');

    const id = getOrCreateCustomerId();

    expect(id).toBe('existing-customer-id');
    expect(randomUUID).not.toHaveBeenCalled();
  });

  it('creates and persists a UUID when none is stored', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');

    const id = getOrCreateCustomerId();

    expect(id).toBe('11111111-1111-1111-1111-111111111111');
    expect(localStorage.getItem('gshop:customerId')).toBe('11111111-1111-1111-1111-111111111111');
  });
});

describe('getStoredCustomerId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no customer id is stored', () => {
    expect(getStoredCustomerId()).toBeNull();
  });

  it('returns the stored customer id without creating one', () => {
    localStorage.setItem('gshop:customerId', 'existing-customer-id');

    expect(getStoredCustomerId()).toBe('existing-customer-id');
  });
});
