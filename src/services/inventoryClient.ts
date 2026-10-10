import { INVENTORY_SERVICE_URL } from './env';
import { checkHealth } from './health';
import { errorMessage } from '../lib/format';

// Real GET /inventorys and PATCH /inventorys/{id} contracts:
// gluon/services/inventory-service/src/main/scala/inventoryservice/InventoryRoutes.scala
//
// GET /inventorys?sku=<optional> was added for gshop's admin-screen_20261010
// track — previously the only lookup was GET /inventorys/{id} by internal
// UUID, which gshop has no way to discover on its own.

export interface InventoryItem {
  id: string;
  sku: string;
  quantityAvailable: number;
  quantityReserved: number;
  createdAt: string;
  updatedAt: string;
}

export class InventoryClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryClientError';
  }
}

async function list(sku?: string): Promise<InventoryItem[]> {
  if (!inventoryClient.baseUrl) {
    throw new InventoryClientError('Inventory service URL is not configured');
  }

  const url = sku
    ? `${inventoryClient.baseUrl}/inventorys?sku=${encodeURIComponent(sku)}`
    : `${inventoryClient.baseUrl}/inventorys`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new InventoryClientError(`Failed to reach inventory service: ${errorMessage(error)}`);
  }

  if (!response.ok) {
    throw new InventoryClientError(`Inventory request failed with status ${response.status}`);
  }

  return (await response.json()) as InventoryItem[];
}

async function adjust(
  id: string,
  quantityAvailable: number,
  quantityReserved: number,
): Promise<InventoryItem> {
  if (!inventoryClient.baseUrl) {
    throw new InventoryClientError('Inventory service URL is not configured');
  }

  let response: Response;
  try {
    response = await fetch(`${inventoryClient.baseUrl}/inventorys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantityAvailable, quantityReserved }),
    });
  } catch (error) {
    throw new InventoryClientError(`Failed to reach inventory service: ${errorMessage(error)}`);
  }

  if (!response.ok) {
    throw new InventoryClientError(`Inventory request failed with status ${response.status}`);
  }

  return (await response.json()) as InventoryItem;
}

export const inventoryClient: {
  baseUrl: string | undefined;
  health: () => Promise<boolean>;
  list: typeof list;
  adjust: typeof adjust;
} = {
  baseUrl: INVENTORY_SERVICE_URL,
  health: () => checkHealth(INVENTORY_SERVICE_URL),
  list,
  adjust,
};
