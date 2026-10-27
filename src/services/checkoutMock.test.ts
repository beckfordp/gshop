import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockCheckoutGateway,
  getMockScenario,
  setMockScenario,
  type MockScenario,
} from './checkoutMock';
import { CheckoutGatewayError } from './checkoutTypes';
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
    if (result.kind !== 'authorized') {
      return;
    }
    expect(result.order.status).toBe('authorized');
    expect(result.order.totalCents).toBe(2750);
    expect(result.order.shippingAddress).toEqual(shippingAddress);
    expect(result.order.items).toHaveLength(3);
  });

  it('declines a card ending 0002 without fabricating an order', async () => {
    const gateway = createMockCheckoutGateway({ delayMs: 0, createId, now });

    const result = await gateway.submit({
      ...request,
      card: { cardNumber: '4242424242420002', expiry: '12/30' },
    });

    expect(result).toEqual({ kind: 'declined', reason: 'insufficient_funds' });
    expect(result).not.toHaveProperty('order');
  });

  it('reports a single failed line for a card ending 0003', async () => {
    const gateway = createMockCheckoutGateway({ delayMs: 0, createId, now });

    const result = await gateway.submit({
      ...request,
      card: { cardNumber: '4242424242420003', expiry: '12/30' },
    });

    expect(result).toEqual({
      kind: 'stock_unavailable',
      failures: [{ sku: 'WID-1', reason: 'insufficient_stock' }],
    });
    expect(result).not.toHaveProperty('order');
  });

  it('reports every failed line for the items_unavailable scenario', async () => {
    setMockScenario('items_unavailable');
    const gateway = createMockCheckoutGateway({ delayMs: 0, createId, now });

    const result = await gateway.submit(request);

    expect(result).toEqual({
      kind: 'stock_unavailable',
      failures: [
        { sku: 'WID-1', reason: 'insufficient_stock' },
        { sku: 'GAD-1', reason: 'unknown_sku' },
      ],
    });
  });

  it.each<MockScenario>(['card_declined', 'service_error'])(
    'honours the prototype scenario %s',
    async (scenario) => {
      setMockScenario(scenario);
      const gateway = createMockCheckoutGateway({ delayMs: 0, createId, now });

      const submit = gateway.submit(request);

      if (scenario === 'service_error') {
        await expect(submit).rejects.toBeInstanceOf(CheckoutGatewayError);
      } else {
        await expect(submit).resolves.toEqual({
          kind: 'declined',
          reason: 'insufficient_funds',
        });
      }
    },
  );

  it('round-trips the prototype scenario', () => {
    setMockScenario('items_unavailable');
    expect(getMockScenario()).toBe('items_unavailable');

    setMockScenario('normal');
    expect(getMockScenario()).toBe('normal');
  });

  it('never returns or stores the card number', async () => {    const gateway = createMockCheckoutGateway({ delayMs: 0, createId, now });

    const authorized = await gateway.submit(request);
    const declined = await gateway.submit({
      ...request,
      card: { cardNumber: '4242424242420002', expiry: '12/30' },
    });

    expect(JSON.stringify({ authorized, declined })).not.toContain('4242');
  });

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
