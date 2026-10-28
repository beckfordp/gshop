import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fulfilmentClient,
  FulfilmentClientError,
  type FulfilmentTask,
} from './fulfilmentClient';

const task: FulfilmentTask = {
  orderId: 'order-1',
  state: 'PENDING',
  items: [
    {
      sku: 'watch-mido-commander',
      productName: 'Mido Commander',
      quantity: 2,
      unitPriceCents: 4500,
    },
  ],
  shippingAddress: {
    line1: '122 Wilmot Street',
    line2: null,
    city: 'London',
    postalCode: 'E2 0BU',
    country: 'GB',
  },
  trackingNo: null,
  carrier: null,
  failureReason: null,
  createdAt: '2026-10-28T14:33:17Z',
  updatedAt: '2026-10-28T14:33:17Z',
};

const baseUrl = 'http://fulfilment.test';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

async function captureError(
  promise: Promise<unknown>,
): Promise<FulfilmentClientError> {
  try {
    await promise;
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(FulfilmentClientError);
    return error as FulfilmentClientError;
  }
}

describe('fulfilmentClient', () => {
  afterEach(() => {
    fulfilmentClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it('GETs the task list', async () => {
    fulfilmentClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse([task]));

    const result = await fulfilmentClient.listTasks();

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/fulfilment-tasks`);
    expect(result).toEqual([task]);
  });

  it('POSTs start-picking and pack without a body', async () => {
    fulfilmentClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ ...task, state: 'PICKING' }));

    const picking = await fulfilmentClient.startPicking('order-1');
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/fulfilment-tasks/order-1/start-picking`,
      { method: 'POST' },
    );
    expect(picking.state).toBe('PICKING');

    fetchMock.mockResolvedValue(jsonResponse({ ...task, state: 'PACKED' }));
    const packed = await fulfilmentClient.pack('order-1');
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/fulfilment-tasks/order-1/pack`,
      { method: 'POST' },
    );
    expect(packed.state).toBe('PACKED');
  });

  it('POSTs dispatch with tracking number and carrier', async () => {
    fulfilmentClient.baseUrl = baseUrl;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ ...task, state: 'DISPATCHED', trackingNo: 'GLN-42', carrier: 'DHL' }),
    );

    const result = await fulfilmentClient.dispatch('order-1', 'GLN-42', 'DHL');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/fulfilment-tasks/order-1/dispatch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNo: 'GLN-42', carrier: 'DHL' }),
      },
    );
    expect(result.state).toBe('DISPATCHED');
  });

  it('POSTs fail with the reason', async () => {
    fulfilmentClient.baseUrl = baseUrl;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ ...task, state: 'DISPATCH_FAILED', failureReason: 'Box crushed' }),
    );

    const result = await fulfilmentClient.fail('order-1', 'Box crushed');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/fulfilment-tasks/order-1/fail`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Box crushed' }),
      },
    );
    expect(result.failureReason).toBe('Box crushed');
  });

  it('url-encodes the order id', async () => {
    fulfilmentClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(task));

    await fulfilmentClient.pack('a b/c');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/fulfilment-tasks/a%20b%2Fc/pack`,
      { method: 'POST' },
    );
  });

  it('surfaces the server error message and status on 409/404', async () => {
    fulfilmentClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: 'Cannot pack a PENDING task' }, 409),
    );
    const conflict = await captureError(fulfilmentClient.pack('order-1'));
    expect(conflict.message).toBe('Cannot pack a PENDING task');
    expect(conflict.status).toBe(409);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: 'Fulfilment task not found' }, 404),
    );
    const missing = await captureError(fulfilmentClient.startPicking('nope'));
    expect(missing.message).toBe('Fulfilment task not found');
    expect(missing.status).toBe(404);
  });

  it('falls back when the error body is not JSON', async () => {
    fulfilmentClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500 }),
    );

    const error = await captureError(fulfilmentClient.listTasks());

    expect(error.message).toBe('Fulfilment request failed with status 500');
    expect(error.status).toBe(500);
  });

  it('reports a network failure', async () => {
    fulfilmentClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    const error = await captureError(fulfilmentClient.listTasks());

    expect(error.message).toBe('Failed to reach fulfilment service: fetch failed');
  });

  it('reports a missing service URL', async () => {
    fulfilmentClient.baseUrl = undefined;

    const error = await captureError(fulfilmentClient.listTasks());

    expect(error.message).toBe('Fulfilment service URL is not configured');
  });
});
