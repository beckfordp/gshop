import { useCallback, useEffect, useState } from 'react';
import { cartClient } from '../../services/cartClient';
import { catalogClient } from '../../services/catalogClient';
import { getStoredCartId } from '../../services/cartId';
import { errorMessage, formatPrice } from '../../lib/format';
import './Cart.css';

// catalog-service has no lookup-by-sku endpoint, so the join below fetches
// the whole catalog in one page — fine at today's ~10-item scale (see
// spec.md's Out of Scope).
const CATALOG_PAGE_SIZE = 100;

interface CartLine {
  sku: string;
  quantity: number;
  name: string;
  priceCents: number | null;
}

export default function Cart() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const cartId = getStoredCartId();
    if (!cartId) {
      setLines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [cart, catalog] = await Promise.all([
        cartClient.get(cartId),
        catalogClient.list({ limit: CATALOG_PAGE_SIZE, offset: 0 }),
      ]);
      const catalogBySku = new Map(catalog.items.map((item) => [item.sku, item]));
      const nextLines = Object.entries(cart.items).map(([sku, quantity]) => {
        const catalogItem = catalogBySku.get(sku);
        return {
          sku,
          quantity,
          name: catalogItem?.name ?? sku,
          priceCents: catalogItem?.priceCents ?? null,
        };
      });
      setLines(nextLines);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (sku: string, action: (cartId: string) => Promise<unknown>) => {
    const cartId = getStoredCartId();
    if (!cartId) {
      return;
    }
    setActionLoading((prev) => ({ ...prev, [sku]: true }));
    setActionError((prev) => {
      const next = { ...prev };
      delete next[sku];
      return next;
    });
    try {
      await action(cartId);
      await load();
    } catch (err) {
      setActionError((prev) => ({ ...prev, [sku]: errorMessage(err) }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [sku]: false }));
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return (
      <div className="cart-error">
        <p role="alert">{error}</p>
        <button onClick={load}>Retry</button>
      </div>
    );
  }

  if (lines.length === 0) {
    return <p>Your cart is empty.</p>;
  }

  const total = lines.reduce((sum, line) => sum + (line.priceCents ?? 0) * line.quantity, 0);

  return (
    <div className="cart">
      <ul className="cart-list">
        {lines.map((line) => (
          <li key={line.sku} className="cart-item">
            {line.name} — qty {line.quantity}
            {line.priceCents !== null && ` — ${formatPrice(line.priceCents * line.quantity)}`}
            <button
              onClick={() => runAction(line.sku, (cartId) => cartClient.addItem(cartId, line.sku, 1))}
              disabled={actionLoading[line.sku]}
            >
              +1
            </button>
            <button
              onClick={() => runAction(line.sku, (cartId) => cartClient.removeItem(cartId, line.sku))}
              disabled={actionLoading[line.sku]}
            >
              Remove
            </button>
            {actionError[line.sku] && (
              <span className="cart-error">
                <span role="alert">{actionError[line.sku]}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="cart-total">Total: {formatPrice(total)}</p>
    </div>
  );
}
