// Mock-backed data for the Admin workflow prototype. Nothing here calls a
// backend: the real versions need new read/trigger APIs (reservation ledger,
// sent-email history, admin order list, expiry trigger) that do not exist yet.
// The customer Order History Cancel action is real-wired separately.

export type DemoOrderStatus =
  | 'authorized'
  | 'dispatched'
  | 'confirmed'
  | 'cancelled'
  | 'payment_failed';

export type DemoPaymentStatus = 'authorized' | 'voided' | 'captured' | 'failed';

export type DemoFulfilmentState =
  | 'PENDING'
  | 'PICKING'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DISPATCH_FAILED'
  | 'CANCELLED';

export type DemoReservationStatus = 'active' | 'released' | 'shipped';

export type CancellationReason = 'operator' | 'auth_expired' | 'customer';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
}

export interface DemoOrderItem {
  sku: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
}

export interface DemoOrder {
  id: string;
  customerId: string;
  status: DemoOrderStatus;
  paymentStatus: DemoPaymentStatus;
  fulfilmentState: DemoFulfilmentState;
  totalCents: number;
  items: DemoOrderItem[];
  authExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DemoReservation {
  orderId: string;
  orderItemId: string;
  lineNo: number;
  sku: string;
  productName: string;
  quantity: number;
  status: DemoReservationStatus;
  reservedAt: string;
  releasedAt: string | null;
}

/** `recipient` mirrors what notification-service actually knows today: order
 * events address the customerId, UserRegistered addresses an email, and
 * payment/fulfilment events address the orderId. */
export interface DemoEmail {
  id: string;
  recipient: 'customer' | 'email' | 'order';
  to: string;
  subject: string;
  body: string;
  eventType: string;
  reason: CancellationReason | null;
  sentAt: string;
}

export interface DemoSnapshot {
  users: DemoUser[];
  orders: DemoOrder[];
  reservations: DemoReservation[];
  emails: DemoEmail[];
}

export interface DemoMutationResult {
  ok: boolean;
  message: string;
}

export interface WorkflowDemoStore {
  snapshot(): DemoSnapshot;
  cancel(orderId: string, reason: 'operator' | 'auth_expired'): DemoMutationResult;
  reset(): void;
}

const ada: DemoUser = { id: 'user-ada', name: 'Ada Lovelace', email: 'ada@example.com' };
const grace: DemoUser = { id: 'user-grace', name: 'Grace Hopper', email: 'grace@example.com' };
const alan: DemoUser = { id: 'user-alan', name: 'Alan Turing', email: 'alan@example.com' };

function item(
  sku: string,
  productName: string,
  quantity: number,
  unitPriceCents: number,
): DemoOrderItem {
  return { sku, productName, quantity, unitPriceCents };
}

function order(
  id: string,
  customerId: string,
  status: DemoOrderStatus,
  paymentStatus: DemoPaymentStatus,
  fulfilmentState: DemoFulfilmentState,
  items: DemoOrderItem[],
  authExpiresAt: string | null,
  createdAt: string,
): DemoOrder {
  return {
    id,
    customerId,
    status,
    paymentStatus,
    fulfilmentState,
    totalCents: items.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0),
    items,
    authExpiresAt,
    createdAt,
    updatedAt: createdAt,
  };
}

function reservation(
  orderId: string,
  lineNo: number,
  line: DemoOrderItem,
  status: DemoReservationStatus,
  reservedAt: string,
  releasedAt: string | null = null,
): DemoReservation {
  return {
    orderId,
    orderItemId: `${orderId}-item-${lineNo}`,
    lineNo,
    sku: line.sku,
    productName: line.productName,
    quantity: line.quantity,
    status,
    reservedAt,
    releasedAt,
  };
}

const seed: DemoSnapshot = {
  users: [ada, grace, alan],
  orders: [
    order(
      'demo-order-1001',
      ada.id,
      'authorized',
      'authorized',
      'PENDING',
      [
        item('watch-rolex-submariner', 'Rolex Submariner', 1, 950000),
        item('watch-omega-speedmaster', 'Omega Speedmaster', 1, 620000),
      ],
      '2026-11-09T10:00:00Z',
      '2026-11-01T09:15:00Z',
    ),
    order(
      'demo-order-1002',
      grace.id,
      'authorized',
      'authorized',
      'PICKING',
      [item('watch-tudor-black-bay', 'Tudor Black Bay', 1, 380000)],
      '2026-11-08T14:30:00Z',
      '2026-11-02T11:40:00Z',
    ),
    order(
      'demo-order-1003',
      alan.id,
      'dispatched',
      'captured',
      'DISPATCHED',
      [item('watch-grand-seiko-snowflake', 'Grand Seiko Snowflake', 1, 560000)],
      null,
      '2026-10-29T08:05:00Z',
    ),
    order(
      'demo-order-1004',
      ada.id,
      'cancelled',
      'voided',
      'CANCELLED',
      [item('watch-longines-master-collection', 'Longines Master Collection', 1, 240000)],
      null,
      '2026-10-27T16:20:00Z',
    ),
    order(
      'demo-order-1005',
      grace.id,
      'payment_failed',
      'failed',
      'DISPATCHED',
      [item('watch-cartier-tank', 'Cartier Tank', 1, 340000)],
      null,
      '2026-10-26T13:10:00Z',
    ),
  ],
  reservations: [
    reservation('demo-order-1001', 1, item('watch-rolex-submariner', 'Rolex Submariner', 1, 950000), 'active', '2026-11-01T09:15:00Z'),
    reservation('demo-order-1001', 2, item('watch-omega-speedmaster', 'Omega Speedmaster', 1, 620000), 'active', '2026-11-01T09:15:00Z'),
    reservation('demo-order-1002', 1, item('watch-tudor-black-bay', 'Tudor Black Bay', 1, 380000), 'active', '2026-11-02T11:40:00Z'),
    reservation('demo-order-1003', 1, item('watch-grand-seiko-snowflake', 'Grand Seiko Snowflake', 1, 560000), 'shipped', '2026-10-29T08:05:00Z'),
    reservation('demo-order-1004', 1, item('watch-longines-master-collection', 'Longines Master Collection', 1, 240000), 'released', '2026-10-27T16:20:00Z', '2026-10-28T09:00:00Z'),
    reservation('demo-order-1005', 1, item('watch-cartier-tank', 'Cartier Tank', 1, 340000), 'active', '2026-10-26T13:10:00Z'),
  ],
  emails: [
    {
      id: 'email-1',
      recipient: 'email',
      to: ada.email,
      subject: 'Welcome to gshop',
      body: 'Your account is ready.',
      eventType: 'UserRegistered',
      reason: null,
      sentAt: '2026-10-25T10:00:00Z',
    },
    {
      id: 'email-2',
      recipient: 'customer',
      to: ada.id,
      subject: 'Your order is confirmed',
      body: 'Good news - order demo-order-1001 is confirmed.',
      eventType: 'OrderConfirmed',
      reason: null,
      sentAt: '2026-11-01T09:16:00Z',
    },
    {
      id: 'email-3',
      recipient: 'customer',
      to: grace.id,
      subject: 'Your order is confirmed',
      body: 'Good news - order demo-order-1002 is confirmed.',
      eventType: 'OrderConfirmed',
      reason: null,
      sentAt: '2026-11-02T11:41:00Z',
    },
    {
      id: 'email-4',
      recipient: 'order',
      to: 'demo-order-1003',
      subject: 'Your order has shipped',
      body: 'Order demo-order-1003 has shipped.',
      eventType: 'DispatchConfirmed',
      reason: null,
      sentAt: '2026-10-30T15:20:00Z',
    },
    {
      id: 'email-5',
      recipient: 'order',
      to: 'demo-order-1005',
      subject: "We couldn't process your payment",
      body: "We couldn't process your payment for order demo-order-1005.",
      eventType: 'PaymentFailed',
      reason: null,
      sentAt: '2026-10-26T13:12:00Z',
    },
    {
      id: 'email-6',
      recipient: 'customer',
      to: ada.id,
      subject: 'Your order was cancelled',
      body: 'Order demo-order-1004 was cancelled by our support team.',
      eventType: 'OrderCancelled',
      reason: 'operator',
      sentAt: '2026-10-28T09:00:00Z',
    },
  ],
};

function clone(snapshot: DemoSnapshot): DemoSnapshot {
  return {
    users: snapshot.users.map((user) => ({ ...user })),
    orders: snapshot.orders.map((entry) => ({ ...entry, items: entry.items.map((line) => ({ ...line })) })),
    reservations: snapshot.reservations.map((entry) => ({ ...entry })),
    emails: snapshot.emails.map((entry) => ({ ...entry })),
  };
}

function cancellationCopy(
  orderId: string,
  reason: 'operator' | 'auth_expired',
): { subject: string; body: string } {
  const subject = 'Your order was cancelled';
  const body =
    reason === 'operator'
      ? `Order ${orderId} was cancelled by our support team.`
      : `Order ${orderId} was cancelled because its payment authorization expired.`;
  return { subject, body };
}

function humanStatus(status: DemoOrderStatus): string {
  return status.replace(/_/g, ' ');
}

export function userById(snapshot: DemoSnapshot, id: string): DemoUser | undefined {
  return snapshot.users.find((user) => user.id === id);
}

export function orderById(snapshot: DemoSnapshot, id: string): DemoOrder | undefined {
  return snapshot.orders.find((entry) => entry.id === id);
}

export function reservationsForOrder(
  snapshot: DemoSnapshot,
  orderId: string,
): DemoReservation[] {
  return snapshot.reservations
    .filter((entry) => entry.orderId === orderId)
    .sort((a, b) => a.lineNo - b.lineNo);
}

/** Emails the customer sees as theirs. Order/payment/fulfilment emails address
 * a customerId or orderId, so order-linked addresses are resolved here. */
export function emailsForCustomer(snapshot: DemoSnapshot, user: DemoUser): DemoEmail[] {
  const orderIds = new Set(
    snapshot.orders.filter((entry) => entry.customerId === user.id).map((entry) => entry.id),
  );
  return snapshot.emails
    .filter((email) => email.to === user.id || email.to === user.email || orderIds.has(email.to))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export function createWorkflowDemoStore(initial: DemoSnapshot = seed): WorkflowDemoStore {
  let state = clone(initial);
  let nextEmail = state.emails.length + 1;

  return {
    snapshot: () => clone(state),
    reset: () => {
      state = clone(initial);
      nextEmail = state.emails.length + 1;
    },
    cancel: (orderId, reason) => {
      const target = state.orders.find((entry) => entry.id === orderId);
      if (!target) {
        return { ok: false, message: `Unknown demo order ${orderId}.` };
      }
      if (target.status !== 'authorized') {
        return {
          ok: false,
          message: `Order ${orderId} is ${humanStatus(target.status)}; only an authorized order can be cancelled.`,
        };
      }

      const now = new Date().toISOString();
      const released = state.reservations.filter(
        (entry) => entry.orderId === orderId && entry.status === 'active',
      );
      const customer = state.users.find((user) => user.id === target.customerId);
      const copy = cancellationCopy(orderId, reason);

      state.orders = state.orders.map((entry) =>
        entry.id === orderId
          ? {
              ...entry,
              status: 'cancelled',
              paymentStatus: 'voided',
              fulfilmentState:
                entry.fulfilmentState === 'DISPATCHED' ? 'DISPATCHED' : 'CANCELLED',
              authExpiresAt: null,
              updatedAt: now,
            }
          : entry,
      );
      state.reservations = state.reservations.map((entry) =>
        entry.orderId === orderId && entry.status === 'active'
          ? { ...entry, status: 'released', releasedAt: now }
          : entry,
      );
      state.emails = [
        {
          id: `email-${nextEmail++}`,
          recipient: 'customer',
          to: target.customerId,
          subject: copy.subject,
          body: copy.body,
          eventType: 'OrderCancelled',
          reason,
          sentAt: now,
        },
        ...state.emails,
      ];

      const fulfilment =
        target.fulfilmentState === 'DISPATCHED' ? 'stayed DISPATCHED' : 'moved to CANCELLED';
      return {
        ok: true,
        message: `Order ${orderId} cancelled. Payment voided, ${released.length} reservation line(s) released, fulfilment ${fulfilment}; cancellation email sent to ${customer?.name ?? target.customerId}.`,
      };
    },
  };
}

export const workflowDemoStore = createWorkflowDemoStore();
