import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Cart from './Cart';
import { cartClient, type Cart as CartData } from '../../services/cartClient';
import { catalogClient, type CatalogItem } from '../../services/catalogClient';
import { getStoredCartId } from '../../services/cartId';

vi.mock('../../services/cartClient', () => ({
  cartClient: { get: vi.fn(), addItem: vi.fn(), removeItem: vi.fn() },
}));

vi.mock('../../services/catalogClient', () => ({
  catalogClient: { list: vi.fn() },
}));

vi.mock('../../services/cartId', () => ({
  getStoredCartId: vi.fn(),
}));

const get = vi.mocked(cartClient.get);
const addItem = vi.mocked(cartClient.addItem);
const removeItem = vi.mocked(cartClient.removeItem);
const list = vi.mocked(catalogClient.list);
const getStoredCartIdMock = vi.mocked(getStoredCartId);

function makeCart(overrides: Partial<CartData> = {}): CartData {
  return {
    id: 'cart-1',
    items: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCatalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: 'catalog-1',
    name: 'Widget',
    description: 'A widget',
    priceCents: 1000,
    sku: 'WID-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Cart', () => {
  beforeEach(() => {
    get.mockReset();
    addItem.mockReset();
    removeItem.mockReset();
    list.mockReset();
    getStoredCartIdMock.mockReset();
  });

  it('shows an empty-cart message when no cart id is stored, with no API calls', async () => {
    getStoredCartIdMock.mockReturnValue(null);

    render(<Cart />);

    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it('shows a loading state while fetching', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockReturnValue(new Promise(() => {}));
    list.mockReturnValue(new Promise(() => {}));

    render(<Cart />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders cart lines joined against the catalog, with quantity, line price, and total', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockResolvedValue(makeCart({ items: { 'WID-1': 2 } }));
    list.mockResolvedValue({
      items: [makeCatalogItem({ sku: 'WID-1', name: 'Widget', priceCents: 1000 })],
      total: 1,
    });

    render(<Cart />);

    const line = await screen.findByText(/Widget/);
    expect(line.textContent).toContain('qty 2');
    expect(line.textContent).toContain('$20.00');
    expect(screen.getByText(/Total: \$20\.00/)).toBeInTheDocument();
  });

  it('falls back to the sku when the item is not found in the catalog', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockResolvedValue(makeCart({ items: { 'GONE-1': 1 } }));
    list.mockResolvedValue({ items: [], total: 0 });

    render(<Cart />);

    expect(await screen.findByText(/GONE-1/)).toBeInTheDocument();
  });

  it('"+1" calls cartClient.addItem and refreshes the cart', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get
      .mockResolvedValueOnce(makeCart({ items: { 'WID-1': 1 } }))
      .mockResolvedValueOnce(makeCart({ items: { 'WID-1': 2 } }));
    list.mockResolvedValue({
      items: [makeCatalogItem({ sku: 'WID-1', priceCents: 1000 })],
      total: 1,
    });
    addItem.mockResolvedValue(makeCart({ items: { 'WID-1': 2 } }));

    render(<Cart />);

    await screen.findByText(/qty 1/);
    fireEvent.click(screen.getByRole('button', { name: '+1' }));

    await screen.findByText(/qty 2/);
    expect(addItem).toHaveBeenCalledWith('cart-1', 'WID-1', 1);
  });

  it('"Remove" calls cartClient.removeItem and refreshes the cart', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get
      .mockResolvedValueOnce(makeCart({ items: { 'WID-1': 1 } }))
      .mockResolvedValueOnce(makeCart({ items: {} }));
    list.mockResolvedValue({
      items: [makeCatalogItem({ sku: 'WID-1', priceCents: 1000 })],
      total: 1,
    });
    removeItem.mockResolvedValue(makeCart({ items: {} }));

    render(<Cart />);

    await screen.findByText(/Widget/);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(screen.getByText('Your cart is empty.')).toBeInTheDocument());
    expect(removeItem).toHaveBeenCalledWith('cart-1', 'WID-1');
  });

  it('shows an error and working Retry when the initial fetch fails', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get
      .mockRejectedValueOnce(new Error('cart service down'))
      .mockResolvedValueOnce(makeCart({ items: { 'WID-1': 1 } }));
    list.mockResolvedValue({
      items: [makeCatalogItem({ sku: 'WID-1', priceCents: 1000 })],
      total: 1,
    });

    render(<Cart />);

    await screen.findByText('cart service down');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByText(/Widget/);
    expect(screen.queryByText('cart service down')).not.toBeInTheDocument();
  });

  it('shows an inline error on the line when "+1" fails', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockResolvedValue(makeCart({ items: { 'WID-1': 1 } }));
    list.mockResolvedValue({
      items: [makeCatalogItem({ sku: 'WID-1', priceCents: 1000 })],
      total: 1,
    });
    addItem.mockRejectedValue(new Error('add failed'));

    render(<Cart />);

    await screen.findByText(/Widget/);
    fireEvent.click(screen.getByRole('button', { name: '+1' }));

    expect(await screen.findByText('add failed')).toBeInTheDocument();
  });
});
