import { describe, expect, it } from 'vitest';
import { errorMessage, formatPrice, formatStatus } from './format';

describe('formatPrice', () => {
  it('formats cents as a dollar string with two decimal places', () => {
    expect(formatPrice(1999)).toBe('$19.99');
    expect(formatPrice(0)).toBe('$0.00');
    expect(formatPrice(100)).toBe('$1.00');
  });
});

describe('errorMessage', () => {
  it('returns the message of an Error', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('stringifies a non-Error value', () => {
    expect(errorMessage('plain string')).toBe('plain string');
  });
});

describe('formatStatus', () => {
  it('replaces underscores with spaces and capitalizes the first letter', () => {
    expect(formatStatus('reservation_failed')).toBe('Reservation failed');
    expect(formatStatus('pending')).toBe('Pending');
  });
});
