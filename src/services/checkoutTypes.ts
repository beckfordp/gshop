// Shared checkout types. The wire contracts live in gluon/docs/system-design.md's
// "REST contracts" section — keep these in sync with it rather than inventing
// frontend-only shapes.

export interface Address {
  line1: string;
  // Optional second line; omitted rather than sent as null when blank.
  line2?: string;
  city: string;
  postalCode: string;
  // ISO 3166-1 alpha-2, upper-cased by validation before submission.
  country: string;
}

export interface ReservationFailure {
  sku: string;
  reason: string;
}

export interface PaymentFailure {
  reason: string;
}

export interface PaymentMethod {
  id: string;
  last4: string;
  brand: string;
  expiry: string;
}

// Raw card details as typed into the Checkout form. The prototype posts these
// to payment-service, which tokenizes them; this app never stores them.
export interface CardDetails {
  cardNumber: string;
  expiry: string;
}
