import { ORDER_SERVICE_URL } from './env';
import { checkHealth } from './health';
import { errorMessage } from '../lib/format';
import type { Address, PaymentFailure, ReservationFailure } from './checkoutTypes';

export type { Address, PaymentFailure, ReservationFailure } from './checkoutTypes';

// Real POST /orders contract:
// gluon/services/order-service/src/main/scala/orderservice/OrderRoutes.scala
//
// Note: a 201 here does not mean checkout fully succeeded — check the
// returned `status`. 'reservation_failed' and 'payment_failed' are both
// successful HTTP responses, not errors, carrying ephemeral failure detail
// (`reservationFailure`, `paymentFailure`) for this response only.

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
  reservationFailure: ReservationFailure | null;
  paymentFailure: PaymentFailure | null;
}

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

async function create(
  input: CreateOrderInput,
  options: { signal?: AbortSignal } = {},
): Promise<Order> {
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

  if (!response.ok) {
    throw new OrderClientError(`Order request failed with status ${response.status}`);
  }

  return (await response.json()) as Order;
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
