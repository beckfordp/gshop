import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Cart from './Cart';
import { cartClient, type Cart as CartData } from '../../services/cartClient';
import { catalogClient, type CatalogItem } from '../../services/catalogClient';
import { getStoredCartId, clearCartId } from '../../services/cartId';
import { getOrCreateCustomerId } from '../../services/customerId';
import { orderClient, type Order } from '../../services/orderClient';

vi.mock('../../services/cartClient', () => ({
  cartClient: { get: vi.fn(), addItem: vi.fn(), removeItem: vi.fn() },
}));

vi.mock('../../services/catalogClient', () => ({
  catalogClient: { list: vi.fn() },
}));

vi.mock('../../services/cartId', () => ({
  getStoredCartId: vi.fn(),
  clearCartId: vi.fn(),
}));

vi.mock('../../services/customerId', () => ({
  getOrCreateCustomerId: vi.fn(),
}));

vi.mock('../../services/orderClient', () => ({
  orderClient: { create: vi.fn() },
}));

const get = vi.mocked(cartClient.get);
const addItem = vi.mocked(cartClient.addItem);
const removeItem = vi.mocked(cartClient.removeItem);
const list = vi.mocked(catalogClient.list);
const getStoredCartIdMock = vi.mocked(getStoredCartId);
const clearCartIdMock = vi.mocked(clearCartId);
const getOrCreateCustomerIdMock = vi.mocked(getOrCreateCustomerId);
const createOrder = vi.mocked(orderClient.create);

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'cart-1',
    totalCents: 2000,
    status: 'pending',
    items: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    reservationFailure: null,
    ...overrides,
  };
}

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
  const onCheckoutSuccess = vi.fn();

  function renderCart() {
    return render(<Cart onCheckoutSuccess={onCheckoutSuccess} />);
  }

  beforeEach(() => {
    get.mockReset();
    addItem.mockReset();
    removeItem.mockReset();
    list.mockReset();
    getStoredCartIdMock.mockReset();
    clearCartIdMock.mockReset();
    getOrCreateCustomerIdMock.mockReset();
    getOrCreateCustomerIdMock.mockReturnValue('customer-1');
    createOrder.mockReset();
    onCheckoutSuccess.mockReset();
  });

  it('shows an empty-cart message when no cart id is stored, with no API calls', async () => {
    getStoredCartIdMock.mockReturnValue(null);

    renderCart();

    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it('shows a loading state while fetching', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockReturnValue(new Promise(() => {}));
    list.mockReturnValue(new Promise(() => {}));

    renderCart();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders cart lines joined against the catalog, with quantity, line price, and total', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockResolvedValue(makeCart({ items: { 'WID-1': 2 } }));
    list.mockResolvedValue({
      items: [makeCatalogItem({ sku: 'WID-1', name: 'Widget', priceCents: 1000 })],
      total: 1,
    });

    renderCart();

    const line = await screen.findByText(/Widget/);
    expect(line.textContent).toContain('qty 2');
    expect(line.textContent).toContain('$20.00');
    expect(screen.getByText(/Total: \$20\.00/)).toBeInTheDocument();
  });

  it('falls back to the sku when the item is not found in the catalog', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockResolvedValue(makeCart({ items: { 'GONE-1': 1 } }));
    list.mockResolvedValue({ items: [], total: 0 });

    renderCart();

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

    renderCart();

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

    renderCart();

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

    renderCart();

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

    renderCart();

    await screen.findByText(/Widget/);
    fireEvent.click(screen.getByRole('button', { name: '+1' }));

    expect(await screen.findByText('add failed')).toBeInTheDocument();
  });

  it('blocks checkout and shows an error when a line has no resolved price', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockResolvedValue(makeCart({ items: { 'GONE-1': 1 } }));
    list.mockResolvedValue({ items: [], total: 0 });

    renderCart();

    await screen.findByText(/GONE-1/);
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));

    expect(
      await screen.findByText('Remove unavailable items before checking out.'),
    ).toBeInTheDocument();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('shows a waiting state while checkout is in flight', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockResolvedValue(makeCart({ items: { 'WID-1': 1 } }));
    list.mockResolvedValue({
      items: [makeCatalogItem({ sku: 'WID-1', priceCents: 1000 })],
      total: 1,
    });
    createOrder.mockReturnValue(new Promise(() => {}));

    renderCart();

    await screen.findByText(/Widget/);
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));

    expect(await screen.findByRole('button', { name: 'Placing order...' })).toBeDisabled();
  });

  it('on success, calls onCheckoutSuccess with the order and clears the cart id', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockResolvedValue(makeCart({ items: { 'WID-1': 1 } }));
    list.mockResolvedValue({
      items: [makeCatalogItem({ sku: 'WID-1', name: 'Widget', priceCents: 1000 })],
      total: 1,
    });
    const order = makeOrder({ status: 'pending' });
    createOrder.mockResolvedValue(order);

    renderCart();

    await screen.findByText(/Widget/);
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));

    await waitFor(() => expect(onCheckoutSuccess).toHaveBeenCalledWith(order));
    expect(createOrder).toHaveBeenCalledWith({
      customerId: 'customer-1',
      items: [{ sku: 'WID-1', productName: 'Widget', unitPriceCents: 1000, quantity: 1 }],
    });
    expect(clearCartIdMock).toHaveBeenCalledOnce();
  });

  it('on reservation_failed, shows an inline error, stays on Cart, and Retry resubmits', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockResolvedValue(makeCart({ items: { 'WID-1': 1 } }));
    list.mockResolvedValue({
      items: [makeCatalogItem({ sku: 'WID-1', priceCents: 1000 })],
      total: 1,
    });
    createOrder
      .mockResolvedValueOnce(
        makeOrder({
          status: 'reservation_failed',
          reservationFailure: { sku: 'WID-1', reason: "insufficient stock for sku 'WID-1'" },
        }),
      )
      .mockResolvedValueOnce(makeOrder({ status: 'pending' }));

    renderCart();

    await screen.findByText(/Widget/);
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));

    await screen.findByText('Widget is out of stock.');
    expect(onCheckoutSuccess).not.toHaveBeenCalled();
    expect(clearCartIdMock).not.toHaveBeenCalled();
    expect(screen.getByText(/qty 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(onCheckoutSuccess).toHaveBeenCalled());
    expect(createOrder).toHaveBeenCalledTimes(2);
  });

  it('on a request error, shows an inline error and working Retry', async () => {
    getStoredCartIdMock.mockReturnValue('cart-1');
    get.mockResolvedValue(makeCart({ items: { 'WID-1': 1 } }));
    list.mockResolvedValue({
      items: [makeCatalogItem({ sku: 'WID-1', priceCents: 1000 })],
      total: 1,
    });
    createOrder
      .mockRejectedValueOnce(new Error('order service down'))
      .mockResolvedValueOnce(makeOrder({ status: 'pending' }));

    renderCart();

    await screen.findByText(/Widget/);
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));

    await screen.findByText('order service down');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(onCheckoutSuccess).toHaveBeenCalled());
  });
});
