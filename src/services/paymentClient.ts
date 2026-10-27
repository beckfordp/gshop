import { PAYMENT_SERVICE_URL } from './env';
import { checkHealth } from './health';
import { serverErrorMessage } from './httpError';
import { errorMessage } from '../lib/format';
import type { Address, PaymentMethod } from './checkoutTypes';

// Real POST /payments/methods contract:
// gluon/docs/system-design.md's "REST contracts" (US-13). payment-service
// tokenizes the card number on arrival and never stores the PAN; the browser
// only ever sees the resulting PaymentMethod id, last4, brand, and expiry.
//
// Prototype caveat: collecting a raw card number in browser state is fine for
// the local mock flow, but a real provider integration must use hosted fields
// or provider-side tokenization instead.

export interface CreatePaymentMethodInput {
  customerId: string;
  cardNumber: string;
  // MM/YY
  expiry: string;
  billingAddress: Address;
}

export class PaymentClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'PaymentClientError';
    this.status = status;
  }
}

async function createMethod(
  input: CreatePaymentMethodInput,
  options: { signal?: AbortSignal } = {},
): Promise<PaymentMethod> {
  if (!paymentClient.baseUrl) {
    throw new PaymentClientError('Payment service URL is not configured');
  }

  let response: Response;
  try {
    response = await fetch(`${paymentClient.baseUrl}/payments/methods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    throw new PaymentClientError(`Failed to reach payment service: ${errorMessage(error)}`);
  }

  if (!response.ok) {
    const fallback = `Payment method request failed with status ${response.status}`;
    throw new PaymentClientError(
      await serverErrorMessage(response, fallback),
      response.status,
    );
  }

  return (await response.json()) as PaymentMethod;
}

export const paymentClient: {
  baseUrl: string | undefined;
  health: () => Promise<boolean>;
  createMethod: typeof createMethod;
} = {
  baseUrl: PAYMENT_SERVICE_URL,
  health: () => checkHealth(PAYMENT_SERVICE_URL),
  createMethod,
};
