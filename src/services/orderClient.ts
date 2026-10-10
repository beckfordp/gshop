import { ORDER_SERVICE_URL } from './env';
import { checkHealth } from './health';
import { errorMessage } from '../lib/format';

// Real POST /orders contract:
// gluon/services/order-service/src/main/scala/orderservice/OrderRoutes.scala
//
// Note: a 201 here does not mean the order's stock reservation succeeded —
// check the returned `status`. 'reservation_failed' is still a successful
// HTTP response, not an error (see Checkout/Cart screens' spec.md).

export interface NewOrderItem {
  sku: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
}

export interface OrderItem extends NewOrderItem {
  id: string;
}

export interface ReservationFailure {
  sku: string;
  reason: string;
}

export interface Order {
  id: string;
  customerId: string;
  totalCents: number;
  status: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  reservationFailure: ReservationFailure | null;
}

export class OrderClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderClientError';
  }
}

async function create({
  customerId,
  items,
}: {
  customerId: string;
  items: NewOrderItem[];
}): Promise<Order> {
  if (!orderClient.baseUrl) {
    throw new OrderClientError('Order service URL is not configured');
  }

  let response: Response;
  try {
    response = await fetch(`${orderClient.baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, items }),
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
    throw new OrderClientError(`Order request failed with status ${response.status}`);
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
