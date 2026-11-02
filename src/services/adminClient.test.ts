import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminClient, AdminClientError } from './adminClient';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const flag = {
  orderId: 'order-1',
  reason: 'capture_after_void',
  status: 'open',
  createdAt: '2026-11-02T10:00:00Z',
  operatorId: null,
  note: null,
  resolvedAt: null,
};

describe('adminClient', () => {
  beforeEach(() => {
    adminClient.urls = {
      order: 'http://order.test',
      payment: 'http://payment.test',
      fulfilment: 'http://fulfilment.test',
      inventory: 'http://inventory.test',
      notification: 'http://notification.test',
      user: 'http://user.test',
    };
    adminClient.operatorToken = 'test-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists admin orders with only the non-blank filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([]));

    await adminClient.listOrders({ status: 'authorized', customerId: '' });

    expect(fetchMock).toHaveBeenCalledWith('http://order.test/admin/orders?status=authorized');
  });

  it('reads one order’s reservation ledger', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([]));

    await adminClient.reservations('order-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://inventory.test/inventorys/order-reservations?orderId=order-1',
    );
  });

  it('merges every service’s flags newest first and reports a failing service', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('http://payment.test')) {
        return json([{ ...flag, createdAt: '2026-11-02T12:00:00Z' }]);
      }
      if (url.startsWith('http://inventory.test')) {
        return json({ error: 'boom' }, 500);
      }
      return json(url.startsWith('http://order.test') ? [flag] : []);
    });

    const { rows, failures } = await adminClient.allReconciliations({ status: 'open' });

    expect(rows.map((row) => row.service)).toEqual(['payment', 'order']);
    expect(failures).toEqual(['boom']);
  });

  it('resolves a flag with the operator token and note', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ ...flag, status: 'resolved', operatorId: 'dev-operator' }));

    const row = await adminClient.resolveReconciliation('fulfilment', 'order-1', 'checked');

    expect(row.service).toBe('fulfilment');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://fulfilment.test/reconciliations/order-1');
    expect(init?.method).toBe('PATCH');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    expect(JSON.parse(String(init?.body))).toEqual({ status: 'resolved', note: 'checked' });
  });

  it('operator-cancels with the token and surfaces a 409', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ error: 'Order is dispatched' }, 409));

    const error = await adminClient.operatorCancel('order-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AdminClientError);
    expect((error as AdminClientError).status).toBe(409);
    expect((error as AdminClientError).message).toBe('Order is dispatched');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://order.test/orders/order-1');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
  });

  it('triggers payment expiry with the token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ id: 'p-1', orderId: 'order-1', status: 'voided' }));

    const payment = await adminClient.expireAuthorization('order-1');

    expect(payment.status).toBe('voided');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://payment.test/payments/authorizations/order-1/expire');
    expect(init?.method).toBe('POST');
  });

  it('reads email history by customer', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([]));

    await adminClient.emails({ customerId: 'c-1' });

    expect(fetchMock).toHaveBeenCalledWith('http://notification.test/emails?customerId=c-1');
  });

  it('maps an unknown user to null but rethrows other failures', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ error: 'User not found' }, 404))
      .mockResolvedValueOnce(json({ error: 'down' }, 503));

    await expect(adminClient.user('guest-1')).resolves.toBeNull();
    await expect(adminClient.user('c-1')).rejects.toBeInstanceOf(AdminClientError);
  });

  it('fails clearly when a service URL is missing', async () => {
    adminClient.urls.notification = undefined;

    await expect(adminClient.emails({ orderId: 'order-1' })).rejects.toThrow(
      'Notification service URL is not configured',
    );
  });
});
