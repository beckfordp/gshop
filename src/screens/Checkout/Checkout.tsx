import { formatPrice, formatStatus } from '../../lib/format';
import type { Order } from '../../services/orderClient';
import WatchArt from '../../components/WatchArt/WatchArt';
import './Checkout.css';

interface CheckoutProps {
  order: Order;
  onContinueShopping: () => void;
}

export default function Checkout({ order, onContinueShopping }: CheckoutProps) {
  return (
    <div className="checkout">
      <h1>Order placed</h1>
      <p>Order ID: {order.id}</p>
      <p>Status: {formatStatus(order.status)}</p>
      <ul className="checkout-list">
        {order.items.map((item) => (
          <li key={item.id} className="checkout-item">
            <WatchArt sku={item.sku} name={item.productName} size={56} />
            <span className="checkout-item__details">
              {item.productName} — qty {item.quantity} —{' '}
              {formatPrice(item.unitPriceCents * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <p className="checkout-total">Total: {formatPrice(order.totalCents)}</p>
      <button className="checkout-continue" onClick={onContinueShopping}>
        Continue Shopping
      </button>
    </div>
  );
}
