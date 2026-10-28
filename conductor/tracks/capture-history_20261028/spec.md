# Specification: US-19.5 — Order History payment capture statuses

## Overview

Journey 4's backend is live: payment-service captures the held authorization
when fulfilment publishes `DispatchConfirmed` and publishes
`PaymentCaptured`/`PaymentFailed {reason: capture_failed}`; order-service moves
the order to `confirmed` or `payment_failed`. gshop's `OrderStatus` union
already includes both values and `formatStatus` already title-cases them, so
this track proves the customer-facing half: Order History renders both statuses
from real data, backed by a live end-to-end check.

## Functional Requirements

- **FR-1 — Real statuses.** Order History renders `confirmed` as "Confirmed"
  and `payment_failed` as "Payment failed" for orders returned by
  `GET /orders?customerId=...`.
- **FR-2 — Full card intact.** A capture status change does not affect the rest
  of the card: id, items, total and date still render.
- **FR-3 — Docs.** README, `conductor/product.md` and `conductor/tech-stack.md`
  describe the capture statuses, and `gluon/CHANGELOG.md` records the change.
- **FR-4 — Live proof.** `scripts/verify-capture-history.sh` drives the real
  stack — checkout with an approving card → dispatch → capture → order
  `confirmed`; checkout with the capture-decline card (`5555 5555 5555 4444`)
  → dispatch → capture decline → order `payment_failed` — and asserts both
  through `GET /orders`, the exact data Order History renders.

## Non-Functional Requirements

- No backend contract change; no production gshop change is expected, since
  `OrderStatus` and `formatStatus` already cover both values.
- No new dependencies; existing gshop build/lint/test/coverage commands stay
  green.

## Acceptance Criteria

- Order History tests cover both capture statuses and the full card contents.
- The live script passes against `gluon-local` and leaves demo history clean
  (orders, payments, fulfilment tasks and outbox rows removed).
- Full gshop suite, lint, build and coverage pass.

## Out of Scope

- Visual differentiation (colour/badge) for failed statuses beyond the existing
  text label.
- The operator reconciliation UI/API for `order_reconciliation`.
- Any notification-service payment-email work (US-19.4) or authorization
  expiry (US-20).
