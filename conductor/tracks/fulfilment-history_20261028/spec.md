# Specification: US-17.6/18.5 — Order History dispatch statuses

## Overview

Journey 3's backend is live: fulfilment-service publishes
`DispatchConfirmed`/`DispatchFailed`, order-service moves orders to
`dispatched`/`dispatch_failed`, and gshop already reads those statuses through
`orderClient.list()`. This track proves the customer-facing half: Order History
renders both statuses from real data, and the approved prototype preview of
seeded mock cards is removed now that fulfilment-service has landed.

## Functional Requirements

- **FR-1 — Real statuses.** Order History renders `dispatched` as
  "Dispatched" and `dispatch_failed` as "Dispatch failed" for orders returned
  by `GET /orders?customerId=...`.
- **FR-2 — Preview removed.** The prototype preview section (seeded mock cards
  from `fulfilmentStore`) no longer appears in Order History, even with
  `VITE_FULFILMENT_MOCK` on/absent. The operator Fulfilment screen and its
  mock store are unchanged.
- **FR-3 — Docs.** README, `conductor/product.md` and `conductor/tech-stack.md`
  describe the real Order History statuses and the remaining mock operator
  queue accurately.
- **FR-4 — Live proof.** `scripts/verify-fulfilment-history.sh` drives the real
  stack — checkout → authorization → fulfilment `simulate-next` (success and
  forced failure) → order-service status — and asserts `dispatched` /
  `dispatch_failed` on `GET /orders`.

## Non-Functional Requirements

- No backend contract change; `OrderResponse` is unchanged (no tracking number
  in Order History).
- No new dependencies; existing gshop build/lint/test/coverage commands stay
  green.

## Acceptance Criteria

- Order History tests cover both terminal statuses and no longer reference the
  prototype preview.
- The live script passes against `gluon-local` and leaves demo history clean.
- Full gshop suite, lint, build and coverage pass.

## Out of Scope

- Wiring the operator Fulfilment screen to fulfilment-service's operator REST.
- Showing tracking number/carrier in Order History (needs an order-service
  contract change; recorded as a debt candidate).
- Any payment capture (Journey 4) or authorization-expiry (Journey 5) work.
