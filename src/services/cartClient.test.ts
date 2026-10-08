import { afterEach, describe, expect, it, vi } from 'vitest';
import { cartClient, CartClientError } from './cartClient';

describe('cartClient', () => {
  const baseUrl = 'http://cart.test';
  const cartBody = {
    id: 'cart-1',
    items: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  afterEach(() => {
    cartClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it('create() POSTs to /carts and returns the parsed cart', async () => {
    cartClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(cartBody), { status: 201 }));

    const result = await cartClient.create();

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/carts`, { method: 'POST' });
    expect(result).toEqual(cartBody);
  });

  it('get(id) GETs /carts/{id} and returns the parsed cart', async () => {
    cartClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(cartBody), { status: 200 }));

    const result = await cartClient.get('cart-1');

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/carts/cart-1`, undefined);
    expect(result).toEqual(cartBody);
  });

  it('addItem(id, sku, quantity) POSTs the item body and returns the updated cart', async () => {
    cartClient.baseUrl = baseUrl;
    const updated = { ...cartBody, items: { 'watch-rolex-submariner': 1 } };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(updated), { status: 200 }));

    const result = await cartClient.addItem('cart-1', 'watch-rolex-submariner', 1);

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/carts/cart-1/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'watch-rolex-submariner', quantity: 1 }),
    });
    expect(result).toEqual(updated);
  });

  it('removeItem(id, sku) DELETEs the item and returns the updated cart', async () => {
    cartClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(cartBody), { status: 200 }));

    const result = await cartClient.removeItem('cart-1', 'watch-rolex-submariner');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/carts/cart-1/items/watch-rolex-submariner`,
      { method: 'DELETE' },
    );
    expect(result).toEqual(cartBody);
  });

  it('throws CartClientError on a non-2xx response', async () => {
    cartClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Cart not found' }), { status: 404 }),
    );

    await expect(cartClient.get('missing')).rejects.toThrow(CartClientError);
  });

  it('throws CartClientError when the network request fails', async () => {
    cartClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(cartClient.create()).rejects.toThrow(CartClientError);
  });

  it('throws CartClientError when the base URL is not configured', async () => {
    cartClient.baseUrl = undefined;

    await expect(cartClient.get('cart-1')).rejects.toThrow(CartClientError);
  });
});
