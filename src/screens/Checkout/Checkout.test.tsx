import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Checkout from './Checkout';
import type { Order } from '../../services/orderClient';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'cart-1',
    totalCents: 3499,
    status: 'pending',
    items: [
      {
        id: 'item-1',
        sku: 'WID-1',
        productName: 'Widget',
        unitPriceCents: 1999,
        quantity: 1,
      },
      {
        id: 'item-2',
        sku: 'GAD-1',
        productName: 'Gadget',
        unitPriceCents: 750,
        quantity: 2,
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Checkout', () => {
  it("renders the order's id, status, items, and total", () => {
    const order = makeOrder();

    render(<Checkout order={order} onContinueShopping={vi.fn()} />);

    expect(screen.getByText(/order-1/)).toBeInTheDocument();
    expect(screen.getByText(/Pending/)).toBeInTheDocument();
    const widgetLine = screen.getByText(/Widget/);
    expect(widgetLine.textContent).toContain('qty 1');
    expect(widgetLine.textContent).toContain('$19.99');
    const gadgetLine = screen.getByText(/Gadget/);
    expect(gadgetLine.textContent).toContain('qty 2');
    expect(gadgetLine.textContent).toContain('$15.00');
    expect(screen.getByText(/Total: \$34\.99/)).toBeInTheDocument();
  });

  it('formats a reservation_failed status for display', () => {
    render(<Checkout order={makeOrder({ status: 'reservation_failed' })} onContinueShopping={vi.fn()} />);

    expect(screen.getByText(/Reservation failed/)).toBeInTheDocument();
  });

  it('calls onContinueShopping when "Continue Shopping" is clicked', () => {
    const onContinueShopping = vi.fn();
    render(<Checkout order={makeOrder()} onContinueShopping={onContinueShopping} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue Shopping' }));

    expect(onContinueShopping).toHaveBeenCalledOnce();
  });
});
