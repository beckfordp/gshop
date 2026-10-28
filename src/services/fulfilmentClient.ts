import { FULFILMENT_SERVICE_URL } from './env';
import { serverErrorMessage } from './httpError';
import { errorMessage } from '../lib/format';

// Real fulfilment-service operator API:
// gluon/services/fulfilment-service/src/main/scala/fulfilmentservice/FulfilmentRoutes.scala
//
// Tasks are created asynchronously from `payment-events: PaymentAuthorized`,
// so the queue is whatever the service has actually picked up — there is no
// local seed. The response carries the shipping address snapshot but no
// customer identity (the event itself has none).

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

export interface ShippingAddress {
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
}

export interface FulfilmentTask {
  orderId: string;
  state: FulfilmentState;
  items: FulfilmentItem[];
  shippingAddress: ShippingAddress;
  trackingNo: string | null;
  carrier: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export class FulfilmentClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FulfilmentClientError';
    this.status = status;
  }
}

function messageFor(status: number): string {
  return `Fulfilment request failed with status ${status}`;
}

async function send(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = fulfilmentClient.baseUrl;
  if (!baseUrl) {
    throw new FulfilmentClientError('Fulfilment service URL is not configured');
  }

  let response: Response;
  try {
    const url = `${baseUrl}${path}`;
    response = init ? await fetch(url, init) : await fetch(url);
  } catch (error) {
    throw new FulfilmentClientError(
      `Failed to reach fulfilment service: ${errorMessage(error)}`,
    );
  }

  if (!response.ok) {
    throw new FulfilmentClientError(
      await serverErrorMessage(response, messageFor(response.status)),
      response.status,
    );
  }
  return response;
}

function postJson(path: string, body: unknown): Promise<Response> {
  return send(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function listTasks(): Promise<FulfilmentTask[]> {
  const response = await send('/fulfilment-tasks');
  return (await response.json()) as FulfilmentTask[];
}

const actionPath = (orderId: string, action: string): string =>
  `/fulfilment-tasks/${encodeURIComponent(orderId)}/${action}`;

async function startPicking(orderId: string): Promise<FulfilmentTask> {
  const response = await send(actionPath(orderId, 'start-picking'), {
    method: 'POST',
  });
  return (await response.json()) as FulfilmentTask;
}

async function pack(orderId: string): Promise<FulfilmentTask> {
  const response = await send(actionPath(orderId, 'pack'), { method: 'POST' });
  return (await response.json()) as FulfilmentTask;
}

async function dispatch(
  orderId: string,
  trackingNo: string,
  carrier: string,
): Promise<FulfilmentTask> {
  const response = await postJson(actionPath(orderId, 'dispatch'), {
    trackingNo,
    carrier,
  });
  return (await response.json()) as FulfilmentTask;
}

async function fail(orderId: string, reason: string): Promise<FulfilmentTask> {
  const response = await postJson(actionPath(orderId, 'fail'), { reason });
  return (await response.json()) as FulfilmentTask;
}

export const fulfilmentClient: {
  baseUrl: string | undefined;
  listTasks: typeof listTasks;
  startPicking: typeof startPicking;
  pack: typeof pack;
  dispatch: typeof dispatch;
  fail: typeof fail;
} = {
  baseUrl: FULFILMENT_SERVICE_URL,
  listTasks,
  startPicking,
  pack,
  dispatch,
  fail,
};
