import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockCheckoutGateway,
  setMockScenario,
  type MockScenario,
} from './checkoutMock';
import type { CheckoutRequest } from './checkoutGateway';

const shippingAddress = {
  line1: '1 Watchmaker Lane',
  city: 'London',
  postalCode: 'EC1A 1BB',
  country: 'GB',
};

const request: CheckoutRequest = {
  customerId: 'customer-1',
  items: [
    { sku: 'WID-1', productName: 'Widget', unitPriceCents: 1000, quantity: 2 },
    { sku: 'GAD-1', productName: 'Gadget', unitPriceCents: 500, quantity: 1 },
    { sku: 'THG-1', productName: 'Thing', unitPriceCents: 250, quantity: 1 },
  ],
  shippingAddress,
  billingAddress: shippingAddress,
  card: { cardNumber: '4242 4242 4242 4242', expiry: '12/30' },
};

let nextId = 0;
const createId = () => `id-${++nextId}`;
const now = () => new Date('2026-01-01T00:00:00Z');

describe('createMockCheckoutGateway', () => {
  beforeEach(() => {
    nextId = 0;
    setMockScenario('normal');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('authorizes a normal card and returns an order with the shipping address and totals', async () => {
    const gateway = createMockCheckoutGateway({ delayMs: 0, createId, now });

    const result = await gateway.submit(request);

    expect(result.kind).toBe('authorized');
    expect(result.order.status).toBe('authorized');
    expect(result.order.totalCents).toBe(2750);
    expect(result.order.shippingAddress).toEqual(shippingAddress);
    expect(result.order.reservationFailure).toBeNull();
    expect(result.order.paymentFailure).toBeNull();
    expect(result.order.items).toHaveLength(3);
  });

  it('declines a card ending 0002', async () => {
    const gateway = createMockCheckoutGateway({ delayMs: 0, createId, now });

    const result = await gateway.submit({
      ...request,
      card: { cardNumber: '4242424242420002', expiry: '12/30' },
    });

    expect(result).toMatchObject({
      kind: 'payment_failed',
      reason: 'insufficient_funds',
    });
    expect(result.order.status).toBe('payment_failed');
    expect(result.order.paymentFailure).toEqual({ reason: 'insufficient_funds' });
  });

  it('reports the failed line for a card ending 0003', async () => {
    const gateway = createMockCheckoutGateway({ delayMs: 0, createId, now });

    const result = await gateway.submit({
      ...request,
      card: { cardNumber: '4242424242420003', expiry: '12/30' },
    });

    expect(result.kind).toBe('reservation_failed');
    expect(result.order.status).toBe('reservation_failed');
    expect(result.order.reservationFailure).toEqual({
      sku: 'WID-1',
      reason: "insufficient stock for sku 'WID-1'",
    });
  });

  it.each<MockScenario>(['items_unavailable', 'card_declined', 'service_error'])(
    'honours the prototype scenario %s',
    async (scenario) => {
      setMockScenario(scenario);
      const gateway = createMockCheckoutGateway({ delayMs: 0, createId, now });

      const submit = gateway.submit(request);

      if (scenario === 'service_error') {
        await expect(submit).rejects.toThrow('Mock checkout service is unavailable');
      } else if (scenario === 'card_declined') {
        await expect(submit).resolves.toMatchObject({ kind: 'payment_failed' });
      } else {
        await expect(submit).resolves.toMatchObject({ kind: 'reservation_failed' });
      }
    },
  );

  it('waits for the configured delay before resolving', async () => {
    vi.useFakeTimers();
    const gateway = createMockCheckoutGateway({ delayMs: 700, createId, now });
    let settled = false;

    const promise = gateway.submit(request).then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(699);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(settled).toBe(true);
  });

  it('rejects with AbortError when the signal aborts during the delay', async () => {
    const gateway = createMockCheckoutGateway({ delayMs: 700, createId, now });
    const controller = new AbortController();

    const promise = gateway.submit(request, { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const gateway = createMockCheckoutGateway({ delayMs: 0, createId, now });
    const controller = new AbortController();
    controller.abort();

    await expect(
      gateway.submit(request, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
