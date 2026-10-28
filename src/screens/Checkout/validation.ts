import type { Address } from '../../services/checkoutTypes';

// Pure checkout-form validation. Kept out of the component so the rules are
// testable without React and `now` can be injected for expiry tests.

export interface AddressValues {
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface CheckoutFormValues {
  shipping: AddressValues;
  sameAsShipping: boolean;
  billing: AddressValues;
  cardNumber: string;
  expiry: string;
}

export interface AddressErrors {
  line1?: string;
  line2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface CheckoutErrors {
  shipping?: AddressErrors;
  billing?: AddressErrors;
  cardNumber?: string;
  expiry?: string;
}

export const EMPTY_ADDRESS: AddressValues = {
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: 'GB',
};

export function validateAddress(values: AddressValues): AddressErrors {
  const errors: AddressErrors = {};

  if (!values.line1.trim()) {
    errors.line1 = 'Enter the first line of the address';
  } else if (values.line1.trim().length > 120) {
    errors.line1 = 'Address line 1 is too long';
  }

  if (values.line2.trim().length > 120) {
    errors.line2 = 'Address line 2 is too long';
  }

  if (!values.city.trim()) {
    errors.city = 'Enter a city';
  } else if (values.city.trim().length > 80) {
    errors.city = 'City is too long';
  }

  if (!values.postalCode.trim()) {
    errors.postalCode = 'Enter a postcode';
  } else if (values.postalCode.trim().length > 12) {
    errors.postalCode = 'Postcode is too long';
  }

  if (!/^[A-Za-z]{2}$/.test(values.country.trim())) {
    errors.country = 'Use a two-letter country code (e.g. GB)';
  }

  return errors;
}

export function validateCheckout(
  values: CheckoutFormValues,
  options: { now?: Date } = {},
): CheckoutErrors {
  const errors: CheckoutErrors = {};

  const shippingErrors = validateAddress(values.shipping);
  if (Object.keys(shippingErrors).length > 0) {
    errors.shipping = shippingErrors;
  }

  if (!values.sameAsShipping) {
    const billingErrors = validateAddress(values.billing);
    if (Object.keys(billingErrors).length > 0) {
      errors.billing = billingErrors;
    }
  }

  const digits = normalizeCardNumber(values.cardNumber);
  if (!digits) {
    errors.cardNumber = 'Enter a card number';
  } else if (digits.length < 12 || digits.length > 19) {
    errors.cardNumber = 'Card number must be 12 to 19 digits';
  }

  if (!values.expiry) {
    errors.expiry = 'Enter the expiry date';
  } else if (!isValidExpiry(values.expiry, options.now ?? new Date())) {
    errors.expiry = 'Enter a valid future expiry date (MM/YY)';
  }

  return errors;
}

export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function toAddress(values: AddressValues): Address {
  const line2 = values.line2.trim();
  return {
    line1: values.line1.trim(),
    city: values.city.trim(),
    postalCode: values.postalCode.trim(),
    country: values.country.trim().toUpperCase(),
    ...(line2 ? { line2 } : {}),
  };
}

export function toAddressValues(address: Address): AddressValues {
  return {
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
  };
}

function isValidExpiry(raw: string, now: Date): boolean {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(raw.trim());
  if (!match) {
    return false;
  }

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  // First day of the month after expiry: the card is valid through the end
  // of its expiry month.
  const validUntil = new Date(year, month, 1);
  return validUntil.getTime() > now.getTime();
}
