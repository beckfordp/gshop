import type { CatalogueProduct, NewProduct } from '../../services/catalogueMock';

export interface ProductFormValues {
  sku: string;
  name: string;
  description: string;
  price: string;
  initialStock: string;
  imageUrl: string;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

const SKU_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

export function emptyForm(): ProductFormValues {
  return { sku: '', name: '', description: '', price: '', initialStock: '0', imageUrl: '' };
}

export function formFor(product: CatalogueProduct): ProductFormValues {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description,
    price: (product.priceCents / 100).toFixed(2),
    initialStock: '0',
    imageUrl: product.imageUrl ?? '',
  };
}

/** `existingSkus` is checked only when adding — SKUs are immutable on edit. */
export function validateProduct(
  values: ProductFormValues,
  { adding, existingSkus }: { adding: boolean; existingSkus: string[] },
): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const sku = values.sku.trim();
  if (adding) {
    if (!sku) errors.sku = 'SKU is required';
    else if (!SKU_PATTERN.test(sku)) errors.sku = 'Use lowercase letters, digits and hyphens';
    else if (existingSkus.includes(sku)) errors.sku = 'SKU already exists';
    if (!/^\d+$/.test(values.initialStock.trim())) {
      errors.initialStock = 'Initial stock must be a whole number';
    }
  }
  if (!values.name.trim()) errors.name = 'Name is required';
  const price = values.price.trim();
  if (!PRICE_PATTERN.test(price) || Number(price) <= 0) {
    errors.price = 'Price must be a positive amount, e.g. 4500.00';
  }
  const imageUrl = values.imageUrl.trim();
  if (imageUrl && !/^https:\/\/\S+$/.test(imageUrl)) {
    errors.imageUrl = 'Image URL must start with https://';
  }
  return errors;
}

export function toNewProduct(values: ProductFormValues): NewProduct {
  return {
    sku: values.sku.trim(),
    initialStock: Number(values.initialStock.trim()),
    ...toDetails(values),
  };
}

export function toDetails(values: ProductFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    priceCents: Math.round(Number(values.price.trim()) * 100),
    imageUrl: values.imageUrl.trim() || null,
  };
}
