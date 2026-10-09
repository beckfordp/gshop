import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderClient, OrderClientError } from './orderClient';

describe('orderClient.create', () => {
  const baseUrl = 'http://order.test';
  const orderBody = {
    id: 'order-1',
    customerId: 'cart-1',
    totalCents: 1999,
    status: 'pending',
    items: [
      {
        id: 'item-1',
        sku: 'WID-1',
        productName: 'Widget',
        unitPriceCents: 1999,
        quantity: 1,
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    reservationFailure: null,
  };

  afterEach(() => {
    orderClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it('POSTs to /orders with the customerId and items, and returns the parsed order', async () => {
    orderClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(orderBody), { status: 201 }));

    const result = await orderClient.create({
      customerId: 'cart-1',
      items: [{ sku: 'WID-1', productName: 'Widget', unitPriceCents: 1999, quantity: 1 }],
    });

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'cart-1',
        items: [{ sku: 'WID-1', productName: 'Widget', unitPriceCents: 1999, quantity: 1 }],
      }),
    });
    expect(result).toEqual(orderBody);
  });

  it('returns the order even when status is reservation_failed (still a 201, not an error), including the failure detail', async () => {
    orderClient.baseUrl = baseUrl;
    const failedOrder = {
      ...orderBody,
      status: 'reservation_failed',
      reservationFailure: { sku: 'WID-1', reason: "insufficient stock for sku 'WID-1'" },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(failedOrder), { status: 201 }),
    );

    const result = await orderClient.create({
      customerId: 'cart-1',
      items: [{ sku: 'WID-1', productName: 'Widget', unitPriceCents: 1999, quantity: 1 }],
    });

    expect(result.status).toBe('reservation_failed');
    expect(result.reservationFailure).toEqual({
      sku: 'WID-1',
      reason: "insufficient stock for sku 'WID-1'",
    });
  });

  it('throws OrderClientError on a non-2xx response', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Order must have at least one item' }), {
        status: 400,
      }),
    );

    await expect(
      orderClient.create({ customerId: 'cart-1', items: [] }),
    ).rejects.toThrow(OrderClientError);
  });

  it('throws OrderClientError when the network request fails', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      orderClient.create({
        customerId: 'cart-1',
        items: [{ sku: 'WID-1', productName: 'Widget', unitPriceCents: 1999, quantity: 1 }],
      }),
    ).rejects.toThrow(OrderClientError);
  });

  it('throws OrderClientError when the base URL is not configured', async () => {
    orderClient.baseUrl = undefined;

    await expect(
      orderClient.create({
        customerId: 'cart-1',
        items: [{ sku: 'WID-1', productName: 'Widget', unitPriceCents: 1999, quantity: 1 }],
      }),
    ).rejects.toThrow(OrderClientError);
  });
});

describe('orderClient.list', () => {
  const baseUrl = 'http://order.test';
  const order = {
    id: 'order-1',
    customerId: 'customer-1',
    totalCents: 1999,
    status: 'pending',
    items: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    reservationFailure: null,
  };

  afterEach(() => {
    orderClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it('GETs /orders?customerId=... and returns the parsed list', async () => {
    orderClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([order]), { status: 200 }));

    const result = await orderClient.list('customer-1');

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/orders?customerId=customer-1`);
    expect(result).toEqual([order]);
  });

  it('throws OrderClientError on a non-2xx response', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    await expect(orderClient.list('customer-1')).rejects.toThrow(OrderClientError);
  });

  it('throws OrderClientError when the network request fails', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(orderClient.list('customer-1')).rejects.toThrow(OrderClientError);
  });
});
