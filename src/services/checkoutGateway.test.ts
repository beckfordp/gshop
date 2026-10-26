import { describe, expect, it, vi } from 'vitest';
import {
  CheckoutGatewayError,
  createConfiguredCheckoutGateway,
  createHttpCheckoutGateway,
  type CheckoutRequest,
} from './checkoutGateway';
import type { Order } from './orderClient';
import { setMockScenario } from './checkoutMock';

const shippingAddress = {
  line1: '1 Watchmaker Lane',
  city: 'London',
  postalCode: 'EC1A 1BB',
  country: 'GB',
};

const request: CheckoutRequest = {
  customerId: 'customer-1',
  items: [{ sku: 'WID-1', productName: 'Widget', unitPriceCents: 1000, quantity: 2 }],
  shippingAddress,
  billingAddress: shippingAddress,
  card: { cardNumber: '4242424242424242', expiry: '12/30' },
};

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'customer-1',
    totalCents: 2000,
    status: 'authorized',
    items: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    shippingAddress,
    reservationFailure: null,
    paymentFailure: null,
    ...overrides,
  };
}

function fakeDeps(order: Order) {
  const createMethod = vi.fn().mockResolvedValue({
    id: 'pm-1',
    last4: '4242',
    brand: 'visa',
    expiry: '12/30',
  });
  const create = vi.fn().mockResolvedValue(order);
  return {
    deps: {
      paymentClient: { createMethod },
      orderClient: { create },
    },
    createMethod,
    create,
  };
}

describe('createHttpCheckoutGateway', () => {
  it('creates a payment method, then the order, and returns authorized', async () => {
    const order = makeOrder();
    const { deps, createMethod, create } = fakeDeps(order);
    const gateway = createHttpCheckoutGateway(deps);

    const result = await gateway.submit(request);

    expect(createMethod).toHaveBeenCalledWith(
      {
        customerId: 'customer-1',
        cardNumber: '4242424242424242',
        expiry: '12/30',
        billingAddress: shippingAddress,
      },
      {},
    );
    expect(create).toHaveBeenCalledWith(
      {
        customerId: 'customer-1',
        items: request.items,
        shippingAddress,
        paymentMethodId: 'pm-1',
      },
      {},
    );
    expect(result).toEqual({ kind: 'authorized', order });
  });

  it('maps payment_failed using the response reason', async () => {
    const order = makeOrder({
      status: 'payment_failed',
      paymentFailure: { reason: 'insufficient_funds' },
    });
    const { deps } = fakeDeps(order);

    const result = await createHttpCheckoutGateway(deps).submit(request);

    expect(result).toMatchObject({
      kind: 'payment_failed',
      reason: 'insufficient_funds',
      order,
    });
  });

  it('falls back to a generic decline reason when paymentFailure is null', async () => {
    const order = makeOrder({ status: 'payment_failed', paymentFailure: null });
    const { deps } = fakeDeps(order);

    const result = await createHttpCheckoutGateway(deps).submit(request);

    expect(result).toMatchObject({ kind: 'payment_failed', reason: 'declined' });
  });

  it('maps reservation_failed with the failed line', async () => {
    const order = makeOrder({
      status: 'reservation_failed',
      reservationFailure: { sku: 'WID-1', reason: 'insufficient stock' },
    });
    const { deps } = fakeDeps(order);

    const result = await createHttpCheckoutGateway(deps).submit(request);

    expect(result).toEqual({ kind: 'reservation_failed', order });
    expect(result.order.reservationFailure).toEqual({
      sku: 'WID-1',
      reason: 'insufficient stock',
    });
  });

  it('throws on an unexpected status instead of treating it as success', async () => {
    const { deps } = fakeDeps(makeOrder({ status: 'pending' }));

    await expect(createHttpCheckoutGateway(deps).submit(request)).rejects.toThrow(
      CheckoutGatewayError,
    );
  });

  it('propagates client errors', async () => {
    const { deps, createMethod } = fakeDeps(makeOrder());
    createMethod.mockRejectedValue(new Error('payment down'));

    await expect(createHttpCheckoutGateway(deps).submit(request)).rejects.toThrow(
      'payment down',
    );
  });

  it('forwards the signal to both calls', async () => {
    const { deps, createMethod, create } = fakeDeps(makeOrder());
    const controller = new AbortController();

    await createHttpCheckoutGateway(deps).submit(request, { signal: controller.signal });

    expect(createMethod).toHaveBeenCalledWith(expect.anything(), {
      signal: controller.signal,
    });
    expect(create).toHaveBeenCalledWith(expect.anything(), {
      signal: controller.signal,
    });
  });
});

describe('createConfiguredCheckoutGateway', () => {
  it('uses the HTTP gateway when mock mode is off', async () => {
    const { deps, create } = fakeDeps(makeOrder());

    const result = await createConfiguredCheckoutGateway(false, deps).submit(request);

    expect(result.kind).toBe('authorized');
    expect(create).toHaveBeenCalledOnce();
  });

  it('uses the mock gateway when mock mode is on', async () => {
    setMockScenario('normal');
    const gateway = createConfiguredCheckoutGateway(true, undefined, { delayMs: 0 });

    const result = await gateway.submit({
      ...request,
      card: { cardNumber: '4242424242420002', expiry: '12/30' },
    });

    expect(result).toMatchObject({
      kind: 'payment_failed',
      reason: 'insufficient_funds',
    });
  });
});
