import { describe, expect, it } from 'vitest';
import {
  EMPTY_ADDRESS,
  normalizeCardNumber,
  toAddress,
  validateAddress,
  validateCheckout,
  type AddressValues,
  type CheckoutFormValues,
} from './validation';

const validAddress: AddressValues = {
  line1: '1 Watchmaker Lane',
  line2: '',
  city: 'London',
  postalCode: 'EC1A 1BB',
  country: 'gb',
};

function makeValues(overrides: Partial<CheckoutFormValues> = {}): CheckoutFormValues {
  return {
    shipping: validAddress,
    sameAsShipping: true,
    billing: EMPTY_ADDRESS,
    cardNumber: '4242424242424242',
    expiry: '12/30',
    ...overrides,
  };
}

describe('validateAddress', () => {
  it('accepts a complete address and treats line2 as optional', () => {
    expect(validateAddress(validAddress)).toEqual({});
  });

  it('requires line1, city, postcode, and a two-letter country', () => {
    const errors = validateAddress({
      line1: ' ',
      line2: '',
      city: '',
      postalCode: '',
      country: 'United Kingdom',
    });

    expect(errors.line1).toBeDefined();
    expect(errors.city).toBeDefined();
    expect(errors.postalCode).toBeDefined();
    expect(errors.country).toBeDefined();
  });

  it('rejects over-long address fields', () => {
    const errors = validateAddress({
      ...validAddress,
      line1: 'a'.repeat(121),
      line2: 'b'.repeat(121),
      city: 'c'.repeat(81),
      postalCode: 'd'.repeat(13),
    });

    expect(errors.line1).toBeDefined();
    expect(errors.line2).toBeDefined();
    expect(errors.city).toBeDefined();
    expect(errors.postalCode).toBeDefined();
  });
});

describe('validateCheckout', () => {
  it('ignores the billing draft when same-as-shipping is on', () => {
    expect(
      validateCheckout(makeValues({ sameAsShipping: true, billing: EMPTY_ADDRESS })),
    ).toEqual({});
  });

  it('validates billing when same-as-shipping is off', () => {
    const errors = validateCheckout(
      makeValues({ sameAsShipping: false, billing: EMPTY_ADDRESS }),
    );

    expect(errors.billing).toBeDefined();
    expect(errors.shipping).toBeUndefined();
  });

  it('requires 12 to 19 card digits', () => {
    expect(validateCheckout(makeValues({ cardNumber: '' })).cardNumber).toBeDefined();
    expect(
      validateCheckout(makeValues({ cardNumber: '12345678901' })).cardNumber,
    ).toBeDefined();
    expect(
      validateCheckout(makeValues({ cardNumber: '1'.repeat(20) })).cardNumber,
    ).toBeDefined();
    expect(
      validateCheckout(makeValues({ cardNumber: '4242 4242 4242 4242' })).cardNumber,
    ).toBeUndefined();
  });

  it('accepts MM/YY, rejects malformed months, and checks against the current month', () => {
    const now = new Date('2026-06-15T00:00:00Z');

    expect(validateCheckout(makeValues({ expiry: '6/26' }), { now }).expiry).toBeDefined();
    expect(validateCheckout(makeValues({ expiry: '13/26' }), { now }).expiry).toBeDefined();
    expect(validateCheckout(makeValues({ expiry: '05/26' }), { now }).expiry).toBeDefined();
    expect(validateCheckout(makeValues({ expiry: '06/26' }), { now }).expiry).toBeUndefined();
    expect(validateCheckout(makeValues({ expiry: '07/26' }), { now }).expiry).toBeUndefined();
  });
});

describe('toAddress', () => {
  it('trims fields, upper-cases the country, and omits a blank line2', () => {
    expect(
      toAddress({
        line1: '  1 Watchmaker Lane ',
        line2: '  ',
        city: ' London ',
        postalCode: ' EC1A 1BB ',
        country: ' gb ',
      }),
    ).toEqual({
      line1: '1 Watchmaker Lane',
      city: 'London',
      postalCode: 'EC1A 1BB',
      country: 'GB',
    });
  });

  it('keeps line2 when supplied', () => {
    expect(toAddress({ ...validAddress, line2: ' Flat 2 ' }).line2).toBe('Flat 2');
  });
});

describe('normalizeCardNumber', () => {
  it('strips spaces and hyphens', () => {
    expect(normalizeCardNumber('4242-4242 4242 4242')).toBe('4242424242424242');
  });
});
