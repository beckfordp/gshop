import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fulfilment from './Fulfilment';
import type { FulfilmentState, FulfilmentTask } from '../../services/fulfilmentClient';

const { clientMock } = vi.hoisted(() => ({
  clientMock: {
    listTasks: vi.fn(),
    startPicking: vi.fn(),
    pack: vi.fn(),
    dispatch: vi.fn(),
    fail: vi.fn(),
  },
}));

vi.mock('../../services/fulfilmentClient', () => ({
  fulfilmentClient: clientMock,
}));

const address = {
  line1: '122 Wilmot Street',
  line2: null,
  city: 'London',
  postalCode: 'E2 0BU',
  country: 'GB',
};

function task(orderId: string, state: FulfilmentState): FulfilmentTask {
  return {
    orderId,
    state,
    items: [
      {
        sku: 'watch-mido-commander',
        productName: 'Mido Commander',
        quantity: 2,
        unitPriceCents: 4500,
      },
    ],
    shippingAddress: address,
    trackingNo: state === 'DISPATCHED' ? 'GLN-42' : null,
    carrier: state === 'DISPATCHED' ? 'DHL Express' : null,
    failureReason: state === 'DISPATCH_FAILED' ? 'Box crushed' : null,
    createdAt: '2026-10-28T14:33:17Z',
    updatedAt: '2026-10-28T14:33:17Z',
  };
}

const queue: FulfilmentTask[] = [
  task('order-1', 'PENDING'),
  task('order-2', 'PICKING'),
  task('order-3', 'PACKED'),
  task('order-4', 'DISPATCHED'),
  task('order-5', 'DISPATCH_FAILED'),
];

function card(orderId: string): HTMLElement {
  const node = screen.getByText(orderId).closest('li');
  if (!node) {
    throw new Error(`No card for ${orderId}`);
  }
  return node;
}

describe('Fulfilment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMock.listTasks.mockResolvedValue(queue);
  });

  it('renders one card per state with its badge and ship-to address', async () => {
    render(<Fulfilment onBackToAdmin={vi.fn()} />);

    expect(await screen.findByText('order-1')).toBeInTheDocument();
    expect(within(card('order-1')).getByText('Pending')).toBeInTheDocument();
    expect(within(card('order-2')).getByText('Picking')).toBeInTheDocument();
    expect(within(card('order-3')).getByText('Packed')).toBeInTheDocument();
    expect(within(card('order-4')).getByText('Dispatched')).toBeInTheDocument();
    expect(within(card('order-5')).getByText('Dispatch failed')).toBeInTheDocument();
    expect(
      within(card('order-1')).getByText(/122 Wilmot Street/),
    ).toBeInTheDocument();
    expect(within(card('order-1')).getByText(/Total: \$90/)).toBeInTheDocument();
  });

  it('drives a PENDING order through picking, packing and dispatch', async () => {
    clientMock.startPicking.mockResolvedValue(task('order-1', 'PICKING'));
    clientMock.pack.mockResolvedValue(task('order-1', 'PACKED'));
    clientMock.dispatch.mockResolvedValue(task('order-1', 'DISPATCHED'));

    render(<Fulfilment onBackToAdmin={vi.fn()} />);
    await screen.findByText('order-1');

    fireEvent.click(within(card('order-1')).getByText('Start picking'));
    expect(await within(card('order-1')).findByText('Picking')).toBeInTheDocument();
    expect(clientMock.startPicking).toHaveBeenCalledWith('order-1');

    fireEvent.click(within(card('order-1')).getByText('Mark packed'));
    expect(await within(card('order-1')).findByText('Packed')).toBeInTheDocument();

    fireEvent.click(within(card('order-1')).getByText('Dispatch'));
    const tracking = within(card('order-1')).getByLabelText(
      'Tracking number',
    ) as HTMLInputElement;
    const carrier = within(card('order-1')).getByLabelText(
      'Carrier',
    ) as HTMLSelectElement;
    expect(carrier.value).toBe('DHL');
    expect(tracking.value).toMatch(/^\d{10}$/);

    fireEvent.change(carrier, { target: { value: 'UPS' } });
    expect(tracking.value).toMatch(/^1Z[0-9A-Z]{16}$/);
    const upsTracking = tracking.value;
    clientMock.dispatch.mockResolvedValue({
      ...task('order-1', 'DISPATCHED'),
      trackingNo: upsTracking,
      carrier: 'UPS',
    });

    fireEvent.click(within(card('order-1')).getByText('Confirm dispatch'));

    expect(await within(card('order-1')).findByText('Dispatched')).toBeInTheDocument();
    expect(clientMock.dispatch).toHaveBeenCalledWith('order-1', upsTracking, 'UPS');
    expect(
      within(card('order-1')).getByText(`Shipped via UPS — tracking ${upsTracking}`),
    ).toBeInTheDocument();
  });

  it('requires tracking number and carrier before dispatching', async () => {
    render(<Fulfilment onBackToAdmin={vi.fn()} />);
    await screen.findByText('order-3');

    fireEvent.click(within(card('order-3')).getByText('Dispatch'));
    fireEvent.change(
      within(card('order-3')).getByLabelText('Tracking number'),
      { target: { value: '' } },
    );
    fireEvent.click(within(card('order-3')).getByText('Confirm dispatch'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tracking number and carrier are required to dispatch',
    );
    expect(clientMock.dispatch).not.toHaveBeenCalled();
    expect(within(card('order-3')).getByText('Packed')).toBeInTheDocument();
  });

  it('reports a problem with a required reason', async () => {
    clientMock.fail.mockResolvedValue(task('order-2', 'DISPATCH_FAILED'));

    render(<Fulfilment onBackToAdmin={vi.fn()} />);
    await screen.findByText('order-2');

    fireEvent.click(within(card('order-2')).getByText('Report problem'));
    fireEvent.click(within(card('order-2')).getByText('Confirm failure'));
    expect(screen.getByRole('alert')).toHaveTextContent('A reason is required');
    expect(clientMock.fail).not.toHaveBeenCalled();

    fireEvent.change(within(card('order-2')).getByLabelText('What went wrong?'), {
      target: { value: 'Box crushed' },
    });
    fireEvent.click(within(card('order-2')).getByText('Confirm failure'));

    expect(
      await within(card('order-2')).findByText('Dispatch failed'),
    ).toBeInTheDocument();
    expect(clientMock.fail).toHaveBeenCalledWith('order-2', 'Box crushed');
  });

  it('surfaces server errors in the alert banner', async () => {
    clientMock.startPicking.mockRejectedValue(
      new Error('Cannot start picking a PACKED task'),
    );

    render(<Fulfilment onBackToAdmin={vi.fn()} />);
    await screen.findByText('order-1');

    fireEvent.click(within(card('order-1')).getByText('Start picking'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot start picking a PACKED task',
    );
    expect(within(card('order-1')).getByText('Pending')).toBeInTheDocument();
  });

  it('refreshes the queue', async () => {
    render(<Fulfilment onBackToAdmin={vi.fn()} />);
    await screen.findByText('order-1');
    expect(clientMock.listTasks).toHaveBeenCalledTimes(1);

    clientMock.listTasks.mockResolvedValue([task('order-9', 'PENDING')]);
    fireEvent.click(screen.getByText('Refresh'));

    expect(await screen.findByText('order-9')).toBeInTheDocument();
    expect(screen.queryByText('order-1')).not.toBeInTheDocument();
    expect(clientMock.listTasks).toHaveBeenCalledTimes(2);
  });

  it('shows an empty state when there are no tasks', async () => {
    clientMock.listTasks.mockResolvedValue([]);

    render(<Fulfilment onBackToAdmin={vi.fn()} />);

    expect(
      await screen.findByText(/No fulfilment tasks yet/),
    ).toBeInTheDocument();
  });

  it('shows no actions for terminal orders', async () => {
    render(<Fulfilment onBackToAdmin={vi.fn()} />);
    await screen.findByText('order-4');

    expect(
      within(card('order-4')).queryByText('Report problem'),
    ).not.toBeInTheDocument();
    expect(
      within(card('order-5')).queryByText('Report problem'),
    ).not.toBeInTheDocument();
  });

  it('shows the server error when the queue cannot be loaded', async () => {
    clientMock.listTasks.mockRejectedValue(
      new Error('Failed to reach fulfilment service: fetch failed'),
    );

    render(<Fulfilment onBackToAdmin={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to reach fulfilment service: fetch failed',
      ),
    );
  });

  it('goes back to Admin', async () => {
    const onBackToAdmin = vi.fn();
    render(<Fulfilment onBackToAdmin={onBackToAdmin} />);
    await screen.findByText('order-1');

    fireEvent.click(screen.getByText('Back to Admin'));

    expect(onBackToAdmin).toHaveBeenCalledOnce();
  });
});
