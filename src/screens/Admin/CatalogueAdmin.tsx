// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { catalogClient } from '../../services/catalogClient';
import { inventoryClient, type InventoryItem } from '../../services/inventoryClient';
import {
  catalogueMock,
  type CatalogueProduct,
  type ProductStatus,
} from '../../services/catalogueMock';
import { imageForSku } from '../../data/watchImages';
import { errorMessage, formatPrice } from '../../lib/format';
import {
  emptyForm,
  formFor,
  toDetails,
  toNewProduct,
  validateProduct,
  type ProductFormErrors,
  type ProductFormValues,
} from './productForm';
import './CatalogueAdmin.css';

// PROTOTYPE: product data is read from catalog-service but edits go through
// catalogueMock (in-memory only). Stock is real — the ±1 controls call
// inventory-service exactly as the former Inventory section did.

// catalog-service has no lookup-by-sku endpoint, so the stock join fetches
// the whole catalogue in one page — fine at today's ~100-item scale.
const CATALOG_PAGE_SIZE = 100;

type StatusFilter = ProductStatus | 'all';

interface Row extends CatalogueProduct {
  stock: InventoryItem | null;
  /** Prototype-created products: the stock record a real create would make. */
  pendingStock?: number;
}

type FormMode = { mode: 'add' } | { mode: 'edit'; sku: string };

function imageOf(product: { sku: string; imageUrl: string | null }): string {
  return product.imageUrl ?? imageForSku(product.sku || 'new-product');
}

export default function CatalogueAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [form, setForm] = useState<FormMode | null>(null);
  const [confirmSku, setConfirmSku] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [adjustLoading, setAdjustLoading] = useState<Record<string, boolean>>({});
  const [adjustError, setAdjustError] = useState<Record<string, string>>({});
  const [lastDelta, setLastDelta] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [catalog, stock] = await Promise.all([
        catalogClient.list({ limit: CATALOG_PAGE_SIZE, offset: 0 }),
        inventoryClient.list(),
      ]);
      const stockBySku = new Map(stock.map((item) => [item.sku, item]));
      setRows(
        catalog.items.map((item) => ({
          catalogId: item.id,
          sku: item.sku,
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          imageUrl: null,
          status: 'active',
          simulated: false,
          stock: stockBySku.get(item.sku) ?? null,
        })),
      );
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (statusFilter === 'all' || row.status === statusFilter) &&
        (!term || row.name.toLowerCase().includes(term) || row.sku.includes(term)),
    );
  }, [rows, search, statusFilter]);

  const replaceRow = (sku: string, change: (row: Row) => Row) =>
    setRows((prev) => prev.map((row) => (row.sku === sku ? change(row) : row)));

  const handleSaved = (product: CatalogueProduct, pendingStock?: number) => {
    setRows((prev) =>
      prev.some((row) => row.sku === product.sku)
        ? prev.map((row) => (row.sku === product.sku ? { ...row, ...product } : row))
        : [{ ...product, stock: null, pendingStock }, ...prev],
    );
    setForm(null);
    setMessage(`Saved ${product.name} (simulated).`);
  };

  const handleStatus = async (row: Row, status: ProductStatus) => {
    setConfirmSku(null);
    const updated = await catalogueMock.setStatus(row, status);
    replaceRow(row.sku, (current) => ({ ...current, ...updated }));
    setMessage(`${status === 'retired' ? 'Retired' : 'Restored'} ${row.name} (simulated).`);
  };

  const handleAdjust = async (row: Row, delta: number) => {
    const stock = row.stock;
    if (!stock || stock.quantityAvailable + delta < 0) {
      return;
    }
    setLastDelta((prev) => ({ ...prev, [stock.id]: delta }));
    setAdjustLoading((prev) => ({ ...prev, [stock.id]: true }));
    setAdjustError((prev) => {
      const next = { ...prev };
      delete next[stock.id];
      return next;
    });
    try {
      const updated = await inventoryClient.adjust(stock.id, stock.quantityAvailable + delta);
      replaceRow(row.sku, (current) => ({ ...current, stock: updated }));
    } catch (error) {
      setAdjustError((prev) => ({ ...prev, [stock.id]: errorMessage(error) }));
    } finally {
      setAdjustLoading((prev) => ({ ...prev, [stock.id]: false }));
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }
  if (loadError) {
    return (
      <div className="admin-error">
        <p role="alert">{loadError}</p>
        <button onClick={load}>Retry</button>
      </div>
    );
  }

  const editing = form?.mode === 'edit' ? rows.find((row) => row.sku === form.sku) : undefined;

  return (
    <div className="catalogue">
      <p className="catalogue__banner">
        Prototype — product edits are simulated in this browser and not saved; stock changes are
        real.
      </p>

      {message && (
        <p className="catalogue__message" role="status">
          {message}
        </p>
      )}

      {form ? (
        <ProductForm
          key={form.mode === 'edit' ? form.sku : 'add'}
          product={editing}
          existingSkus={rows.map((row) => row.sku)}
          onSaved={handleSaved}
          onCancel={() => setForm(null)}
        />
      ) : (
        <div className="catalogue__toolbar">
          <input
            type="search"
            aria-label="Search products"
            placeholder="Search name or SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            aria-label="Product status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="active">Active</option>
            <option value="retired">Retired</option>
            <option value="all">All</option>
          </select>
          <button type="button" onClick={() => setForm({ mode: 'add' })}>
            Add product
          </button>
        </div>
      )}

      <p className="catalogue__count">
        {visible.length} of {rows.length} products
      </p>

      <table className="catalogue__table" aria-label="Catalogue">
        <thead>
          <tr>
            <th />
            <th>Sku</th>
            <th>Name</th>
            <th>Price</th>
            <th>Available</th>
            <th>Reserved</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr
              key={row.sku}
              className={row.status === 'retired' ? 'catalogue__row--retired' : undefined}
            >
              <td>
                <img className="catalogue__thumb" src={imageOf(row)} alt="" />
              </td>
              <td>{row.sku}</td>
              <td>
                {row.name}
                {row.simulated && <span className="catalogue__tag">simulated</span>}
              </td>
              <td>{formatPrice(row.priceCents)}</td>
              {row.stock ? (
                <>
                  <td>{row.stock.quantityAvailable}</td>
                  <td>{row.stock.quantityReserved}</td>
                </>
              ) : (
                <td colSpan={2} className="catalogue__muted">
                  No stock record
                  {row.pendingStock !== undefined && ` (would start at ${row.pendingStock})`}
                </td>
              )}
              <td>
                <span className={`catalogue__status catalogue__status--${row.status}`}>
                  {row.status === 'active' ? 'Active' : 'Retired'}
                </span>
                {row.status === 'retired' && (
                  <span className="catalogue__muted catalogue__hint">
                    would be hidden from the storefront
                  </span>
                )}
              </td>
              <td className="catalogue__actions">
                {row.stock && (
                  <>
                    <button
                      aria-label={`Decrease stock for ${row.sku}`}
                      onClick={() => handleAdjust(row, -1)}
                      disabled={adjustLoading[row.stock.id] || row.stock.quantityAvailable <= 0}
                    >
                      −1
                    </button>
                    <button
                      aria-label={`Increase stock for ${row.sku}`}
                      onClick={() => handleAdjust(row, 1)}
                      disabled={adjustLoading[row.stock.id]}
                    >
                      +1
                    </button>
                  </>
                )}
                <button
                  type="button"
                  aria-label={`Edit ${row.sku}`}
                  onClick={() => setForm({ mode: 'edit', sku: row.sku })}
                >
                  Edit
                </button>
                {confirmSku === row.sku ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStatus(row, 'retired')}
                      aria-label={`Confirm retire ${row.sku}`}
                    >
                      Confirm retire
                    </button>
                    <button type="button" onClick={() => setConfirmSku(null)}>
                      Keep
                    </button>
                  </>
                ) : row.status === 'active' ? (
                  <button
                    type="button"
                    aria-label={`Retire ${row.sku}`}
                    onClick={() => setConfirmSku(row.sku)}
                  >
                    Retire
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Restore ${row.sku}`}
                    onClick={() => handleStatus(row, 'active')}
                  >
                    Restore
                  </button>
                )}
                {row.stock && adjustError[row.stock.id] && (
                  <span className="admin-error">
                    <span role="alert">{adjustError[row.stock.id]}</span>
                    <button onClick={() => handleAdjust(row, lastDelta[row.stock!.id] ?? 0)}>
                      Retry
                    </button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ProductFormProps {
  /** Undefined when adding. */
  product?: CatalogueProduct;
  existingSkus: string[];
  onSaved: (product: CatalogueProduct, pendingStock?: number) => void;
  onCancel: () => void;
}

function ProductForm({ product, existingSkus, onSaved, onCancel }: ProductFormProps) {
  const adding = product === undefined;
  const [values, setValues] = useState<ProductFormValues>(() =>
    product ? formFor(product) : emptyForm(),
  );
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [saving, setSaving] = useState(false);

  const field = (name: keyof ProductFormValues) => ({
    id: `product-${name}`,
    value: values[name],
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `product-${name}-error` : undefined,
    onChange: (event: { target: { value: string } }) =>
      setValues((prev) => ({ ...prev, [name]: event.target.value })),
  });

  const error = (name: keyof ProductFormValues) =>
    errors[name] && (
      <span id={`product-${name}-error`} className="catalogue__field-error">
        {errors[name]}
      </span>
    );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateProduct(values, { adding, existingSkus });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSaving(true);
    if (product) {
      onSaved(await catalogueMock.update(product, toDetails(values)));
    } else {
      const input = toNewProduct(values);
      onSaved(await catalogueMock.create(input), input.initialStock);
    }
  };

  const previewPrice = Number(values.price);
  const preview = {
    sku: values.sku.trim(),
    imageUrl: values.imageUrl.trim() || null,
  };

  return (
    <form
      className="catalogue__form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={adding ? 'Add product' : `Edit ${product.sku}`}
    >
      <div className="catalogue__fields">
        <h3>{adding ? 'Add product' : `Edit ${product.name}`}</h3>
        <label htmlFor="product-sku">SKU</label>
        <input {...field('sku')} readOnly={!adding} />
        {!adding && <span className="catalogue__muted">SKUs can't change once orders exist.</span>}
        {error('sku')}

        <label htmlFor="product-name">Name</label>
        <input {...field('name')} />
        {error('name')}

        <label htmlFor="product-description">Description</label>
        <textarea {...field('description')} rows={3} />

        <label htmlFor="product-price">Price ($)</label>
        <input {...field('price')} inputMode="decimal" />
        {error('price')}

        {adding && (
          <>
            <label htmlFor="product-initialStock">Initial stock</label>
            <input {...field('initialStock')} inputMode="numeric" />
            {error('initialStock')}
          </>
        )}

        <label htmlFor="product-imageUrl">Image URL (optional)</label>
        <input {...field('imageUrl')} placeholder="https://…" />
        {error('imageUrl')}

        <div className="catalogue__form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : adding ? 'Add product' : 'Save changes'}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>

      <figure className="catalogue__preview" aria-label="Storefront preview">
        <img src={imageOf(preview)} alt="" />
        <figcaption>
          <strong>{values.name.trim() || 'Product name'}</strong>
          <span className="catalogue__muted">{preview.sku || 'sku'}</span>
          <span className="catalogue__price">
            {Number.isFinite(previewPrice) && previewPrice > 0
              ? formatPrice(Math.round(previewPrice * 100))
              : '$—'}
          </span>
        </figcaption>
      </figure>
    </form>
  );
}
