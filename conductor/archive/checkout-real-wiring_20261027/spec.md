# Specification: US-11–US-14 real backend wiring

## Overview

Checkout Journey 1's service contracts landed 2026-10-27 (order-service
`POST /orders` reshaped by ADR 0018, payment-service
`POST /payments/methods`, TD-7.1/7.2 bulk reserve). gshop's checkout form
currently runs against an in-browser mock on the *old* status-field
contract (`payment_failed`/`reservation_failed` inside a 201 `Order`). This
track wires the form to the real HTTP contract and closes gshop's remaining
Journey 1 stories: US-11.2, US-12.2, US-13.3, US-14.4, plus TD-7.4 (surface
every failed line in one pass).

## Functional Requirements

- **FR-1 — Status-code result model.** `orderClient.create()` distinguishes
  201 / 402 / 409 / 400 / 503 / 500 from the real response body, per
  `gluon/docs/system-design.md`'s `POST /orders` contract. 201 returns the
  `authorized` `Order`; 402 carries `paymentFailure.reason`; 409 carries
  `reservationFailures[]` (**every** failed line); 400/503/500 carry the
  server's `error` message.
- **FR-2 — No order on failure.** Checkout's result type (`CheckoutResult`)
  drops the `order` field from failure variants, matching ADR 0018: a
  declined or rejected checkout has no order row and must not appear in
  confirmation/history.
- **FR-3 — 201 path.** On success: clear the cart id, show
  OrderConfirmation (order id, `authorized` status, shipping address, lines,
  total).
- **FR-4 — 402 path.** Show the decline reason inline, keep the form values
  and card editable, allow resubmit (a resubmit creates a fresh payment
  method then retries the order).
- **FR-5 — 409 path (US-14.4 + TD-7.4).** Show **every** failed line in one
  pass, each with sku/product name, reason, and its own Remove action.
  Remove deletes that line from cart-service and the local checkout list;
  the customer then presses Place order again to retry the remaining lines.
  No automatic resubmission.
- **FR-6 — 400/503/500 path.** Show a generic, dismissible error (server
  message when present); keep the form intact and resubmit possible.
- **FR-7 — Mock parity.** Keep `VITE_CHECKOUT_MOCK` as a dev-only aid, but
  rewrite `checkoutMock.ts` to the same `CheckoutResult`/status-code shape,
  including a multi-line unavailable scenario that exercises TD-7.4's list.
  The Prototype scenario control stays dev-only.
- **FR-8 — Existing form scope confirmed.** Shipping address section +
  inline validation (US-11.2), billing address + defaulted "same as
  shipping" (US-12.2), and card number/expiry + `paymentClient.createMethod`
  (US-13.3) are already prototyped; this track verifies them against the
  real contracts and closes the stories.
- **FR-9 — Live verification.** Redeploy order-service and payment-service
  from current `main`, port-forward, and run the real checkout paths:
  authorized, declined, insufficient stock (single and multi-line), and a
  400/503 error path.

## Non-Functional Requirements

- No PAN in `localStorage`, logs, or error messages — request-only, as
  today.
- Typed errors/result variants; no `any`; existing lint/TS strict settings
  unchanged.
- Test coverage stays >80% overall for touched modules; all tests run
  non-interactively (`CI=true`).
- No new runtime dependencies.
- gshop docs (`README.md`, `conductor/tech-stack.md`,
  `conductor/product.md`) updated to describe the status-code contract and
  the retained mock.

## Acceptance Criteria

- `npm test`, lint, and build are green.
- Component/gateway tests cover 201, 402, 409 (one and multiple failures),
  400/402/409 body parsing, and 503/500/network errors.
- Mock mode reproduces all four scenarios against the new result model.
- Live run against the real local cluster passes all FR-9 paths; failed
  attempts leave nothing in Order History.
- US-11.2, US-12.2, US-13.3, US-14.4 and TD-7.4 are checked off in `gluon`
  docs; PLAN Journey 1 gshop items marked done.

## Out of Scope

- US-14.3 capture on dispatch (Checkout Journey 4).
- Real payment-provider tokenization / hosted fields (simulator only).
- TD-9 fail-fast on an open breaker, TD-10 authorize idempotency.
- Auth/sessions, saved addresses/cards, routing library.
