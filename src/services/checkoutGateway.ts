import { CHECKOUT_MOCK_ENABLED } from './env';
import { paymentClient } from './paymentClient';
import { orderClient, type NewOrderItem, type Order } from './orderClient';
import type { Address, CardDetails } from './checkoutTypes';
import { createMockCheckoutGateway, type MockCheckoutOptions } from './checkoutMock';

// One submission = create a PaymentMethod, then place the order. order-service
// does bulk reserve + authorize synchronously; the response status decides
// what the Checkout screen shows. Real contract:
// gluon/docs/system-design.md's "REST contracts" (US-11..US-14).

export interface CheckoutRequest {
  customerId: string;
  items: NewOrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  card: CardDetails;
}

export type CheckoutResult =
  | { kind: 'authorized'; order: Order }
  | { kind: 'payment_failed'; order: Order; reason: string }
  | { kind: 'reservation_failed'; order: Order };

export interface CheckoutGateway {
  submit(
    request: CheckoutRequest,
    options?: { signal?: AbortSignal },
  ): Promise<CheckoutResult>;
}

export interface CheckoutGatewayDeps {
  paymentClient: Pick<typeof paymentClient, 'createMethod'>;
  orderClient: Pick<typeof orderClient, 'create'>;
}

export class CheckoutGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutGatewayError';
  }
}

export function createHttpCheckoutGateway(
  deps: CheckoutGatewayDeps = { paymentClient, orderClient },
): CheckoutGateway {
  return {
    async submit(request, options = {}) {
      const paymentMethod = await deps.paymentClient.createMethod(
        {
          customerId: request.customerId,
          cardNumber: request.card.cardNumber,
          expiry: request.card.expiry,
          billingAddress: request.billingAddress,
        },
        options,
      );

      const order = await deps.orderClient.create(
        {
          customerId: request.customerId,
          items: request.items,
          shippingAddress: request.shippingAddress,
          paymentMethodId: paymentMethod.id,
        },
        options,
      );

      switch (order.status) {
        case 'authorized':
          return { kind: 'authorized', order };
        case 'payment_failed':
          return {
            kind: 'payment_failed',
            order,
            reason: order.paymentFailure?.reason ?? 'declined',
          };
        case 'reservation_failed':
          return { kind: 'reservation_failed', order };
        default:
          throw new CheckoutGatewayError(`Unexpected order status: ${order.status}`);
      }
    },
  };
}

export function createConfiguredCheckoutGateway(
  mockEnabled: boolean,
  deps?: CheckoutGatewayDeps,
  mockOptions?: MockCheckoutOptions,
): CheckoutGateway {
  return mockEnabled
    ? createMockCheckoutGateway(mockOptions)
    : createHttpCheckoutGateway(deps);
}

export const checkoutGateway = createConfiguredCheckoutGateway(CHECKOUT_MOCK_ENABLED);
