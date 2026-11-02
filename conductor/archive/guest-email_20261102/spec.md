# Specification: ADM-10 — guest checkout email

## Overview

UX decided 2026-11-02: an anonymous checkout must enter an email; signed-in
customers never see the field.

## Functional Requirements

- Checkout "Contact" fieldset with "Email for order updates", shown only
  when signed out; required and shape-checked (`validateCheckout(..., {guest})`).
- Sends `email` (trimmed, lower-cased) on `POST /orders` for guests only;
  `CheckoutRequest`/`CreateOrderInput` gain optional `email`,
  `Order.guestEmail` optional.
- Admin console labels a guest by their checkout email.

## Non-Functional
- TDD; vitest, `tsc -b`, eslint, build green.
