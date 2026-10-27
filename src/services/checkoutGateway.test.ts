import { describe, expect, it, vi } from 'vitest';
import {
  CheckoutGatewayError,
  createConfiguredCheckoutGateway,
  createHttpCheckoutGateway,
  type CheckoutRequest,
} from './checkoutGateway';
import type { CreateOrderResult, Order } from './orderClient';
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
    ...overrides,
  };
}

function fakeDeps(createResult: CreateOrderResult) {
  const createMethod = vi.fn().mockResolvedValue({
    id: 'pm-1',
    last4: '4242',
    brand: 'visa',
    expiry: '12/30',
  });
  const create = vi.fn().mockResolvedValue(createResult);
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
    const { deps, createMethod, create } = fakeDeps({ kind: 'created', order });
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

  it('maps a declined order to a decline result with no order', async () => {
    const { deps } = fakeDeps({ kind: 'declined', reason: 'insufficient_funds' });

    const result = await createHttpCheckoutGateway(deps).submit(request);

    expect(result).toEqual({ kind: 'declined', reason: 'insufficient_funds' });
    expect(result).not.toHaveProperty('order');
  });

  it('maps stock failures as every failed line, with no order', async () => {
    const { deps } = fakeDeps({
      kind: 'stock_unavailable',
      failures: [
        { sku: 'WID-1', reason: 'insufficient_stock' },
        { sku: 'GAD-1', reason: 'unknown_sku' },
      ],
    });

    const result = await createHttpCheckoutGateway(deps).submit(request);

    expect(result).toEqual({
      kind: 'stock_unavailable',
      failures: [
        { sku: 'WID-1', reason: 'insufficient_stock' },
        { sku: 'GAD-1', reason: 'unknown_sku' },
      ],
    });
    expect(result).not.toHaveProperty('order');
  });

  it('propagates payment method errors', async () => {
    const { deps, createMethod, create } = fakeDeps({
      kind: 'created',
      order: makeOrder(),
    });
    createMethod.mockRejectedValue(new Error('payment down'));

    await expect(createHttpCheckoutGateway(deps).submit(request)).rejects.toThrow(
      'payment down',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('propagates order client errors with their status message', async () => {
    const { deps, create } = fakeDeps({ kind: 'created', order: makeOrder() });
    create.mockRejectedValue(new Error('Payment service unavailable'));

    await expect(createHttpCheckoutGateway(deps).submit(request)).rejects.toThrow(
      'Payment service unavailable',
    );
  });

  it('forwards the signal to both calls', async () => {
    const { deps, createMethod, create } = fakeDeps({
      kind: 'created',
      order: makeOrder(),
    });
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
    const { deps, create } = fakeDeps({ kind: 'created', order: makeOrder() });

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

    expect(result).toEqual({ kind: 'declined', reason: 'insufficient_funds' });
  });

  it('throws CheckoutGatewayError when the mock reports a service error', async () => {
    setMockScenario('service_error');
    const gateway = createConfiguredCheckoutGateway(true, undefined, { delayMs: 0 });

    await expect(gateway.submit(request)).rejects.toThrow(CheckoutGatewayError);
  });
});
