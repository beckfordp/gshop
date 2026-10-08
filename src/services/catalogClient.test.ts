import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogClient, CatalogClientError } from "./catalogClient";

describe("catalogClient.list", () => {
  const baseUrl = "http://catalog.test";

  afterEach(() => {
    catalogClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it("requests the catalog list with limit and offset query params", async () => {
    catalogClient.baseUrl = baseUrl;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "X-Total-Count": "0" },
      }),
    );

    await catalogClient.list({ limit: 20, offset: 0 });

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/catalogs?limit=20&offset=0`);
  });

  it("returns parsed items and total from the X-Total-Count header", async () => {
    catalogClient.baseUrl = baseUrl;
    const items = [
      {
        id: "1",
        name: "Widget",
        description: "A widget",
        priceCents: 1999,
        sku: "WID-1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(items), {
        status: 200,
        headers: { "X-Total-Count": "42" },
      }),
    );

    const result = await catalogClient.list({ limit: 20, offset: 0 });

    expect(result).toEqual({ items, total: 42 });
  });

  it("throws CatalogClientError on a non-2xx response", async () => {
    catalogClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid pagination parameters" }), {
        status: 400,
      }),
    );

    await expect(catalogClient.list({ limit: -1, offset: 0 })).rejects.toThrow(
      CatalogClientError,
    );
  });

  it("throws CatalogClientError when the network request fails", async () => {
    catalogClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(catalogClient.list({ limit: 20, offset: 0 })).rejects.toThrow(
      CatalogClientError,
    );
  });

  it("throws CatalogClientError when the base URL is not configured", async () => {
    catalogClient.baseUrl = undefined;

    await expect(catalogClient.list({ limit: 20, offset: 0 })).rejects.toThrow(
      CatalogClientError,
    );
  });
});
