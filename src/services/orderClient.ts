import { ORDER_SERVICE_URL } from './env';
import { checkHealth } from './health';
import { errorMessage } from '../lib/format';
import type { Address, ReservationFailure } from './checkoutTypes';

export type { Address, ReservationFailure } from './checkoutTypes';

// Real POST /orders contract:
// gluon/services/order-service/src/main/scala/orderservice/OrderRoutes.scala
//
// ADR 0018: an order row exists only after the checkout succeeds. A 402
// (declined) or 409 (stock) response carries no order, so callers must read
// the status code rather than a field on the returned order.

export interface NewOrderItem {
  sku: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
}

export interface OrderItem extends NewOrderItem {
  id: string;
}

export type OrderStatus =
  | 'pending'
  | 'reserved'
  | 'reservation_failed'
  | 'authorized'
  | 'payment_failed'
  | 'dispatched'
  | 'dispatch_failed'
  | 'confirmed'
  | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  totalCents: number;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  shippingAddress: Address | null;
}

export type CreateOrderResult =
  | { kind: 'created'; order: Order }
  | { kind: 'declined'; reason: string }
  | { kind: 'stock_unavailable'; failures: ReservationFailure[] };

export interface CreateOrderInput {
  customerId: string;
  items: NewOrderItem[];
  shippingAddress: Address;
  paymentMethodId: string;
}

export class OrderClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OrderClientError';
    this.status = status;
  }
}

interface PaymentDeclinedBody {
  error?: string;
  paymentFailure?: { reason?: string };
}

interface InsufficientStockBody {
  error?: string;
  reservationFailures?: ReservationFailure[];
}

function messageFor(status: number): string {
  return `Order request failed with status ${status}`;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? messageFor(response.status);
  } catch {
    return messageFor(response.status);
  }
}

async function create(
  input: CreateOrderInput,
  options: { signal?: AbortSignal } = {},
): Promise<CreateOrderResult> {
  if (!orderClient.baseUrl) {
    throw new OrderClientError('Order service URL is not configured');
  }

  let response: Response;
  try {
    response = await fetch(`${orderClient.baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    throw new OrderClientError(`Failed to reach order service: ${errorMessage(error)}`);
  }

  if (response.status === 201) {
    return { kind: 'created', order: (await response.json()) as Order };
  }

  if (response.status === 402) {
    const body = (await response.json().catch(() => ({}))) as PaymentDeclinedBody;
    return {
      kind: 'declined',
      reason: body.paymentFailure?.reason ?? 'declined',
    };
  }

  if (response.status === 409) {
    const body = (await response.json().catch(() => ({}))) as InsufficientStockBody;
    return { kind: 'stock_unavailable', failures: body.reservationFailures ?? [] };
  }

  throw new OrderClientError(await parseError(response), response.status);
}

async function remove(id: string): Promise<void> {
  if (!orderClient.baseUrl) {
    throw new OrderClientError('Order service URL is not configured');
  }

  let response: Response;
  try {
    response = await fetch(`${orderClient.baseUrl}/orders/${id}`, { method: 'DELETE' });
  } catch (error) {
    throw new OrderClientError(`Failed to reach order service: ${errorMessage(error)}`);
  }

  if (!response.ok) {
    throw new OrderClientError(`Order request failed with status ${response.status}`, response.status);
  }
}

async function list(customerId: string): Promise<Order[]> {
  if (!orderClient.baseUrl) {
    throw new OrderClientError('Order service URL is not configured');
  }

  let response: Response;
  try {
    response = await fetch(
      `${orderClient.baseUrl}/orders?customerId=${encodeURIComponent(customerId)}`,
    );
  } catch (error) {
    throw new OrderClientError(`Failed to reach order service: ${errorMessage(error)}`);
  }

  if (!response.ok) {
    throw new OrderClientError(`Order request failed with status ${response.status}`);
  }

  return (await response.json()) as Order[];
}

export const orderClient: {
  baseUrl: string | undefined;
  health: () => Promise<boolean>;
  create: typeof create;
  list: typeof list;
  remove: typeof remove;
} = {
  baseUrl: ORDER_SERVICE_URL,
  health: () => checkHealth(ORDER_SERVICE_URL),
  create,
  list,
  remove,
};
