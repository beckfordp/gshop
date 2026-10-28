import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Fulfilment from './Fulfilment';

function card(orderId: string): HTMLElement {
  const node = screen.getByText(orderId).closest('li');
  if (!node) {
    throw new Error(`No card for ${orderId}`);
  }
  return node;
}

describe('Fulfilment', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders one card per state with its badge', () => {
    render(<Fulfilment onBackToAdmin={vi.fn()} />);

    expect(within(card('FUL-1001')).getByText('Pending')).toBeInTheDocument();
    expect(within(card('FUL-1002')).getByText('Picking')).toBeInTheDocument();
    expect(within(card('FUL-1003')).getByText('Packed')).toBeInTheDocument();
    expect(within(card('FUL-1004')).getByText('Dispatched')).toBeInTheDocument();
    expect(
      within(card('FUL-1005')).getByText('Dispatch failed'),
    ).toBeInTheDocument();
  });

  it('drives a PENDING order through picking, packing and dispatch', () => {
    render(<Fulfilment onBackToAdmin={vi.fn()} />);

    fireEvent.click(within(card('FUL-1001')).getByText('Start picking'));
    expect(within(card('FUL-1001')).getByText('Picking')).toBeInTheDocument();

    fireEvent.click(within(card('FUL-1001')).getByText('Mark packed'));
    fireEvent.click(within(card('FUL-1001')).getByText('Dispatch'));

    fireEvent.change(within(card('FUL-1001')).getByLabelText('Tracking number'), {
      target: { value: 'GLN-42' },
    });
    fireEvent.change(within(card('FUL-1001')).getByLabelText('Carrier'), {
      target: { value: 'DHL Express' },
    });
    fireEvent.click(
      within(card('FUL-1001')).getByText('Confirm dispatch'),
    );

    expect(within(card('FUL-1001')).getByText('Dispatched')).toBeInTheDocument();
    expect(
      within(card('FUL-1001')).getByText(
        'Shipped via DHL Express — tracking GLN-42',
      ),
    ).toBeInTheDocument();
  });

  it('requires tracking number and carrier before dispatching', () => {
    render(<Fulfilment onBackToAdmin={vi.fn()} />);

    fireEvent.click(within(card('FUL-1003')).getByText('Dispatch'));
    fireEvent.click(
      within(card('FUL-1003')).getByText('Confirm dispatch'),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tracking number and carrier are required to dispatch',
    );
    expect(within(card('FUL-1003')).getByText('Packed')).toBeInTheDocument();
  });

  it('reports a problem with a required reason', () => {
    render(<Fulfilment onBackToAdmin={vi.fn()} />);

    fireEvent.click(within(card('FUL-1002')).getByText('Report problem'));
    fireEvent.click(
      within(card('FUL-1002')).getByText('Confirm failure'),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('A reason is required');

    fireEvent.change(
      within(card('FUL-1002')).getByLabelText('What went wrong?'),
      { target: { value: 'Box crushed' } },
    );
    fireEvent.click(within(card('FUL-1002')).getByText('Confirm failure'));

    expect(
      within(card('FUL-1002')).getByText('Dispatch failed'),
    ).toBeInTheDocument();
    expect(
      within(card('FUL-1002')).getByText('Not dispatched: Box crushed'),
    ).toBeInTheDocument();
  });

  it('shows no actions for terminal orders', () => {
    render(<Fulfilment onBackToAdmin={vi.fn()} />);

    expect(
      within(card('FUL-1004')).queryByText('Report problem'),
    ).not.toBeInTheDocument();
    expect(
      within(card('FUL-1005')).queryByText('Report problem'),
    ).not.toBeInTheDocument();
  });

  it('reset restores the seeded queue', () => {
    render(<Fulfilment onBackToAdmin={vi.fn()} />);

    fireEvent.click(within(card('FUL-1001')).getByText('Start picking'));
    fireEvent.click(screen.getByText('Reset demo queue'));

    expect(within(card('FUL-1001')).getByText('Pending')).toBeInTheDocument();
  });

  it('goes back to Admin', () => {
    const onBackToAdmin = vi.fn();
    render(<Fulfilment onBackToAdmin={onBackToAdmin} />);

    fireEvent.click(screen.getByText('Back to Admin'));

    expect(onBackToAdmin).toHaveBeenCalledOnce();
  });
});
