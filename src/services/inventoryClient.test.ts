import { afterEach, describe, expect, it, vi } from 'vitest';
import { inventoryClient, InventoryClientError } from './inventoryClient';

describe('inventoryClient.list', () => {
  const baseUrl = 'http://inventory.test';
  const item = {
    id: 'inv-1',
    sku: 'watch-rolex-submariner',
    quantityAvailable: 5,
    quantityReserved: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  afterEach(() => {
    inventoryClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it('GETs /inventorys with no query string when called with no sku', async () => {
    inventoryClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([item]), { status: 200 }));

    const result = await inventoryClient.list();

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/inventorys`);
    expect(result).toEqual([item]);
  });

  it('GETs /inventorys?sku=... when called with a sku', async () => {
    inventoryClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([item]), { status: 200 }));

    await inventoryClient.list('watch-rolex-submariner');

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/inventorys?sku=watch-rolex-submariner`);
  });

  it('throws InventoryClientError on a non-2xx response', async () => {
    inventoryClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    await expect(inventoryClient.list()).rejects.toThrow(InventoryClientError);
  });

  it('throws InventoryClientError when the network request fails', async () => {
    inventoryClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(inventoryClient.list()).rejects.toThrow(InventoryClientError);
  });

  it('throws InventoryClientError when the base URL is not configured', async () => {
    inventoryClient.baseUrl = undefined;

    await expect(inventoryClient.list()).rejects.toThrow(InventoryClientError);
  });
});

describe('inventoryClient.adjust', () => {
  const baseUrl = 'http://inventory.test';
  const updated = {
    id: 'inv-1',
    sku: 'watch-rolex-submariner',
    quantityAvailable: 6,
    quantityReserved: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  afterEach(() => {
    inventoryClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it('PATCHes /inventorys/{id} with the new quantityAvailable and unchanged quantityReserved', async () => {
    inventoryClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(updated), { status: 200 }));

    const result = await inventoryClient.adjust('inv-1', 6, 0);

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/inventorys/inv-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantityAvailable: 6, quantityReserved: 0 }),
    });
    expect(result).toEqual(updated);
  });

  it('throws InventoryClientError on a non-2xx response', async () => {
    inventoryClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    await expect(inventoryClient.adjust('inv-1', 6, 0)).rejects.toThrow(InventoryClientError);
  });

  it('throws InventoryClientError when the network request fails', async () => {
    inventoryClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(inventoryClient.adjust('inv-1', 6, 0)).rejects.toThrow(InventoryClientError);
  });

  it('throws InventoryClientError when the base URL is not configured', async () => {
    inventoryClient.baseUrl = undefined;

    await expect(inventoryClient.adjust('inv-1', 6, 0)).rejects.toThrow(InventoryClientError);
  });
});
