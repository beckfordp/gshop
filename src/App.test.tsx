import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import type { Order } from './services/orderClient';

const testOrder: Order = {
  id: 'order-1',
  customerId: 'cart-1',
  totalCents: 1999,
  status: 'pending',
  items: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

vi.mock('./screens/Catalog/Catalog', () => ({
  default: () => <div>Catalog screen</div>,
}));

vi.mock('./screens/Cart/Cart', () => ({
  default: ({ onCheckoutSuccess }: { onCheckoutSuccess: (order: Order) => void }) => (
    <div>
      Cart screen
      <button onClick={() => onCheckoutSuccess(testOrder)}>Trigger checkout success</button>
    </div>
  ),
}));

vi.mock('./screens/Checkout/Checkout', () => ({
  default: ({ order, onContinueShopping }: { order: Order; onContinueShopping: () => void }) => (
    <div>
      Checkout screen for {order.id}
      <button onClick={onContinueShopping}>Continue Shopping</button>
    </div>
  ),
}));

describe('App', () => {
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

  it("switches to the Checkout screen with the order when Cart's checkout succeeds", () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'View Cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger checkout success' }));

    expect(screen.getByText('Checkout screen for order-1')).toBeInTheDocument();
    expect(screen.queryByText('Cart screen')).not.toBeInTheDocument();
  });

  it('"Continue Shopping" on the Checkout screen returns to Catalog', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'View Cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger checkout success' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue Shopping' }));

    expect(screen.getByText('Catalog screen')).toBeInTheDocument();
    expect(screen.queryByText(/Checkout screen/)).not.toBeInTheDocument();
  });
});
