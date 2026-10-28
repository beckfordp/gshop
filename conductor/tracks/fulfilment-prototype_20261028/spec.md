# Specification: Journey 3 prototype — order processing UI

## Overview

fulfilment-service doesn't exist yet. This track adds a clickable operator UI in
gshop that walks the pick/pack/dispatch lifecycle against a seeded,
localStorage-persisted mock queue, plus a customer-facing preview of
Dispatched/Dispatch-failed statuses — so the Journey 3 UX can be approved
before backend work starts.

## Functional Requirements

- **FR-1 — Fulfilment screen.** A new screen reached from an Admin entry
  ("Fulfilment — order processing"), listing the queue with order id, customer
  (email or anonymous), items, total, and a state badge.
- **FR-2 — Full state machine.** `PENDING → PICKING → PACKED → DISPATCHED`,
  plus `DISPATCH_FAILED` from any non-terminal state. Actions: Start picking,
  Mark packed, Dispatch (trackingNo + carrier, validated), Report problem
  (reason, validated). Terminal states show tracking/carrier or the failure
  reason and cannot transition.
- **FR-3 — Mock store.** Seeded sample orders, persisted under
  `gshop:fulfilmentQueue`; a Reset demo queue action restores the seed.
  Flag-gated (`VITE_FULFILMENT_MOCK`, default on until the backend lands).
- **FR-4 — Order History preview.** When the flag is on, Order History shows
  two customer-facing sample cards: **Dispatched** with tracking/carrier, and
  **Dispatch failed** with the reason, clearly marked as a prototype preview.
- **FR-5 — Status formatting.** `dispatched`/`dispatch_failed` render as
  "Dispatched"/"Dispatch failed" everywhere.
- **FR-6 — Reviewable states.** Every state and both terminal outcomes are
  reachable by hand; validation errors are inline/aria-live; actions disable
  while persisting.

## Non-Functional Requirements

- No backend calls for the prototype queue; no new dependencies.
- The boutique design language and accessibility conventions are reused.
- Build/lint/tests/coverage green.

## Acceptance Criteria

- The operator queue can be driven through success and failure paths and
  survives reload; reset works.
- Order History shows both prototype statuses clearly.
- Manual review approved by the user before fulfilment-service work starts.

## Out of Scope

- Real fulfilment-service, Kafka events, order/payment/notification changes,
  auth on the operator screen, inventory interactions.
