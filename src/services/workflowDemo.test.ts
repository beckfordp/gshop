import { describe, expect, it } from 'vitest';
import {
  createWorkflowDemoStore,
  emailsForCustomer,
  reservationsForOrder,
  userById,
} from './workflowDemo';

describe('workflowDemo store', () => {
  it('seeds deterministic orders, reservations and emails', () => {
    const store = createWorkflowDemoStore();
    const snapshot = store.snapshot();

    expect(snapshot.users.map((user) => user.name)).toEqual([
      'Ada Lovelace',
      'Grace Hopper',
      'Alan Turing',
    ]);
    expect(snapshot.orders).toHaveLength(5);
    expect(snapshot.reservations).toHaveLength(6);
    expect(snapshot.emails).toHaveLength(6);
    expect(snapshot.orders.filter((order) => order.status === 'authorized')).toHaveLength(2);
  });

  it('operator cancel voids payment, cancels fulfilment, releases ledger rows and emails the customer', () => {
    const store = createWorkflowDemoStore();
    const result = store.cancel('demo-order-1001', 'operator');
    const snapshot = store.snapshot();
    const order = snapshot.orders.find((entry) => entry.id === 'demo-order-1001');

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/payment voided/i);
    expect(order?.status).toBe('cancelled');
    expect(order?.paymentStatus).toBe('voided');
    expect(order?.fulfilmentState).toBe('CANCELLED');
    expect(order?.authExpiresAt).toBeNull();

    const ledger = reservationsForOrder(snapshot, 'demo-order-1001');
    expect(ledger.map((line) => line.status)).toEqual(['released', 'released']);
    expect(ledger.every((line) => line.releasedAt !== null)).toBe(true);

    const email = snapshot.emails[0];
    expect(email.eventType).toBe('OrderCancelled');
    expect(email.reason).toBe('operator');
    expect(email.to).toBe('user-ada');
    expect(email.body).toContain('support team');
  });

  it('simulated authorization timeout uses the expiry copy', () => {
    const store = createWorkflowDemoStore();
    const result = store.cancel('demo-order-1002', 'auth_expired');
    const snapshot = store.snapshot();
    const email = snapshot.emails[0];

    expect(result.ok).toBe(true);
    expect(email.reason).toBe('auth_expired');
    expect(email.body).toContain('payment authorization expired');
    expect(snapshot.orders.find((entry) => entry.id === 'demo-order-1002')?.fulfilmentState).toBe(
      'CANCELLED',
    );
  });

  it('rejects a non-authorized order without mutating it', () => {
    const store = createWorkflowDemoStore();
    const before = store.snapshot();
    const result = store.cancel('demo-order-1003', 'operator');
    const after = store.snapshot();

    expect(result.ok).toBe(false);
    expect(result.message).toContain('dispatched');
    expect(after).toEqual(before);
  });

  it('rejects an unknown order', () => {
    const store = createWorkflowDemoStore();
    expect(store.cancel('missing', 'operator').ok).toBe(false);
  });

  it('reset restores the seed', () => {
    const store = createWorkflowDemoStore();
    store.cancel('demo-order-1001', 'operator');
    store.reset();

    const snapshot = store.snapshot();
    expect(snapshot.orders.find((entry) => entry.id === 'demo-order-1001')?.status).toBe(
      'authorized',
    );
    expect(snapshot.reservations.filter((line) => line.status === 'active')).toHaveLength(5);
    expect(snapshot.emails).toHaveLength(6);
  });

  it('emailsForCustomer includes customer-addressed, email-addressed and order-addressed mail', () => {
    const store = createWorkflowDemoStore();
    const snapshot = store.snapshot();
    const ada = userById(snapshot, 'user-ada');
    expect(ada).toBeDefined();

    const emails = emailsForCustomer(snapshot, ada!);
    expect(emails.map((email) => email.id)).toEqual([
      'email-2',
      'email-6',
      'email-1',
    ]);
  });

  it('a store factory is isolated from the singleton', () => {
    const first = createWorkflowDemoStore();
    const second = createWorkflowDemoStore();
    first.cancel('demo-order-1001', 'operator');

    expect(second.snapshot().orders.find((entry) => entry.id === 'demo-order-1001')?.status).toBe(
      'authorized',
    );
  });
});
