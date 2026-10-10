import { useCallback, useEffect, useState } from 'react';
import { catalogClient } from '../../services/catalogClient';
import { inventoryClient } from '../../services/inventoryClient';
import { orderClient, OrderClientError } from '../../services/orderClient';
import { getStoredCustomerId } from '../../services/customerId';
import { errorMessage } from '../../lib/format';
import './Admin.css';

// catalog-service has no lookup-by-sku endpoint, so the join below fetches
// the whole catalog in one page — same approach as Cart.tsx's join (see
// its own comment), fine at today's ~100-item scale.
const CATALOG_PAGE_SIZE = 100;

type ClearStep = 'idle' | 'confirming' | 'clearing' | 'done' | 'error';

interface InventoryRow {
  id: string;
  sku: string;
  name: string;
  quantityAvailable: number;
  quantityReserved: number;
}

export default function Admin() {
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [adjustLoading, setAdjustLoading] = useState<Record<string, boolean>>({});
  const [adjustError, setAdjustError] = useState<Record<string, string>>({});
  const [lastDelta, setLastDelta] = useState<Record<string, number>>({});

  const [clearStep, setClearStep] = useState<ClearStep>('idle');
  const [clearError, setClearError] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      const [items, catalog] = await Promise.all([
        inventoryClient.list(),
        catalogClient.list({ limit: CATALOG_PAGE_SIZE, offset: 0 }),
      ]);
      const catalogBySku = new Map(catalog.items.map((item) => [item.sku, item]));
      setRows(
        items.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: catalogBySku.get(item.sku)?.name ?? item.sku,
          quantityAvailable: item.quantityAvailable,
          quantityReserved: item.quantityReserved,
        })),
      );
    } catch (error) {
      setInventoryError(errorMessage(error));
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleAdjust = async (row: InventoryRow, delta: number) => {
    const nextAvailable = row.quantityAvailable + delta;
    if (nextAvailable < 0) {
      return;
    }
    setLastDelta((prev) => ({ ...prev, [row.id]: delta }));
    setAdjustLoading((prev) => ({ ...prev, [row.id]: true }));
    setAdjustError((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    try {
      const updated = await inventoryClient.adjust(row.id, nextAvailable, row.quantityReserved);
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                quantityAvailable: updated.quantityAvailable,
                quantityReserved: updated.quantityReserved,
              }
            : r,
        ),
      );
    } catch (error) {
      setAdjustError((prev) => ({ ...prev, [row.id]: errorMessage(error) }));
    } finally {
      setAdjustLoading((prev) => ({ ...prev, [row.id]: false }));
    }
  };

  // order-service's order-list read is cached with no invalidation on
  // delete (see tech-stack.md), so a Retry after a partial failure can see
  // a stale list that still includes orders already removed in the
  // previous attempt — treat "already gone" (404) as success rather than
  // a real failure.
  const removeOrderIgnoringAlreadyGone = async (id: string) => {
    try {
      await orderClient.remove(id);
    } catch (error) {
      if (error instanceof OrderClientError && error.status === 404) {
        return;
      }
      throw error;
    }
  };

  const handleClearHistory = async () => {
    const customerId = getStoredCustomerId();
    if (!customerId) {
      setClearStep('done');
      return;
    }
    setClearStep('clearing');
    setClearError(null);
    try {
      const orders = await orderClient.list(customerId);
      await Promise.all(orders.map((order) => removeOrderIgnoringAlreadyGone(order.id)));
      setClearStep('done');
    } catch (error) {
      setClearError(errorMessage(error));
      setClearStep('error');
    }
  };

  return (
    <div className="admin">
      <h1>Admin</h1>

      <section className="admin-section">
        <h2>Order history</h2>
        {clearStep === 'idle' && (
          <button onClick={() => setClearStep('confirming')}>Clear order history</button>
        )}
        {clearStep === 'confirming' && (
          <div className="admin-confirm">
            <p>This permanently deletes every order for this customer. Are you sure?</p>
            <button onClick={handleClearHistory}>Yes, clear it</button>
            <button onClick={() => setClearStep('idle')}>Cancel</button>
          </div>
        )}
        {clearStep === 'clearing' && <p>Clearing...</p>}
        {clearStep === 'done' && <p>Order history cleared.</p>}
        {clearStep === 'error' && (
          <div className="admin-error">
            <p role="alert">{clearError}</p>
            <button onClick={handleClearHistory}>Retry</button>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Inventory</h2>
        {inventoryLoading && <p>Loading...</p>}
        {inventoryError && (
          <div className="admin-error">
            <p role="alert">{inventoryError}</p>
            <button onClick={loadInventory}>Retry</button>
          </div>
        )}
        {!inventoryLoading && !inventoryError && (
          <table className="admin-inventory-table">
            <thead>
              <tr>
                <th>Sku</th>
                <th>Name</th>
                <th>Available</th>
                <th>Reserved</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.sku}</td>
                  <td>{row.name}</td>
                  <td>{row.quantityAvailable}</td>
                  <td>{row.quantityReserved}</td>
                  <td>
                    <button
                      onClick={() => handleAdjust(row, -1)}
                      disabled={adjustLoading[row.id] || row.quantityAvailable <= 0}
                    >
                      −1
                    </button>
                    <button onClick={() => handleAdjust(row, 1)} disabled={adjustLoading[row.id]}>
                      +1
                    </button>
                    {adjustError[row.id] && (
                      <span className="admin-error">
                        <span role="alert">{adjustError[row.id]}</span>
                        <button onClick={() => handleAdjust(row, lastDelta[row.id] ?? 0)}>
                          Retry
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
