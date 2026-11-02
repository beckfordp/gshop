import {
  FULFILMENT_SERVICE_URL,
  INVENTORY_SERVICE_URL,
  NOTIFICATION_SERVICE_URL,
  OPERATOR_TOKEN,
  ORDER_SERVICE_URL,
  PAYMENT_SERVICE_URL,
  USER_SERVICE_URL,
} from './env';
import { serverErrorMessage } from './httpError';
import { errorMessage } from '../lib/format';
import type { Order } from './orderClient';

// Real admin-console contracts (ADM-1..5), gluon/docs/system-design.md's
// "REST contracts": GET /admin/orders, GET /inventorys/order-reservations,
// GET/PATCH /reconciliations on four services, GET /emails, GET /users/{id},
// operator PATCH /orders/{id} and POST /payments/authorizations/{id}/expire.
// Writes carry the dev-only operator token (ADR 0024) — local/demo only.

export type ReservationStatus = 'active' | 'released' | 'shipped';

export interface Reservation {
  orderId: string;
  orderItemId: string;
  lineNo: number;
  sku: string;
  quantity: number;
  status: ReservationStatus;
  reservedAt: string;
  releasedAt: string | null;
}

export type ReconciliationService = 'order' | 'payment' | 'fulfilment' | 'inventory';

export const RECONCILIATION_SERVICES: ReconciliationService[] = [
  'order',
  'payment',
  'fulfilment',
  'inventory',
];

export interface Reconciliation {
  orderId: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAt: string;
  operatorId: string | null;
  note: string | null;
  resolvedAt: string | null;
}

export interface ServiceReconciliation extends Reconciliation {
  service: ReconciliationService;
}

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'unresolved';

export interface SentEmail {
  id: string;
  sourceEventId: string;
  eventType: string;
  reason: string | null;
  recipientType: 'customer' | 'email' | 'order';
  recipientKey: string;
  recipientEmail: string | null;
  customerId: string | null;
  orderId: string | null;
  subject: string;
  body: string;
  status: EmailStatus;
  createdAt: string;
  sentAt: string | null;
  failedAt: string | null;
  error: string | null;
}

export interface UserAccount {
  userId: string;
  email: string;
  createdAt: string;
}

export interface ExpiredPayment {
  id: string;
  orderId: string;
  status: string;
}

export class AdminClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AdminClientError';
    this.status = status;
  }
}

const serviceUrls: Record<ReconciliationService, () => string | undefined> = {
  order: () => adminClient.urls.order,
  payment: () => adminClient.urls.payment,
  fulfilment: () => adminClient.urls.fulfilment,
  inventory: () => adminClient.urls.inventory,
};

async function send(
  service: string,
  baseUrl: string | undefined,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (!baseUrl) {
    throw new AdminClientError(`${service} service URL is not configured`);
  }
  let response: Response;
  try {
    response = init ? await fetch(`${baseUrl}${path}`, init) : await fetch(`${baseUrl}${path}`);
  } catch (error) {
    throw new AdminClientError(`Failed to reach ${service} service: ${errorMessage(error)}`);
  }
  if (!response.ok) {
    throw new AdminClientError(
      await serverErrorMessage(
        response,
        `${service} request failed with status ${response.status}`,
      ),
      response.status,
    );
  }
  return response;
}

function operatorHeaders(json: boolean): HeadersInit {
  return {
    Authorization: `Bearer ${adminClient.operatorToken}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function query(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '',
  );
  return entries.length === 0 ? '' : `?${new URLSearchParams(entries).toString()}`;
}

async function listOrders(
  filters: { status?: string; customerId?: string } = {},
): Promise<Order[]> {
  const response = await send('Order', adminClient.urls.order, `/admin/orders${query(filters)}`);
  return (await response.json()) as Order[];
}

async function reservations(orderId: string): Promise<Reservation[]> {
  const response = await send(
    'Inventory',
    adminClient.urls.inventory,
    `/inventorys/order-reservations${query({ orderId })}`,
  );
  return (await response.json()) as Reservation[];
}

async function reconciliations(
  service: ReconciliationService,
  filters: { status?: 'open' | 'resolved'; orderId?: string } = {},
): Promise<ServiceReconciliation[]> {
  const response = await send(
    service,
    serviceUrls[service](),
    `/reconciliations${query(filters)}`,
  );
  const rows = (await response.json()) as Reconciliation[];
  return rows.map((row) => ({ ...row, service }));
}

/** Every service's flags, newest first. A service that fails is reported in
 * `failures` rather than hiding the others' queues. */
async function allReconciliations(
  filters: { status?: 'open' | 'resolved'; orderId?: string } = {},
): Promise<{ rows: ServiceReconciliation[]; failures: string[] }> {
  const results = await Promise.allSettled(
    RECONCILIATION_SERVICES.map((service) => reconciliations(service, filters)),
  );
  const rows: ServiceReconciliation[] = [];
  const failures: string[] = [];
  results.forEach((result) => {
    if (result.status === 'fulfilled') rows.push(...result.value);
    else failures.push(errorMessage(result.reason));
  });
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { rows, failures };
}

async function resolveReconciliation(
  service: ReconciliationService,
  orderId: string,
  note?: string,
): Promise<ServiceReconciliation> {
  const response = await send(
    service,
    serviceUrls[service](),
    `/reconciliations/${encodeURIComponent(orderId)}`,
    {
      method: 'PATCH',
      headers: operatorHeaders(true),
      body: JSON.stringify(note ? { status: 'resolved', note } : { status: 'resolved' }),
    },
  );
  return { ...((await response.json()) as Reconciliation), service };
}

/** Journey 8 operator cancel: the customer PATCH plus the dev operator token,
 * which selects `reason: operator` (ADR 0024). 409 = no longer authorized. */
async function operatorCancel(orderId: string): Promise<Order> {
  const response = await send('Order', adminClient.urls.order, `/orders/${orderId}`, {
    method: 'PATCH',
    headers: operatorHeaders(true),
    body: JSON.stringify({ status: 'cancelled' }),
  });
  return (await response.json()) as Order;
}

/** ADM-5: expires the payment hold now through payment-service's real sweep;
 * the order cancellation follows asynchronously via PaymentAuthorizationExpired. */
async function expireAuthorization(orderId: string): Promise<ExpiredPayment> {
  const response = await send(
    'Payment',
    adminClient.urls.payment,
    `/payments/authorizations/${encodeURIComponent(orderId)}/expire`,
    { method: 'POST', headers: operatorHeaders(false) },
  );
  return (await response.json()) as ExpiredPayment;
}

async function emails(filters: { customerId?: string; orderId?: string }): Promise<SentEmail[]> {
  const response = await send(
    'Notification',
    adminClient.urls.notification,
    `/emails${query(filters)}`,
  );
  return (await response.json()) as SentEmail[];
}

/** `null` for an id with no account — anonymous checkouts mint one (ADM-10). */
async function user(id: string): Promise<UserAccount | null> {
  try {
    const response = await send('User', adminClient.urls.user, `/users/${encodeURIComponent(id)}`);
    return (await response.json()) as UserAccount;
  } catch (error) {
    if (error instanceof AdminClientError && (error.status === 404 || error.status === 400)) {
      return null;
    }
    throw error;
  }
}

export const adminClient = {
  urls: {
    order: ORDER_SERVICE_URL,
    payment: PAYMENT_SERVICE_URL,
    fulfilment: FULFILMENT_SERVICE_URL,
    inventory: INVENTORY_SERVICE_URL,
    notification: NOTIFICATION_SERVICE_URL,
    user: USER_SERVICE_URL,
  } as Record<ReconciliationService | 'notification' | 'user', string | undefined>,
  operatorToken: OPERATOR_TOKEN,
  listOrders,
  reservations,
  reconciliations,
  allReconciliations,
  resolveReconciliation,
  operatorCancel,
  expireAuthorization,
  emails,
  user,
};
