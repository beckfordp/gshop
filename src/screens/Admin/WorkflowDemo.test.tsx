import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WorkflowDemo from './WorkflowDemo';
import { createWorkflowDemoStore } from '../../services/workflowDemo';

function renderDemo() {
  return render(<WorkflowDemo store={createWorkflowDemoStore()} />);
}

function openOrdersTab() {
  fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));
}

function openOrder(orderId: string) {
  openOrdersTab();
  fireEvent.click(screen.getByRole('button', { name: orderId }));
}

describe('WorkflowDemo', () => {
  it('defaults to Customers and lists prototype orders after switching tabs', () => {
    renderDemo();

    expect(screen.getByRole('tab', { name: 'Customers' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Orders' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('table', { name: 'Prototype customers' })).toBeInTheDocument();

    openOrdersTab();

    const table = screen.getByRole('table', { name: 'Prototype orders' });
    expect(within(table).getByText('demo-order-1001')).toBeInTheDocument();
    expect(within(table).getAllByText('authorized').length).toBeGreaterThan(0);
    expect(within(table).getByText('dispatched')).toBeInTheDocument();
  });

  it('operator cancel updates the order, payment and reservation ledger', () => {
    renderDemo();
    openOrder('demo-order-1001');

    const ledger = screen.getByRole('table', {
      name: 'Reservations for demo-order-1001',
    });
    expect(within(ledger).getAllByText('active')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Operator cancel demo-order-1001' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Confirm operator cancellation for demo-order-1001',
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(/payment voided/i);
    expect(screen.getByText('voided')).toBeInTheDocument();
    expect(within(ledger).getAllByText('released')).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'Operator cancel demo-order-1001' }),
    ).not.toBeInTheDocument();
  });

  it('simulate authorization timeout uses the expiry email copy', () => {
    renderDemo();
    openOrder('demo-order-1002');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simulate authorization timeout for demo-order-1002',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Confirm auth_expired cancellation for demo-order-1002',
      }),
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Customers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grace Hopper' }));

    expect(screen.getByText('Your order was cancelled')).toBeInTheDocument();
    const emailItem = screen.getByText('Your order was cancelled').closest('li');
    expect(emailItem).not.toBeNull();
    fireEvent.click(within(emailItem as HTMLElement).getByRole('button', { name: 'Show email' }));

    expect(
      screen.getByText(/payment authorization expired/),
    ).toBeInTheDocument();
  });

  it('shows no cancellation actions for a dispatched order', () => {
    renderDemo();
    openOrder('demo-order-1003');

    expect(screen.getByText(/Past cancelling/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Operator cancel demo-order-1003' }),
    ).not.toBeInTheDocument();
  });

  it('customer detail lists their orders and emails, expandable per email', () => {
    renderDemo();
    fireEvent.click(screen.getByRole('tab', { name: 'Customers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ada Lovelace' }));

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          Boolean(element.textContent?.includes('customer id user-ada')),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Orders for Ada Lovelace' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Welcome to gshop')).toBeInTheDocument();

    const emailItem = screen.getByText('Welcome to gshop').closest('li');
    fireEvent.click(within(emailItem as HTMLElement).getByRole('button', { name: 'Show email' }));
    expect(screen.getByText('Your account is ready.')).toBeInTheDocument();
  });

  it('reset restores the seeded state after a cancellation', () => {
    renderDemo();
    openOrder('demo-order-1001');
    fireEvent.click(screen.getByRole('button', { name: 'Operator cancel demo-order-1001' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Confirm operator cancellation for demo-order-1001',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }));
    openOrder('demo-order-1001');

    expect(
      screen.getByRole('button', { name: 'Operator cancel demo-order-1001' }),
    ).toBeInTheDocument();
    const ledger = screen.getByRole('table', {
      name: 'Reservations for demo-order-1001',
    });
    expect(within(ledger).getAllByText('active')).toHaveLength(2);
  });
});
