import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderClient, OrderClientError, type Order } from './orderClient';

const shippingAddress = {
  line1: '1 Watchmaker Lane',
  city: 'London',
  postalCode: 'EC1A 1BB',
  country: 'GB',
};

const orderBody: Order = {
  id: 'order-1',
  customerId: 'cart-1',
  totalCents: 1999,
  status: 'authorized',
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
  shippingAddress,
  reservationFailure: null,
  paymentFailure: null,
};

const createInput = {
  customerId: 'cart-1',
  items: [{ sku: 'WID-1', productName: 'Widget', unitPriceCents: 1999, quantity: 1 }],
  shippingAddress,
  paymentMethodId: 'pm-1',
};

describe('orderClient.create', () => {
  const baseUrl = 'http://order.test';

  afterEach(() => {
    orderClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it('POSTs to /orders with the checkout payload and returns the parsed order', async () => {
    orderClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(orderBody), { status: 201 }));

    const result = await orderClient.create(createInput);

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createInput),
    });
    expect(result).toEqual(orderBody);
  });

  it('returns the order even when status is reservation_failed, including the failed line', async () => {
    orderClient.baseUrl = baseUrl;
    const failedOrder: Order = {
      ...orderBody,
      status: 'reservation_failed',
      reservationFailure: {
        sku: 'WID-1',
        reason: "insufficient stock for sku 'WID-1'",
      },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(failedOrder), { status: 201 }),
    );

    const result = await orderClient.create(createInput);

    expect(result.status).toBe('reservation_failed');
    expect(result.reservationFailure).toEqual({
      sku: 'WID-1',
      reason: "insufficient stock for sku 'WID-1'",
    });
  });

  it('returns the order when status is payment_failed, including the decline reason', async () => {
    orderClient.baseUrl = baseUrl;
    const declinedOrder: Order = {
      ...orderBody,
      status: 'payment_failed',
      paymentFailure: { reason: 'insufficient_funds' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(declinedOrder), { status: 201 }),
    );

    const result = await orderClient.create(createInput);

    expect(result.status).toBe('payment_failed');
    expect(result.paymentFailure).toEqual({ reason: 'insufficient_funds' });
  });

  it('forwards an AbortSignal when supplied', async () => {
    orderClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(orderBody), { status: 201 }));
    const controller = new AbortController();

    await orderClient.create(createInput, { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createInput),
      signal: controller.signal,
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
      orderClient.create({ ...createInput, items: [] }),
    ).rejects.toThrow(OrderClientError);
  });

  it('throws OrderClientError when the network request fails', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(orderClient.create(createInput)).rejects.toThrow(OrderClientError);
  });

  it('throws OrderClientError when the base URL is not configured', async () => {
    orderClient.baseUrl = undefined;

    await expect(orderClient.create(createInput)).rejects.toThrow(OrderClientError);
  });
});

describe('orderClient.list', () => {
  const baseUrl = 'http://order.test';
  const order: Order = {
    ...orderBody,
    customerId: 'customer-1',
    items: [],
    status: 'pending',
    shippingAddress: null,
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

describe('orderClient.remove', () => {
  const baseUrl = 'http://order.test';

  afterEach(() => {
    orderClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it('DELETEs /orders/{id}', async () => {
    orderClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));

    await orderClient.remove('order-1');

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/orders/order-1`, { method: 'DELETE' });
  });

  it('throws OrderClientError on a non-2xx response, carrying the HTTP status', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    await expect(orderClient.remove('order-1')).rejects.toThrow(OrderClientError);
    try {
      await orderClient.remove('order-1');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(OrderClientError);
      expect((error as OrderClientError).status).toBe(404);
    }
  });

  it('throws OrderClientError when the network request fails, with no status', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    try {
      await orderClient.remove('order-1');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(OrderClientError);
      expect((error as OrderClientError).status).toBeUndefined();
    }
  });

  it('throws OrderClientError when the base URL is not configured', async () => {
    orderClient.baseUrl = undefined;

    await expect(orderClient.remove('order-1')).rejects.toThrow(OrderClientError);
  });
});
