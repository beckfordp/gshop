import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import type { NewOrderItem, Order } from './services/orderClient';

const testItems: NewOrderItem[] = [
  { sku: 'WID-1', productName: 'Widget', unitPriceCents: 1999, quantity: 1 },
];

const testOrder: Order = {
  id: 'order-1',
  customerId: 'cart-1',
  totalCents: 1999,
  status: 'authorized',
  items: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  shippingAddress: null,
  reservationFailure: null,
  paymentFailure: null,
};

vi.mock('./screens/Catalog/Catalog', () => ({
  default: () => <div>Catalog screen</div>,
}));

vi.mock('./screens/Cart/Cart', () => ({
  default: ({
    onProceedToCheckout,
  }: {
    onProceedToCheckout: (items: NewOrderItem[]) => void;
  }) => (
    <div>
      Cart screen
      <button onClick={() => onProceedToCheckout(testItems)}>Proceed to checkout</button>
    </div>
  ),
}));

vi.mock('./screens/Checkout/Checkout', () => ({
  default: ({
    items,
    onOrderPlaced,
    onBackToCart,
  }: {
    items: NewOrderItem[];
    onOrderPlaced: (order: Order) => void;
    onBackToCart: () => void;
  }) => (
    <div>
      Checkout screen for {items.length} item(s)
      <button onClick={() => onOrderPlaced(testOrder)}>Place order</button>
      <button onClick={onBackToCart}>Back to Cart</button>
    </div>
  ),
}));

vi.mock('./screens/OrderConfirmation/OrderConfirmation', () => ({
  default: ({
    order,
    onContinueShopping,
  }: {
    order: Order;
    onContinueShopping: () => void;
  }) => (
    <div>
      Confirmation screen for {order.id}
      <button onClick={onContinueShopping}>Continue Shopping</button>
    </div>
  ),
}));

vi.mock('./screens/OrderHistory/OrderHistory', () => ({
  default: () => <div>Order History screen</div>,
}));

vi.mock('./screens/Admin/Admin', () => ({
  default: () => <div>Admin screen</div>,
}));

describe('App', () => {
  it('renders a header with the brand wordmark', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('gshop')).toBeInTheDocument();
  });

  it('renders the Catalog screen by default', () => {
    render(<App />);
    expect(screen.getByText('Catalog screen')).toBeInTheDocument();
  });

  it('switches to the Cart screen via "View Cart" and back via "Back to Catalog"', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'View Cart' }));
    expect(screen.getByText('Cart screen')).toBeInTheDocument();
    expect(screen.queryByText('Catalog screen')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Catalog' }));
    expect(screen.getByText('Catalog screen')).toBeInTheDocument();
    expect(screen.queryByText('Cart screen')).not.toBeInTheDocument();
  });

  it('moves to Checkout with the cart items, hiding nav and Admin', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'View Cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to checkout' }));

    expect(screen.getByText('Checkout screen for 1 item(s)')).toBeInTheDocument();
    expect(screen.queryByText('Cart screen')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to Catalog' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('moves to Confirmation when the order is placed and Continue Shopping returns to Catalog', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'View Cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to checkout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(screen.getByText('Confirmation screen for order-1')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue Shopping' }));

    expect(screen.getByText('Catalog screen')).toBeInTheDocument();
    expect(screen.queryByText(/Confirmation screen/)).not.toBeInTheDocument();
  });

  it('"Back to Cart" on Checkout returns to the Cart', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'View Cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to checkout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to Cart' }));

    expect(screen.getByText('Cart screen')).toBeInTheDocument();
  });

  it('"Order History" is reachable from Catalog and Cart', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Order History' }));
    expect(screen.getByText('Order History screen')).toBeInTheDocument();
    expect(screen.queryByText('Catalog screen')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Catalog' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Order History' }));
    expect(screen.getByText('Order History screen')).toBeInTheDocument();
  });

  it('a discreet "Admin" link is present and navigates to the Admin screen', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Admin' }));
    expect(screen.getByText('Admin screen')).toBeInTheDocument();
    expect(screen.queryByText('Catalog screen')).not.toBeInTheDocument();
  });

  it("History screen's own nav shows Back to Catalog and View Cart", () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Order History' }));
    expect(screen.getByText('Order History screen')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View Cart' }));
    expect(screen.getByText('Cart screen')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Order History' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to Catalog' }));
    expect(screen.getByText('Catalog screen')).toBeInTheDocument();
  });
});
