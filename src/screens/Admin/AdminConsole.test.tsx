// SPDX-License-Identifier: MIT

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminConsole from './AdminConsole';
import {
  adminClient,
  type SentEmail,
  type ServiceReconciliation,
} from '../../services/adminClient';
import { fulfilmentClient } from '../../services/fulfilmentClient';
import type { Order } from '../../services/orderClient';

vi.mock('../../services/adminClient', () => ({
  adminClient: {
    listOrders: vi.fn(),
    reservations: vi.fn(),
    allReconciliations: vi.fn(),
    resolveReconciliation: vi.fn(),
    operatorCancel: vi.fn(),
    expireAuthorization: vi.fn(),
    emails: vi.fn(),
    user: vi.fn(),
  },
}));

vi.mock('../../services/fulfilmentClient', () => ({
  fulfilmentClient: { listTasks: vi.fn() },
}));

const client = vi.mocked(adminClient);
const listTasks = vi.mocked(fulfilmentClient.listTasks);

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'customer-ada',
    totalCents: 950000,
    status: 'authorized',
    items: [
      {
        id: 'item-1',
        sku: 'watch-rolex-submariner',
        productName: 'Rolex Submariner',
        unitPriceCents: 950000,
        quantity: 1,
      },
    ],
    createdAt: '2026-11-02T09:00:00Z',
    updatedAt: '2026-11-02T09:00:00Z',
    shippingAddress: null,
    ...overrides,
  };
}

const openFlag: ServiceReconciliation = {
  service: 'payment',
  orderId: 'order-2',
  reason: 'capture_after_void',
  status: 'open',
  createdAt: '2026-11-02T10:00:00Z',
  operatorId: null,
  note: null,
  resolvedAt: null,
};

const email: SentEmail = {
  id: 'email-1',
  sourceEventId: 'event-1',
  eventType: 'OrderCancelled',
  reason: 'operator',
  recipientType: 'customer',
  recipientKey: 'customer-ada',
  recipientEmail: 'ada@example.com',
  customerId: 'customer-ada',
  orderId: 'order-1',
  subject: 'Your order was cancelled',
  body: 'Order order-1 was cancelled by our support team.',
  status: 'sent',
  createdAt: '2026-11-02T09:05:00Z',
  sentAt: '2026-11-02T09:05:01Z',
  failedAt: null,
  error: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  client.listOrders.mockResolvedValue([
    order(),
    order({ id: 'order-2', customerId: 'guest-123456789', status: 'confirmed' }),
  ]);
  client.user.mockImplementation(async (id) =>
    id === 'customer-ada'
      ? { userId: id, email: 'ada@example.com', createdAt: '2026-10-01T00:00:00Z' }
      : null,
  );
  client.allReconciliations.mockResolvedValue({ rows: [openFlag], failures: [] });
  client.reservations.mockResolvedValue([
    {
      orderId: 'order-1',
      orderItemId: 'item-1',
      lineNo: 1,
      sku: 'watch-rolex-submariner',
      quantity: 1,
      status: 'active',
      reservedAt: '2026-11-02T09:00:00Z',
      releasedAt: null,
    },
  ]);
  client.emails.mockResolvedValue([email]);
  listTasks.mockResolvedValue([]);
});

function renderConsole() {
  render(<AdminConsole />);
  fireEvent.click(screen.getByRole('button', { name: 'Show operations' }));
}

async function renderOrdersTab() {
  renderConsole();
  await screen.findByRole('table', { name: 'Customers' });
  fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));
  return screen.findByRole('table', { name: 'Orders' });
}

async function openOrder(orderId: string) {
  const table = await renderOrdersTab();
  fireEvent.click(within(table).getByRole('button', { name: orderId }));
}

describe('AdminConsole', () => {
  it('starts collapsed and toggles open and closed', async () => {
    render(<AdminConsole />);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show operations' }));
    expect(await screen.findByRole('table', { name: 'Customers' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide operations' }));
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
  });

  it('opens on the Customers tab', async () => {
    renderConsole();

    expect(await screen.findByRole('table', { name: 'Customers' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Customers' })).toHaveAttribute('aria-selected', 'true');
  });

  it('lists real orders with customer emails, guests and the open reconciliation queue', async () => {
    const table = await renderOrdersTab();
    expect(within(table).getByText('order-1')).toBeInTheDocument();
    expect(await within(table).findByText('ada@example.com')).toBeInTheDocument();
    expect(await within(table).findByText('Guest guest-12')).toBeInTheDocument();

    const queue = await screen.findByRole('table', { name: 'Reconciliation flags' });
    expect(within(queue).getByText('capture after void')).toBeInTheDocument();
    expect(client.allReconciliations).toHaveBeenCalledWith({ status: 'open' });
  });

  it('resolves a queued flag with the operator note', async () => {
    client.resolveReconciliation.mockResolvedValue({ ...openFlag, status: 'resolved' });
    await renderOrdersTab();

    fireEvent.change(await screen.findByLabelText('Note for payment order-2'), {
      target: { value: 'Refunded manually' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve payment flag for order-2' }));

    await waitFor(() =>
      expect(client.resolveReconciliation).toHaveBeenCalledWith(
        'payment',
        'order-2',
        'Refunded manually',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Resolved payment flag for order-2.',
    );
  });

  it('shows the order’s ledger, fulfilment state and emails', async () => {
    listTasks.mockResolvedValue([
      {
        orderId: 'order-1',
        state: 'PICKING',
        items: [],
        shippingAddress: { line1: 'x', line2: null, city: 'y', postalCode: 'z', country: 'GB' },
        trackingNo: null,
        carrier: null,
        failureReason: null,
        createdAt: '2026-11-02T09:00:00Z',
        updatedAt: '2026-11-02T09:00:00Z',
      },
    ]);
    await openOrder('order-1');

    const ledger = await screen.findByRole('table', { name: 'Reservations for order-1' });
    expect(within(ledger).getByText('Rolex Submariner')).toBeInTheDocument();
    expect(within(ledger).getByText('active')).toBeInTheDocument();
    expect(await screen.findByText('PICKING')).toBeInTheDocument();
    expect(screen.getByText('Your order was cancelled')).toBeInTheDocument();
    expect(client.emails).toHaveBeenCalledWith({ orderId: 'order-1' });
  });

  it('operator-cancels an authorized order after confirmation, then re-reads', async () => {
    client.operatorCancel.mockResolvedValue(order({ status: 'cancelled' }));
    await openOrder('order-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Operator cancel order-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm operator cancel for order-1' }));

    await waitFor(() => expect(client.operatorCancel).toHaveBeenCalledWith('order-1'));
    expect(await screen.findByRole('status')).toHaveTextContent(/cancelled by operator/i);
    await waitFor(() => expect(client.listOrders).toHaveBeenCalledTimes(2));
  });

  it('expires the authorization through payment-service', async () => {
    client.expireAuthorization.mockResolvedValue({
      id: 'p-1',
      orderId: 'order-1',
      status: 'voided',
    });
    await openOrder('order-1');

    fireEvent.click(
      await screen.findByRole('button', { name: 'Expire authorization for order-1' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm authorization expiry for order-1' }),
    );

    await waitFor(() => expect(client.expireAuthorization).toHaveBeenCalledWith('order-1'));
    expect(await screen.findByRole('status')).toHaveTextContent(/payment voided/i);
  });

  it('surfaces a refused cancel', async () => {
    client.operatorCancel.mockRejectedValue(new Error('Order is dispatched'));
    await openOrder('order-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Operator cancel order-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm operator cancel for order-1' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Order is dispatched');
  });

  it('offers no actions for an order past cancelling', async () => {
    await openOrder('order-2');

    expect(await screen.findByText(/returns\/refunds are out of scope/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Operator cancel/ })).not.toBeInTheDocument();
  });

  it('shows a customer’s orders and email history', async () => {
    renderConsole();

    const customers = await screen.findByRole('table', { name: 'Customers' });
    fireEvent.click(await within(customers).findByRole('button', { name: 'ada@example.com' }));

    expect(
      await screen.findByRole('table', { name: 'Orders for ada@example.com' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(client.emails).toHaveBeenCalledWith({ customerId: 'customer-ada' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Show email' }));
    expect(screen.getByText(/cancelled by our support team/)).toBeInTheDocument();
    expect(screen.getByText(/to ada@example.com \(customer\)/)).toBeInTheDocument();
  });

  it('labels a guest customer', async () => {
    renderConsole();

    const customers = await screen.findByRole('table', { name: 'Customers' });
    fireEvent.click(await within(customers).findByRole('button', { name: 'Guest guest-12' }));

    expect(await screen.findByText(/Guest checkout — no user-service account/)).toBeInTheDocument();
  });

  it('labels a guest by the email captured at checkout (ADM-10)', async () => {
    client.listOrders.mockResolvedValue([
      order({ customerId: 'guest-123456789', guestEmail: 'guest@example.com' }),
    ]);
    const table = await renderOrdersTab();
    expect(await within(table).findByText('Guest guest@example.com')).toBeInTheDocument();
  });

  it('shows a retryable error when the order list fails', async () => {
    client.listOrders.mockRejectedValueOnce(new Error('Order service URL is not configured'));
    renderConsole();

    expect(await screen.findByRole('alert')).toHaveTextContent('not configured');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table', { name: 'Customers' })).toBeInTheDocument();
  });
});
