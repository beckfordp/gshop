import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrderHistory from './OrderHistory';
import { orderClient, type Order } from '../../services/orderClient';
import { getStoredCustomerId } from '../../services/customerId';

vi.mock('../../services/orderClient', () => ({
  orderClient: { list: vi.fn() },
}));

vi.mock('../../services/customerId', () => ({
  getStoredCustomerId: vi.fn(),
}));

const list = vi.mocked(orderClient.list);
const getStoredCustomerIdMock = vi.mocked(getStoredCustomerId);

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'customer-1',
    totalCents: 1999,
    status: 'pending',
    items: [
      {
        id: 'item-1',
        sku: 'WID-1',
        productName: 'Widget',
        unitPriceCents: 1999,
        quantity: 1,
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('OrderHistory', () => {
  beforeEach(() => {
    list.mockReset();
    getStoredCustomerIdMock.mockReset();
  });

  it('shows an empty-history message when no customer id is stored, with no API call', async () => {
    getStoredCustomerIdMock.mockReturnValue(null);

    render(<OrderHistory />);

    expect(await screen.findByText('You have no past orders.')).toBeInTheDocument();
    expect(list).not.toHaveBeenCalled();
  });

  it('shows a loading state while fetching', async () => {
    getStoredCustomerIdMock.mockReturnValue('customer-1');
    list.mockReturnValue(new Promise(() => {}));

    render(<OrderHistory />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows an empty-history message when the customer has no past orders', async () => {
    getStoredCustomerIdMock.mockReturnValue('customer-1');
    list.mockResolvedValue([]);

    render(<OrderHistory />);

    expect(await screen.findByText('You have no past orders.')).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith('customer-1');
  });

  it('renders past orders with id, status, items, total, and date, in server order', async () => {
    const orders = [
      makeOrder({ id: 'order-2', status: 'pending', totalCents: 1999 }),
      makeOrder({
        id: 'order-1',
        status: 'reservation_failed',
        totalCents: 500,
        items: [
          {
            id: 'item-2',
            sku: 'GAD-1',
            productName: 'Gadget',
            unitPriceCents: 250,
            quantity: 2,
          },
        ],
      }),
    ];
    getStoredCustomerIdMock.mockReturnValue('customer-1');
    list.mockResolvedValue(orders);

    render(<OrderHistory />);

    const order2 = await screen.findByText(/order-2/);
    const order1 = screen.getByText(/order-1/);
    expect(order2.compareDocumentPosition(order1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getByText(/Pending/)).toBeInTheDocument();
    expect(screen.getByText(/Reservation failed/)).toBeInTheDocument();

    const gadgetLine = screen.getByText(/Gadget/);
    expect(gadgetLine.textContent).toContain('qty 2');
    expect(gadgetLine.textContent).toContain('$5.00');
  });

  it('shows an error and working Retry when the fetch fails', async () => {
    getStoredCustomerIdMock.mockReturnValue('customer-1');
    list
      .mockRejectedValueOnce(new Error('order service down'))
      .mockResolvedValueOnce([makeOrder()]);

    render(<OrderHistory />);

    await screen.findByText('order service down');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByText(/order-1/);
    expect(screen.queryByText('order service down')).not.toBeInTheDocument();
  });
});
