// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useState } from 'react';
import { orderClient, OrderClientError, type Order } from '../../services/orderClient';
import { getStoredCustomerId } from '../../services/customerId';
import { getSession } from '../../services/mockAuth';
import { resolveIdentity } from '../../services/identityStore';
import { errorMessage, formatPrice, formatStatus } from '../../lib/format';
import WatchArt from '../../components/WatchArt/WatchArt';
import './OrderHistory.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export default function OrderHistory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cancelFor, setCancelFor] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<{
    orderId: string;
    message: string;
    status?: number;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const customerId = getSession()?.user.userId ?? getStoredCustomerId();
    if (!customerId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await orderClient.list(customerId);
      setOrders(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    setCancelError(null);
    try {
      const updated = await orderClient.cancel(id);
      setOrders((current) => current.map((order) => (order.id === id ? updated : order)));
      setCancelFor(null);
      setNotice(
        `Order ${id} cancelled. The payment hold and reserved stock will be released shortly.`,
      );
    } catch (err) {
      setCancelError({
        orderId: id,
        message: errorMessage(err),
        status: err instanceof OrderClientError ? err.status : undefined,
      });
    } finally {
      setCancelling(null);
    }
  };

  const session = getSession();
  const identityHeader = (
    <p className="order-history__identity">
      {session ? (
        <>
          Signed in as <strong>{session.user.email}</strong> — showing your orders
        </>
      ) : (
        <>
          <strong>Anonymous orders</strong> — sign in at checkout to keep these
        </>
      )}
    </p>
  );

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return (
      <div className="order-history-error">
        <p role="alert">{error}</p>
        <button onClick={load}>Retry</button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="order-history">
        {identityHeader}
        <p>You have no past orders.</p>
      </div>
    );
  }

  return (
    <div className="order-history">
      {identityHeader}
      {notice && (
        <p className="order-history-notice" role="status">
          {notice}
        </p>
      )}
      <ul className="order-history-list">
        {orders.map((order) => {
          const identity = resolveIdentity(order.customerId);
          return (
            <li key={order.id} className="order-history-card">
              <p className="order-history-card__identity">
                <span className={`identity-badge identity-badge--${identity.type}`}>
                  {identity.type === 'user' ? 'User' : 'Anonymous'}
                </span>
                <span>
                  {identity.type === 'user'
                    ? identity.email
                    : `id ${identity.customerId.slice(0, 8)}…`}
                </span>
              </p>
              <p>Order ID: {order.id}</p>
              <p>Status: {formatStatus(order.status)}</p>
              <p>Date: {formatDate(order.createdAt)}</p>
              <ul className="order-history-items">
                {order.items.map((item) => (
                  <li key={item.id} className="order-history-item">
                    <WatchArt sku={item.sku} name={item.productName} size={48} />
                    <span>
                      {item.productName} — qty {item.quantity} —{' '}
                      {formatPrice(item.unitPriceCents * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="order-history-total">Total: {formatPrice(order.totalCents)}</p>
              {order.status === 'authorized' && (
                <div className="order-history-card__actions">
                  {cancelFor === order.id ? (
                    <div className="order-history-confirm">
                      <p>
                        Cancel this order? The payment hold and reserved stock will be released
                        shortly.
                      </p>
                      <button
                        type="button"
                        aria-label={`Confirm cancel ${order.id}`}
                        disabled={cancelling === order.id}
                        onClick={() => void handleCancel(order.id)}
                      >
                        Yes, cancel order
                      </button>
                      <button
                        type="button"
                        disabled={cancelling === order.id}
                        onClick={() => setCancelFor(null)}
                      >
                        Keep order
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Cancel order ${order.id}`}
                      onClick={() => {
                        setCancelFor(order.id);
                        setCancelError(null);
                      }}
                    >
                      Cancel order
                    </button>
                  )}
                  {cancelError?.orderId === order.id && (
                    <p role="alert">
                      {cancelError.message}
                      {cancelError.status === 409
                        ? ' The order may already be cancelled or dispatched. If it has already shipped, see returns (US-23).'
                        : ''}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
