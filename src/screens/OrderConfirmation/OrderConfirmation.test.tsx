import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OrderConfirmation from './OrderConfirmation';
import type { Order } from '../../services/orderClient';

const shippingAddress = {
  line1: '1 Watchmaker Lane',
  line2: 'Flat 2',
  city: 'London',
  postalCode: 'EC1A 1BB',
  country: 'GB',
};

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'cart-1',
    totalCents: 3499,
    status: 'authorized',
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
    shippingAddress,
    ...overrides,
  };
}

describe('OrderConfirmation', () => {
  it("renders the order's id, status, items, and total", () => {
    render(<OrderConfirmation order={makeOrder()} onContinueShopping={vi.fn()} />);

    expect(screen.getByText(/order-1/)).toBeInTheDocument();
    expect(screen.getByText(/Authorized/)).toBeInTheDocument();
    const widgetLine = screen.getByText(/Widget/);
    expect(widgetLine.textContent).toContain('qty 1');
    expect(widgetLine.textContent).toContain('$19.99');
    const gadgetLine = screen.getByText(/Gadget/);
    expect(gadgetLine.textContent).toContain('qty 2');
    expect(gadgetLine.textContent).toContain('$15.00');
    expect(screen.getByText(/Total: \$34\.99/)).toBeInTheDocument();
  });

  it('shows "Payment authorised" for an authorized order', () => {
    render(<OrderConfirmation order={makeOrder()} onContinueShopping={vi.fn()} />);

    expect(screen.getByText('Payment authorised')).toBeInTheDocument();
  });

  it('renders the shipping address when present', () => {
    render(<OrderConfirmation order={makeOrder()} onContinueShopping={vi.fn()} />);

    const region = screen.getByRole('region', { name: 'Shipping address' });
    expect(region).toHaveTextContent('1 Watchmaker Lane, Flat 2');
    expect(region).toHaveTextContent('London, EC1A 1BB');
    expect(region).toHaveTextContent('GB');
  });

  it('omits the shipping address when absent', () => {
    render(
      <OrderConfirmation
        order={makeOrder({ shippingAddress: null })}
        onContinueShopping={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('region', { name: 'Shipping address' }),
    ).not.toBeInTheDocument();
  });

  it('renders a WatchArt thumbnail for each order item', () => {
    const { container } = render(
      <OrderConfirmation order={makeOrder()} onContinueShopping={vi.fn()} />,
    );

    expect(container.querySelectorAll('.watch-art')).toHaveLength(2);
  });

  it('formats a reservation_failed status for display', () => {
    render(
      <OrderConfirmation
        order={makeOrder({ status: 'reservation_failed' })}
        onContinueShopping={vi.fn()}
      />,
    );

    expect(screen.getByText(/Reservation failed/)).toBeInTheDocument();
    expect(screen.queryByText('Payment authorised')).not.toBeInTheDocument();
  });

  it('calls onContinueShopping when "Continue Shopping" is clicked', () => {
    const onContinueShopping = vi.fn();
    render(
      <OrderConfirmation
        order={makeOrder()}
        onContinueShopping={onContinueShopping}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue Shopping' }));

    expect(onContinueShopping).toHaveBeenCalledOnce();
  });
});
