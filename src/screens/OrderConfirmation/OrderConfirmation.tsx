import { useEffect, useRef } from 'react';
import { formatPrice, formatStatus } from '../../lib/format';
import type { Order } from '../../services/orderClient';
import WatchArt from '../../components/WatchArt/WatchArt';
import './OrderConfirmation.css';

interface OrderConfirmationProps {
  order: Order;
  onContinueShopping: () => void;
}

export default function OrderConfirmation({
  order,
  onContinueShopping,
}: OrderConfirmationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // No router: move focus so screen-reader/keyboard users land on the new
    // screen instead of the button that was just removed.
    headingRef.current?.focus();
  }, []);

  const address = order.shippingAddress;

  return (
    <div className="order-confirmation">
      <h1 ref={headingRef} tabIndex={-1}>
        Order placed
      </h1>
      <p>Order ID: {order.id}</p>
      <p>Status: {formatStatus(order.status)}</p>
      {order.status === 'authorized' && (
        <p className="order-confirmation__payment">Payment authorised</p>
      )}
      {address && (
        <section className="order-confirmation__address" aria-label="Shipping address">
          <h2>Shipping to</h2>
          <address>
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ''}
            <br />
            {address.city}, {address.postalCode}
            <br />
            {address.country}
          </address>
        </section>
      )}
      <ul className="order-confirmation__list">
        {order.items.map((item) => (
          <li key={item.id} className="order-confirmation__item">
            <WatchArt sku={item.sku} name={item.productName} size={56} />
            <span className="order-confirmation__item-details">
              {item.productName} — qty {item.quantity} —{' '}
              {formatPrice(item.unitPriceCents * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <p className="order-confirmation__total">Total: {formatPrice(order.totalCents)}</p>
      <button className="order-confirmation__continue" onClick={onContinueShopping}>
        Continue Shopping
      </button>
    </div>
  );
}
