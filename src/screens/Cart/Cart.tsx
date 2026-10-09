import { useCallback, useEffect, useState } from 'react';
import { cartClient } from '../../services/cartClient';
import { catalogClient } from '../../services/catalogClient';
import { clearCartId, getStoredCartId } from '../../services/cartId';
import { getOrCreateCustomerId } from '../../services/customerId';
import { orderClient, type Order } from '../../services/orderClient';
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

interface CartProps {
  onCheckoutSuccess: (order: Order) => void;
}

export default function Cart({ onCheckoutSuccess }: CartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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

  const handleCheckout = async () => {
    const cartId = getStoredCartId();
    if (!cartId) {
      return;
    }
    if (lines.some((line) => line.priceCents === null)) {
      setCheckoutError('Remove unavailable items before checking out.');
      return;
    }

    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const order = await orderClient.create({
        customerId: getOrCreateCustomerId(),
        // Safe: the `lines.some(...)` guard above already returned early
        // if any line's priceCents is null, so every line here has a
        // resolved price — TypeScript just can't see that across the
        // .some()/.map() boundary.
        items: lines.map((line) => ({
          sku: line.sku,
          productName: line.name,
          unitPriceCents: line.priceCents as number,
          quantity: line.quantity,
        })),
      });
      if (order.status === 'reservation_failed') {
        const failedSku = order.reservationFailure?.sku;
        const failedLine = lines.find((line) => line.sku === failedSku);
        const itemLabel = failedLine?.name ?? failedSku ?? 'An item';
        setCheckoutError(`${itemLabel} is out of stock.`);
        return;
      }
      clearCartId();
      onCheckoutSuccess(order);
    } catch (err) {
      setCheckoutError(errorMessage(err));
    } finally {
      setCheckingOut(false);
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
      <button onClick={handleCheckout} disabled={checkingOut}>
        {checkingOut ? 'Placing order...' : 'Checkout'}
      </button>
      {checkoutError && (
        <div className="cart-error">
          <p role="alert">{checkoutError}</p>
          <button onClick={handleCheckout}>Retry</button>
        </div>
      )}
    </div>
  );
}
