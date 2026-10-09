import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateCartId, getStoredCartId } from './cartId';
import { cartClient } from './cartClient';

vi.mock('./cartClient', () => ({
  cartClient: { create: vi.fn() },
}));

const create = vi.mocked(cartClient.create);

describe('getOrCreateCartId', () => {
  beforeEach(() => {
    localStorage.clear();
    create.mockReset();
  });

  it('returns the existing localStorage id without calling cartClient.create()', async () => {
    localStorage.setItem('gshop:cartId', 'existing-cart-id');

    const id = await getOrCreateCartId();

    expect(id).toBe('existing-cart-id');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a cart and persists its id when none is stored', async () => {
    create.mockResolvedValue({
      id: 'new-cart-id',
      items: {},
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const id = await getOrCreateCartId();

    expect(id).toBe('new-cart-id');
    expect(create).toHaveBeenCalledOnce();
    expect(localStorage.getItem('gshop:cartId')).toBe('new-cart-id');
  });
});

describe('getStoredCartId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no cart id is stored', () => {
    expect(getStoredCartId()).toBeNull();
  });

  it('returns the stored cart id without creating one', () => {
    localStorage.setItem('gshop:cartId', 'existing-cart-id');

    expect(getStoredCartId()).toBe('existing-cart-id');
  });
});
