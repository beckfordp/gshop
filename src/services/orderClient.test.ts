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

  async function captureError(promise: Promise<unknown>): Promise<OrderClientError> {
    try {
      await promise;
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(OrderClientError);
      return error as OrderClientError;
    }
  }

  it('POSTs to /orders with the checkout payload and returns the created order', async () => {
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
    expect(result).toEqual({ kind: 'created', order: orderBody });
  });

  it('throws if a 201 carries a status other than authorized', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ...orderBody, status: 'pending' }), {
        status: 201,
      }),
    );

    const error = await captureError(orderClient.create(createInput));

    expect(error.status).toBe(201);
    expect(error.message).toBe('Unexpected order status: pending');
  });

  it('maps 402 to a decline with the response reason', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'Payment declined',
          paymentFailure: { reason: 'insufficient_funds' },
        }),
        { status: 402 },
      ),
    );

    const result = await orderClient.create(createInput);

    expect(result).toEqual({ kind: 'declined', reason: 'insufficient_funds' });
  });

  it('falls back to a generic decline reason when the body omits one', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Payment declined' }), { status: 402 }),
    );

    const result = await orderClient.create(createInput);

    expect(result).toEqual({ kind: 'declined', reason: 'declined' });
  });

  it('maps 409 to every failed reservation line', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'Insufficient stock',
          reservationFailures: [
            { sku: 'WID-1', reason: 'insufficient_stock' },
            { sku: 'GAD-1', reason: 'unknown_sku' },
          ],
        }),
        { status: 409 },
      ),
    );

    const result = await orderClient.create(createInput);

    expect(result).toEqual({
      kind: 'stock_unavailable',
      failures: [
        { sku: 'WID-1', reason: 'insufficient_stock' },
        { sku: 'GAD-1', reason: 'unknown_sku' },
      ],
    });
  });

  it('throws OrderClientError with the server error message on 400', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Order must have at least one item' }), {
        status: 400,
      }),
    );

    const error = await captureError(orderClient.create({ ...createInput, items: [] }));

    expect(error.status).toBe(400);
    expect(error.message).toBe('Order must have at least one item');
  });

  it('throws OrderClientError with the server error message on 503', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Payment service unavailable' }), {
        status: 503,
      }),
    );

    const error = await captureError(orderClient.create(createInput));

    expect(error.status).toBe(503);
    expect(error.message).toBe('Payment service unavailable');
  });

  it('falls back to a status-based message when an error body is not JSON', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>boom</html>', { status: 500 }),
    );

    const error = await captureError(orderClient.create(createInput));

    expect(error.status).toBe(500);
    expect(error.message).toBe('Order request failed with status 500');
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

  it('throws OrderClientError when the network request fails', async () => {
    orderClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await captureError(orderClient.create(createInput));

    expect(error.status).toBeUndefined();
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
