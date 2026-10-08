import { CATALOG_SERVICE_URL } from './env';
import { checkHealth } from './health';

// Real GET /catalogs and GET /catalogs/{id} contracts:
// gluon/services/catalog-service/src/main/scala/catalogservice/CatalogRoutes.scala

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  sku: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogListResult {
  items: CatalogItem[];
  total: number;
}

export class CatalogClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogClientError';
  }
}

async function list({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}): Promise<CatalogListResult> {
  if (!catalogClient.baseUrl) {
    throw new CatalogClientError('Catalog service URL is not configured');
  }

  const url = `${catalogClient.baseUrl}/catalogs?limit=${limit}&offset=${offset}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    // `error` is `unknown` under strict mode; fetch failures (network down,
    // DNS, CORS) are always Error instances in practice, but narrow safely
    // rather than asserting.
    const message = error instanceof Error ? error.message : String(error);
    throw new CatalogClientError(`Failed to reach catalog service: ${message}`);
  }

  if (!response.ok) {
    throw new CatalogClientError(`Catalog list request failed with status ${response.status}`);
  }

  const items = (await response.json()) as CatalogItem[];
  const total = Number(response.headers.get('X-Total-Count') ?? items.length);

  return { items, total };
}

export const catalogClient: {
  baseUrl: string | undefined;
  health: () => Promise<boolean>;
  list: typeof list;
} = {
  baseUrl: CATALOG_SERVICE_URL,
  health: () => checkHealth(CATALOG_SERVICE_URL),
  list,
};
