import { afterEach, describe, expect, it, vi } from 'vitest';
import { paymentClient, PaymentClientError } from './paymentClient';

const billingAddress = {
  line1: '1 Watchmaker Lane',
  city: 'London',
  postalCode: 'EC1A 1BB',
  country: 'GB',
};

const input = {
  customerId: 'customer-1',
  cardNumber: '4242424242424242',
  expiry: '12/30',
  billingAddress,
};

const methodBody = {
  id: 'pm-1',
  last4: '4242',
  brand: 'visa',
  expiry: '12/30',
};

describe('paymentClient.createMethod', () => {
  const baseUrl = 'http://payment.test';

  afterEach(() => {
    paymentClient.baseUrl = baseUrl;
    vi.restoreAllMocks();
  });

  it('POSTs to /payments/methods and returns the parsed payment method', async () => {
    paymentClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(methodBody), { status: 201 }));

    const result = await paymentClient.createMethod(input);

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/payments/methods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    expect(result).toEqual(methodBody);
  });

  it('forwards an AbortSignal when supplied', async () => {
    paymentClient.baseUrl = baseUrl;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(methodBody), { status: 201 }));
    const controller = new AbortController();

    await paymentClient.createMethod(input, { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/payments/methods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
  });

  it('throws PaymentClientError on a non-2xx response, carrying the HTTP status', async () => {
    paymentClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid card number' }), { status: 400 }),
    );

    try {
      await paymentClient.createMethod(input);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentClientError);
      expect((error as PaymentClientError).status).toBe(400);
    }
  });

  it('throws PaymentClientError when the network request fails', async () => {
    paymentClient.baseUrl = baseUrl;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(paymentClient.createMethod(input)).rejects.toThrow(PaymentClientError);
  });

  it('throws PaymentClientError when the base URL is not configured', async () => {
    paymentClient.baseUrl = undefined;

    await expect(paymentClient.createMethod(input)).rejects.toThrow(PaymentClientError);
  });
});
