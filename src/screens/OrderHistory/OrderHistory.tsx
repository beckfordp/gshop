import { useCallback, useEffect, useState } from 'react';
import { orderClient, type Order } from '../../services/orderClient';
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

  const session = getSession();
  const identityHeader = (
    <p className="order-history__identity">
      {session ? (
        <>
          Signed in as <strong>{session.user.email}</strong> — showing your
          orders
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
      <ul className="order-history-list">
        {orders.map((order) => {
          const identity = resolveIdentity(order.customerId);
          return (
          <li key={order.id} className="order-history-card">
            <p className="order-history-card__identity">
              <span
                className={`identity-badge identity-badge--${identity.type}`}
              >
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
          </li>
          );
        })}
      </ul>
    </div>
  );
}
