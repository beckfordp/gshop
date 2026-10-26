import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Checkout from './Checkout';
import { checkoutGateway } from '../../services/checkoutGateway';
import { cartClient, type Cart } from '../../services/cartClient';
import { clearCartId, getStoredCartId } from '../../services/cartId';
import { getOrCreateCustomerId } from '../../services/customerId';
import type { NewOrderItem, Order } from '../../services/orderClient';

vi.mock('../../services/checkoutGateway', () => ({
  checkoutGateway: { submit: vi.fn() },
}));

vi.mock('../../services/cartClient', () => ({
  cartClient: { removeItem: vi.fn() },
}));

vi.mock('../../services/cartId', () => ({
  getStoredCartId: vi.fn(),
  clearCartId: vi.fn(),
}));

vi.mock('../../services/customerId', () => ({
  getOrCreateCustomerId: vi.fn(),
}));

const submit = vi.mocked(checkoutGateway.submit);
const removeItem = vi.mocked(cartClient.removeItem);
const getStoredCartIdMock = vi.mocked(getStoredCartId);
const clearCartIdMock = vi.mocked(clearCartId);
const getOrCreateCustomerIdMock = vi.mocked(getOrCreateCustomerId);

const items: NewOrderItem[] = [
  { sku: 'WID-1', productName: 'Widget', unitPriceCents: 1000, quantity: 2 },
  { sku: 'GAD-1', productName: 'Gadget', unitPriceCents: 500, quantity: 1 },
];

const shippingAddress = {
  line1: '1 Watchmaker Lane',
  city: 'London',
  postalCode: 'EC1A 1BB',
  country: 'GB',
};

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'customer-1',
    totalCents: 2500,
    status: 'authorized',
    items: items.map((item, index) => ({ ...item, id: `item-${index}` })),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    shippingAddress,
    reservationFailure: null,
    paymentFailure: null,
    ...overrides,
  };
}

function renderCheckout(props: Partial<ComponentProps<typeof Checkout>> = {}) {
  return render(
    <Checkout
      items={props.items ?? items}
      onOrderPlaced={props.onOrderPlaced ?? vi.fn()}
      onBackToCart={props.onBackToCart ?? vi.fn()}
    />,
  );
}

function fillForm() {
  fireEvent.change(screen.getByLabelText('Address line 1'), {
    target: { value: '1 Watchmaker Lane' },
  });
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'London' } });
  fireEvent.change(screen.getByLabelText('Postcode'), {
    target: { value: 'EC1A 1BB' },
  });
  fireEvent.change(screen.getByLabelText('Card number'), {
    target: { value: '4242 4242 4242 4242' },
  });
  fireEvent.change(screen.getByLabelText('Expiry date'), {
    target: { value: '12/30' },
  });
}

describe('Checkout', () => {
  beforeEach(() => {
    submit.mockReset();
    removeItem.mockReset();
    getStoredCartIdMock.mockReset();
    getStoredCartIdMock.mockReturnValue('cart-1');
    clearCartIdMock.mockReset();
    getOrCreateCustomerIdMock.mockReset();
    getOrCreateCustomerIdMock.mockReturnValue('customer-1');
    localStorage.clear();
  });

  it('renders shipping, billing (same as shipping by default), payment, and the order summary', () => {
    renderCheckout();

    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByText('Shipping address')).toBeInTheDocument();
    expect(screen.getByText('Billing address')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Billing address same as shipping' }),
    ).toBeChecked();
    expect(screen.getAllByLabelText('Address line 1')).toHaveLength(1);
    expect(screen.getByText(/Widget — qty 2/)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$25\.00/)).toBeInTheDocument();
  });

  it('shows and copies the shipping address into billing when unchecked', () => {
    renderCheckout();

    fireEvent.change(screen.getByLabelText('Address line 1'), {
      target: { value: '1 Watchmaker Lane' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Billing address same as shipping' }),
    );

    const line1Inputs = screen.getAllByLabelText('Address line 1');
    expect(line1Inputs).toHaveLength(2);
    expect(line1Inputs[1]).toHaveValue('1 Watchmaker Lane');
  });

  it('validates required fields and focuses the first invalid input', async () => {
    const onOrderPlaced = vi.fn();
    renderCheckout({ onOrderPlaced });

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(await screen.findByText('Enter the first line of the address')).toBeInTheDocument();
    expect(screen.getByText('Enter a card number')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText('Address line 1')).toHaveFocus());
  });

  it('submits the payment method and order with normalized values, then reports success', async () => {
    const onOrderPlaced = vi.fn();
    const order = makeOrder();
    submit.mockResolvedValue({ kind: 'authorized', order });

    renderCheckout({ onOrderPlaced });
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    await waitFor(() => expect(onOrderPlaced).toHaveBeenCalledWith(order));

    expect(submit).toHaveBeenCalledWith(
      {
        customerId: 'customer-1',
        items,
        shippingAddress,
        billingAddress: shippingAddress,
        card: { cardNumber: '4242424242424242', expiry: '12/30' },
      },
      { signal: expect.any(AbortSignal) },
    );
    expect(clearCartIdMock).toHaveBeenCalledOnce();
  });

  it('shows a decline reason, keeps the form values, and does not clear the cart', async () => {
    const onOrderPlaced = vi.fn();
    const order = makeOrder({
      status: 'payment_failed',
      paymentFailure: { reason: 'insufficient_funds' },
    });
    submit.mockResolvedValue({
      kind: 'payment_failed',
      order,
      reason: 'insufficient_funds',
    });

    renderCheckout({ onOrderPlaced });
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(
      await screen.findByText(/Payment declined: insufficient_funds/),
    ).toBeInTheDocument();
    expect(onOrderPlaced).not.toHaveBeenCalled();
    expect(clearCartIdMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Card number')).toHaveValue('4242 4242 4242 4242');
    expect(screen.getByLabelText('Address line 1')).toHaveValue('1 Watchmaker Lane');
  });

  it('removes a failed reservation line and allows a retry', async () => {
    const onOrderPlaced = vi.fn();
    submit
      .mockResolvedValueOnce({
        kind: 'reservation_failed',
        order: makeOrder({
          status: 'reservation_failed',
          reservationFailure: {
            sku: 'WID-1',
            reason: "insufficient stock for sku 'WID-1'",
          },
        }),
      })
      .mockResolvedValueOnce({ kind: 'authorized', order: makeOrder() });
    removeItem.mockResolvedValue({} as Cart);

    renderCheckout({ onOrderPlaced });
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(await screen.findByText(/Widget could not be reserved/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove from cart' }));

    await waitFor(() =>
      expect(removeItem).toHaveBeenCalledWith('cart-1', 'WID-1'),
    );
    expect(screen.queryByText(/Widget could not be reserved/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Widget — qty 2/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    await waitFor(() => expect(onOrderPlaced).toHaveBeenCalled());
    expect(submit).toHaveBeenCalledTimes(2);
    expect(submit.mock.calls[1][0].items).toEqual([items[1]]);
  });

  it('shows a request error and allows a retry', async () => {
    const onOrderPlaced = vi.fn();
    const order = makeOrder();
    submit
      .mockRejectedValueOnce(new Error('order service down'))
      .mockResolvedValueOnce({ kind: 'authorized', order });

    renderCheckout({ onOrderPlaced });
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(await screen.findByText('order service down')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    await waitFor(() => expect(onOrderPlaced).toHaveBeenCalledWith(order));
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('disables the form while submitting', async () => {
    submit.mockReturnValue(new Promise(() => {}));
    renderCheckout();
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));

    expect(
      await screen.findByRole('button', { name: 'Placing order...' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Address line 1')).toBeDisabled();
  });

  it('calls onBackToCart without submitting', () => {
    const onBackToCart = vi.fn();
    renderCheckout({ onBackToCart });

    fireEvent.click(screen.getByRole('button', { name: 'Back to Cart' }));

    expect(onBackToCart).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
  });

  it('does not persist card details', async () => {
    submit.mockResolvedValue({
      kind: 'payment_failed',
      order: makeOrder({ status: 'payment_failed' }),
      reason: 'declined',
    });
    renderCheckout();
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
    await screen.findByText(/Payment declined/);

    expect(JSON.stringify(localStorage)).not.toContain('4242');
  });
});
