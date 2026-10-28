// Prototype fulfilment queue (Journey 3). No backend: fulfilment-service
// doesn't exist yet, so the operator UI drives a seeded, localStorage-
// persisted queue. Replaced by the real service's API when it lands.

export type FulfilmentState =
  | 'PENDING'
  | 'PICKING'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DISPATCH_FAILED';

export interface FulfilmentItem {
  sku: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
}

export interface FulfilmentCustomer {
  type: 'user' | 'anonymous';
  label: string;
}

export interface FulfilmentOrder {
  orderId: string;
  customer: FulfilmentCustomer;
  items: FulfilmentItem[];
  totalCents: number;
  state: FulfilmentState;
  createdAt: string;
  updatedAt: string;
  trackingNo?: string;
  carrier?: string;
  failureReason?: string;
}

const QUEUE_KEY = 'gshop:fulfilmentQueue';

export class FulfilmentTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FulfilmentTransitionError';
  }
}

function at(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

export function seedFulfilmentQueue(): FulfilmentOrder[] {
  return [
    {
      orderId: 'FUL-1001',
      customer: { type: 'user', label: 'ada@example.com' },
      items: [
        {
          sku: 'watch-rolex-submariner',
          productName: 'Rolex Submariner Date',
          quantity: 1,
          unitPriceCents: 1_450_000,
        },
      ],
      totalCents: 1_450_000,
      state: 'PENDING',
      createdAt: at(24),
      updatedAt: at(24),
    },
    {
      orderId: 'FUL-1002',
      customer: { type: 'anonymous', label: 'id 4f2a9c18…' },
      items: [
        {
          sku: 'watch-omega-speedmaster',
          productName: 'Omega Speedmaster Professional',
          quantity: 1,
          unitPriceCents: 620_000,
        },
      ],
      totalCents: 620_000,
      state: 'PICKING',
      createdAt: at(90),
      updatedAt: at(30),
    },
    {
      orderId: 'FUL-1003',
      customer: { type: 'user', label: 'ada@example.com' },
      items: [
        {
          sku: 'watch-tag-heuer-carrera',
          productName: 'TAG Heuer Carrera',
          quantity: 2,
          unitPriceCents: 480_000,
        },
      ],
      totalCents: 960_000,
      state: 'PACKED',
      createdAt: at(180),
      updatedAt: at(45),
    },
    {
      orderId: 'FUL-1004',
      customer: { type: 'anonymous', label: 'id 9b31de20…' },
      items: [
        {
          sku: 'watch-breitling-navitimer',
          productName: 'Breitling Navitimer',
          quantity: 1,
          unitPriceCents: 780_000,
        },
      ],
      totalCents: 780_000,
      state: 'DISPATCHED',
      createdAt: at(300),
      updatedAt: at(120),
      trackingNo: 'GLN-8842-7710',
      carrier: 'DHL Express',
    },
    {
      orderId: 'FUL-1005',
      customer: { type: 'user', label: 'grace@example.com' },
      items: [
        {
          sku: 'watch-iwc-portugieser',
          productName: 'IWC Portugieser Chronograph',
          quantity: 1,
          unitPriceCents: 890_000,
        },
      ],
      totalCents: 890_000,
      state: 'DISPATCH_FAILED',
      createdAt: at(420),
      updatedAt: at(150),
      failureReason: 'Item damaged during packing',
    },
  ];
}

function isTerminal(state: FulfilmentState): boolean {
  return state === 'DISPATCHED' || state === 'DISPATCH_FAILED';
}

function readQueue(): FulfilmentOrder[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) {
      return seed();
    }
    const parsed = JSON.parse(raw) as FulfilmentOrder[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seed();
  } catch {
    return seed();
  }
}

function seed(): FulfilmentOrder[] {
  const orders = seedFulfilmentQueue();
  persist(orders);
  return orders;
}

function persist(orders: FulfilmentOrder[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(orders));
  } catch {
    // Storage can be unavailable; the in-memory call still returns the update.
  }
}

function transition(
  orderId: string,
  allowedFrom: FulfilmentState[],
  update: (order: FulfilmentOrder) => FulfilmentOrder,
): FulfilmentOrder[] {
  const orders = readQueue();
  const order = orders.find((candidate) => candidate.orderId === orderId);
  if (!order) {
    throw new FulfilmentTransitionError(`Unknown order: ${orderId}`);
  }
  if (!allowedFrom.includes(order.state)) {
    throw new FulfilmentTransitionError(
      `Cannot transition order ${orderId} from ${order.state}`,
    );
  }
  const next = orders.map((candidate) =>
    candidate.orderId === orderId
      ? { ...update(candidate), updatedAt: new Date().toISOString() }
      : candidate,
  );
  persist(next);
  return next;
}

export function getFulfilmentQueue(): FulfilmentOrder[] {
  return readQueue();
}

export function startPicking(orderId: string): FulfilmentOrder[] {
  return transition(orderId, ['PENDING'], (order) => ({
    ...order,
    state: 'PICKING',
  }));
}

export function markPacked(orderId: string): FulfilmentOrder[] {
  return transition(orderId, ['PICKING'], (order) => ({
    ...order,
    state: 'PACKED',
  }));
}

export function dispatchOrder(
  orderId: string,
  trackingNo: string,
  carrier: string,
): FulfilmentOrder[] {
  const tracking = trackingNo.trim();
  const carrierName = carrier.trim();
  if (!tracking || !carrierName) {
    throw new FulfilmentTransitionError(
      'Tracking number and carrier are required to dispatch',
    );
  }
  return transition(orderId, ['PACKED'], (order) => ({
    ...order,
    state: 'DISPATCHED',
    trackingNo: tracking,
    carrier: carrierName,
  }));
}

export function reportProblem(
  orderId: string,
  reason: string,
): FulfilmentOrder[] {
  const failureReason = reason.trim();
  if (!failureReason) {
    throw new FulfilmentTransitionError('A reason is required');
  }
  return transition(
    orderId,
    ['PENDING', 'PICKING', 'PACKED'],
    (order) => ({
      ...order,
      state: 'DISPATCH_FAILED',
      failureReason,
    }),
  );
}

export function isTerminalState(state: FulfilmentState): boolean {
  return isTerminal(state);
}

export function resetFulfilmentQueue(): FulfilmentOrder[] {
  const orders = seedFulfilmentQueue();
  persist(orders);
  return orders;
}
