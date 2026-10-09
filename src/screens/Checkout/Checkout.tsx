import { formatPrice, formatStatus } from '../../lib/format';
import type { Order } from '../../services/orderClient';
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
            {item.productName} — qty {item.quantity} —{' '}
            {formatPrice(item.unitPriceCents * item.quantity)}
          </li>
        ))}
      </ul>
      <p className="checkout-total">Total: {formatPrice(order.totalCents)}</p>
      <button onClick={onContinueShopping}>Continue Shopping</button>
    </div>
  );
}
