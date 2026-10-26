import type { CheckoutGateway, CheckoutRequest } from './checkoutGateway';
import type { Order, OrderItem } from './orderClient';

// In-browser stand-in for payment-service + order-service, used only when
// VITE_CHECKOUT_MOCK=true. It assumes the target contracts: create a payment
// method, then one synchronous POST /orders that bulk-reserves every line and
// authorizes. No PAN is stored or logged; nothing leaves the browser.

export type MockScenario =
  | 'normal'
  | 'items_unavailable'
  | 'card_declined'
  | 'service_error';

let scenario: MockScenario = 'normal';

export function setMockScenario(next: MockScenario): void {
  scenario = next;
}

export function getMockScenario(): MockScenario {
  return scenario;
}

export interface MockCheckoutOptions {
  delayMs?: number;
  now?: () => Date;
  createId?: () => string;
}

const DEFAULT_DELAY_MS = 700;

export function createMockCheckoutGateway({
  delayMs = DEFAULT_DELAY_MS,
  now = () => new Date(),
  createId = () => crypto.randomUUID(),
}: MockCheckoutOptions = {}): CheckoutGateway {
  return {
    async submit(request, options = {}) {
      await abortableDelay(delayMs, options.signal);

      if (scenario === 'service_error') {
        throw new Error('Mock checkout service is unavailable');
      }

      const last4 = request.card.cardNumber.replace(/\D/g, '').slice(-4);
      const declined = scenario === 'card_declined' || last4 === '0002';
      const unavailable = scenario === 'items_unavailable' || last4 === '0003';

      // Reservation runs before authorization in the real checkout flow, so a
      // reservation failure wins when both are triggered.
      if (unavailable) {
        const failed = request.items[0];
        return {
          kind: 'reservation_failed',
          order: makeOrder(request, createId, now, {
            status: 'reservation_failed',
            reservationFailure: {
              sku: failed.sku,
              reason: `insufficient stock for sku '${failed.sku}'`,
            },
          }),
        };
      }

      if (declined) {
        return {
          kind: 'payment_failed',
          order: makeOrder(request, createId, now, {
            status: 'payment_failed',
            paymentFailure: { reason: 'insufficient_funds' },
          }),
          reason: 'insufficient_funds',
        };
      }

      return {
        kind: 'authorized',
        order: makeOrder(request, createId, now, { status: 'authorized' }),
      };
    },
  };
}

function makeOrder(
  request: CheckoutRequest,
  createId: () => string,
  now: () => Date,
  overrides: Partial<Order>,
): Order {
  const timestamp = now().toISOString();
  const items: OrderItem[] = request.items.map((item) => ({
    ...item,
    id: createId(),
  }));

  return {
    id: createId(),
    customerId: request.customerId,
    totalCents: items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    ),
    status: 'authorized',
    items,
    createdAt: timestamp,
    updatedAt: timestamp,
    shippingAddress: request.shippingAddress,
    reservationFailure: null,
    paymentFailure: null,
    ...overrides,
  };
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(abortError());
    };

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}
