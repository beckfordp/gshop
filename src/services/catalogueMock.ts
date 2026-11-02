// PROTOTYPE ONLY — simulated catalogue writes for the Admin Catalogue section.
// Reads are real (catalogClient/inventoryClient); these writes only return
// updated copies held in the screen's state, nothing reaches catalog-service.
// Real-wiring replaces this module with a client of the same shape once the
// catalogue ADM tasks land (operator-gated writes, retire instead of hard
// delete, stock record on create, image URL as catalogue data).

export type ProductStatus = 'active' | 'retired';

export interface CatalogueProduct {
  /** catalog-service id; null for a product created in the prototype. */
  catalogId: string | null;
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  /** null = the storefront's default photo for the SKU. */
  imageUrl: string | null;
  status: ProductStatus;
  /** True once the prototype has changed or created it. */
  simulated: boolean;
}

export interface ProductDetails {
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
}

export interface NewProduct extends ProductDetails {
  sku: string;
  initialStock: number;
}

const LATENCY_MS = 150;

function simulate<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

async function create(input: NewProduct): Promise<CatalogueProduct> {
  return simulate({
    catalogId: null,
    sku: input.sku,
    name: input.name,
    description: input.description,
    priceCents: input.priceCents,
    imageUrl: input.imageUrl,
    status: 'active',
    simulated: true,
  });
}

async function update(
  product: CatalogueProduct,
  details: ProductDetails,
): Promise<CatalogueProduct> {
  return simulate({ ...product, ...details, simulated: true });
}

async function setStatus(
  product: CatalogueProduct,
  status: ProductStatus,
): Promise<CatalogueProduct> {
  return simulate({ ...product, status, simulated: true });
}

export const catalogueMock = { create, update, setStatus };
