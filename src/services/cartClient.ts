import { CART_SERVICE_URL } from './env';
import { checkHealth } from './health';

// Real POST /carts, GET /carts/{id}, POST /carts/{id}/items, and
// DELETE /carts/{id}/items/{sku} contracts:
// gluon/services/cart-service/src/main/scala/cartservice/CartRoutes.scala

export interface Cart {
  id: string;
  items: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export class CartClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CartClientError';
  }
}

function errorMessage(error: unknown): string {
  // `error` is `unknown` under strict mode; narrow safely rather than
  // asserting, since a rejected promise isn't guaranteed to be an Error.
  return error instanceof Error ? error.message : String(error);
}

async function request(path: string, init?: RequestInit): Promise<Cart> {
  if (!cartClient.baseUrl) {
    throw new CartClientError('Cart service URL is not configured');
  }

  let response: Response;
  try {
    response = await fetch(`${cartClient.baseUrl}${path}`, init);
  } catch (error) {
    throw new CartClientError(`Failed to reach cart service: ${errorMessage(error)}`);
  }

  if (!response.ok) {
    throw new CartClientError(`Cart request failed with status ${response.status}`);
  }

  return (await response.json()) as Cart;
}

async function create(): Promise<Cart> {
  return request('/carts', { method: 'POST' });
}

async function get(id: string): Promise<Cart> {
  return request(`/carts/${id}`);
}

async function addItem(id: string, sku: string, quantity: number): Promise<Cart> {
  return request(`/carts/${id}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, quantity }),
  });
}

async function removeItem(id: string, sku: string): Promise<Cart> {
  return request(`/carts/${id}/items/${sku}`, { method: 'DELETE' });
}

export const cartClient: {
  baseUrl: string | undefined;
  health: () => Promise<boolean>;
  create: typeof create;
  get: typeof get;
  addItem: typeof addItem;
  removeItem: typeof removeItem;
} = {
  baseUrl: CART_SERVICE_URL,
  health: () => checkHealth(CART_SERVICE_URL),
  create,
  get,
  addItem,
  removeItem,
};
