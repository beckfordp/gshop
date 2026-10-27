import { CHECKOUT_MOCK_ENABLED } from './env';
import { paymentClient } from './paymentClient';
import { orderClient, type NewOrderItem, type Order } from './orderClient';
import {
  type Address,
  type CardDetails,
  type ReservationFailure,
} from './checkoutTypes';
import { createMockCheckoutGateway, type MockCheckoutOptions } from './checkoutMock';

export { CheckoutGatewayError } from './checkoutTypes';

// One submission = create a PaymentMethod, then place the order. order-service
// does bulk reserve + authorize synchronously; the response status decides
// what the Checkout screen shows. Real contract:
// gluon/docs/system-design.md's "REST contracts" (US-11..US-14).
//
// ADR 0018: a failed checkout (decline or insufficient stock) persists no
// order, so only the success variant carries one.

export interface CheckoutRequest {
  customerId: string;
  items: NewOrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  card: CardDetails;
}

export type CheckoutResult =
  | { kind: 'authorized'; order: Order }
  | { kind: 'declined'; reason: string }
  | { kind: 'stock_unavailable'; failures: ReservationFailure[] };

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

      const result = await deps.orderClient.create(
        {
          customerId: request.customerId,
          items: request.items,
          shippingAddress: request.shippingAddress,
          paymentMethodId: paymentMethod.id,
        },
        options,
      );

      switch (result.kind) {
        case 'created':
          return { kind: 'authorized', order: result.order };
        case 'declined':
          return { kind: 'declined', reason: result.reason };
        case 'stock_unavailable':
          return { kind: 'stock_unavailable', failures: result.failures };
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
