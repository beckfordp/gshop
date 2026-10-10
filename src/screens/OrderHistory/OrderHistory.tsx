import { useCallback, useEffect, useState } from 'react';
import { orderClient, type Order } from '../../services/orderClient';
import { getStoredCustomerId } from '../../services/customerId';
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
    const customerId = getStoredCustomerId();
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
    return <p>You have no past orders.</p>;
  }

  return (
    <div className="order-history">
      <ul className="order-history-list">
        {orders.map((order) => (
          <li key={order.id} className="order-history-card">
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
        ))}
      </ul>
    </div>
  );
}
