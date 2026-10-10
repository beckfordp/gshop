import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Admin from './Admin';
import { catalogClient, type CatalogItem } from '../../services/catalogClient';
import { inventoryClient, type InventoryItem } from '../../services/inventoryClient';
import { orderClient, type Order } from '../../services/orderClient';
import { getStoredCustomerId } from '../../services/customerId';

vi.mock('../../services/catalogClient', () => ({
  catalogClient: { list: vi.fn() },
}));

vi.mock('../../services/inventoryClient', () => ({
  inventoryClient: { list: vi.fn(), adjust: vi.fn() },
}));

vi.mock('../../services/orderClient', () => ({
  orderClient: { list: vi.fn(), remove: vi.fn() },
}));

vi.mock('../../services/customerId', () => ({
  getStoredCustomerId: vi.fn(),
}));

const catalogList = vi.mocked(catalogClient.list);
const inventoryList = vi.mocked(inventoryClient.list);
const inventoryAdjust = vi.mocked(inventoryClient.adjust);
const orderList = vi.mocked(orderClient.list);
const orderRemove = vi.mocked(orderClient.remove);
const getStoredCustomerIdMock = vi.mocked(getStoredCustomerId);

function makeInventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    sku: 'watch-rolex-submariner',
    quantityAvailable: 5,
    quantityReserved: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCatalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: 'catalog-1',
    name: 'Rolex Submariner',
    description: 'A watch',
    priceCents: 950000,
    sku: 'watch-rolex-submariner',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'customer-1',
    totalCents: 950000,
    status: 'pending',
    items: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    reservationFailure: null,
    ...overrides,
  };
}

describe('Admin', () => {
  beforeEach(() => {
    catalogList.mockReset();
    inventoryList.mockReset();
    inventoryAdjust.mockReset();
    orderList.mockReset();
    orderRemove.mockReset();
    getStoredCustomerIdMock.mockReset();
    catalogList.mockResolvedValue({ items: [makeCatalogItem()], total: 1 });
    inventoryList.mockResolvedValue([makeInventoryItem()]);
  });

  it('renders the inventory table joined against the catalog for display names', async () => {
    render(<Admin />);

    await screen.findByText('Rolex Submariner');
    expect(screen.getByText('watch-rolex-submariner')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows a loading state while fetching inventory', async () => {
    let resolveList!: (value: InventoryItem[]) => void;
    inventoryList.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    render(<Admin />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    resolveList([]);
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  });

  it('shows an error and working Retry when the inventory fetch fails', async () => {
    inventoryList.mockRejectedValueOnce(new Error('inventory down')).mockResolvedValueOnce([
      makeInventoryItem(),
    ]);

    render(<Admin />);

    await screen.findByText('inventory down');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByText('Rolex Submariner');
    expect(screen.queryByText('inventory down')).not.toBeInTheDocument();
  });

  it('+1 adjusts quantityAvailable up, sending the unchanged quantityReserved', async () => {
    inventoryAdjust.mockResolvedValue(makeInventoryItem({ quantityAvailable: 6, quantityReserved: 1 }));

    render(<Admin />);

    await screen.findByText('Rolex Submariner');
    fireEvent.click(screen.getByRole('button', { name: '+1' }));

    await waitFor(() => expect(screen.getByText('6')).toBeInTheDocument());
    expect(inventoryAdjust).toHaveBeenCalledWith('inv-1', 6, 1);
  });

  it('-1 adjusts quantityAvailable down and disables itself at 0', async () => {
    inventoryList.mockResolvedValue([makeInventoryItem({ quantityAvailable: 1, quantityReserved: 0 })]);
    inventoryAdjust.mockResolvedValue(makeInventoryItem({ quantityAvailable: 0, quantityReserved: 0 }));

    render(<Admin />);

    await screen.findByText('Rolex Submariner');
    fireEvent.click(screen.getByRole('button', { name: '−1' }));

    await waitFor(() => expect(inventoryAdjust).toHaveBeenCalledWith('inv-1', 0, 0));
    await waitFor(() => expect(screen.getByRole('button', { name: '−1' })).toBeDisabled());
  });

  it('shows an inline error and working Retry when an adjustment fails', async () => {
    inventoryAdjust
      .mockRejectedValueOnce(new Error('adjust failed'))
      .mockResolvedValueOnce(makeInventoryItem({ quantityAvailable: 6, quantityReserved: 1 }));

    render(<Admin />);

    await screen.findByText('Rolex Submariner');
    fireEvent.click(screen.getByRole('button', { name: '+1' }));

    await screen.findByText('adjust failed');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('6')).toBeInTheDocument());
    expect(screen.queryByText('adjust failed')).not.toBeInTheDocument();
  });

  it('"Clear order history" requires confirmation before deleting anything', async () => {
    render(<Admin />);

    await screen.findByText('Rolex Submariner');
    fireEvent.click(screen.getByRole('button', { name: 'Clear order history' }));

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(orderList).not.toHaveBeenCalled();
    expect(orderRemove).not.toHaveBeenCalled();
  });

  it('canceling the confirmation makes no network calls', async () => {
    render(<Admin />);

    await screen.findByText('Rolex Submariner');
    fireEvent.click(screen.getByRole('button', { name: 'Clear order history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Clear order history' })).toBeInTheDocument();
    expect(orderList).not.toHaveBeenCalled();
  });

  it('confirming deletes every order for the current customer and shows a done message', async () => {
    getStoredCustomerIdMock.mockReturnValue('customer-1');
    orderList.mockResolvedValue([makeOrder({ id: 'order-1' }), makeOrder({ id: 'order-2' })]);
    orderRemove.mockResolvedValue(undefined);

    render(<Admin />);

    await screen.findByText('Rolex Submariner');
    fireEvent.click(screen.getByRole('button', { name: 'Clear order history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, clear it' }));

    await screen.findByText(/cleared/i);
    expect(orderList).toHaveBeenCalledWith('customer-1');
    expect(orderRemove).toHaveBeenCalledWith('order-1');
    expect(orderRemove).toHaveBeenCalledWith('order-2');
  });

  it('shows an error and working Retry when clearing fails', async () => {
    getStoredCustomerIdMock.mockReturnValue('customer-1');
    orderList.mockRejectedValueOnce(new Error('order service down')).mockResolvedValueOnce([]);

    render(<Admin />);

    await screen.findByText('Rolex Submariner');
    fireEvent.click(screen.getByRole('button', { name: 'Clear order history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, clear it' }));

    await screen.findByText('order service down');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByText(/cleared/i);
    expect(screen.queryByText('order service down')).not.toBeInTheDocument();
  });

  it('clearing with no stored customer id completes immediately with no network calls', async () => {
    getStoredCustomerIdMock.mockReturnValue(null);

    render(<Admin />);

    await screen.findByText('Rolex Submariner');
    fireEvent.click(screen.getByRole('button', { name: 'Clear order history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, clear it' }));

    await screen.findByText(/cleared/i);
    expect(orderList).not.toHaveBeenCalled();
  });
});
