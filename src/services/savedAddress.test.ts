import { afterEach, describe, expect, it } from 'vitest';
import { getCheckoutAddress, saveCheckoutAddress } from './savedAddress';

const address = {
  line1: '1 Watchmaker Lane',
  city: 'London',
  postalCode: 'EC1A 1BB',
  country: 'GB',
};

const saved = {
  shipping: address,
  billing: { ...address, line1: '2 Billing Road' },
  sameAsShipping: false,
};

describe('savedAddress', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('round-trips a saved address for the user', () => {
    saveCheckoutAddress('user-1', saved);

    expect(getCheckoutAddress('user-1')).toEqual(saved);
  });

  it('returns null for an unknown user', () => {
    expect(getCheckoutAddress('user-unknown')).toBeNull();
  });

  it('scopes addresses per user', () => {
    saveCheckoutAddress('user-1', saved);

    expect(getCheckoutAddress('user-2')).toBeNull();
  });

  it('returns null for corrupt storage', () => {
    localStorage.setItem('gshop:savedAddress:user-1', '{not json');

    expect(getCheckoutAddress('user-1')).toBeNull();
  });

  it('returns null for an invalid shape', () => {
    localStorage.setItem(
      'gshop:savedAddress:user-1',
      JSON.stringify({ shipping: { line1: 'x' }, billing: address }),
    );

    expect(getCheckoutAddress('user-1')).toBeNull();
  });
});
