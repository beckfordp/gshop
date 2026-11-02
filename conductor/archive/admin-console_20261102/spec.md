# Specification: ADM-7/8 — real-wired admin console

## Overview

Replace the ADM-0 mock "Workflow demo" with an Operations console over the
real ADM-1..5 APIs. Folds in Journey 8's operator cancel UI.

## Functional Requirements

- `adminClient.ts`: `GET /admin/orders`, `GET /inventorys/order-reservations`,
  `GET`/`PATCH /reconciliations` on order/payment/fulfilment/inventory
  (merged newest first; a failing service is reported, not fatal), operator
  `PATCH /orders/{id}`, `POST /payments/authorizations/{id}/expire`,
  `GET /emails`, `GET /users/{id}` (404 → guest). Writes send
  `Authorization: Bearer <VITE_OPERATOR_TOKEN | dev-operator-token>`.
- `VITE_NOTIFICATION_SERVICE_URL`, `VITE_OPERATOR_TOKEN` in `env.ts`.
- Orders tab: order list; open reconciliation queue (include-resolved
  toggle, resolve with note); order detail with fulfilment state, ledger,
  flags, emails; `authorized` only → operator cancel / expire now, each
  confirmed; others show why not. Refresh re-reads (async fan-out).
- Customers tab: distinct order customers labelled by email or Guest; detail
  with orders and email history (status, recipient, expandable body).
- Remove the mock store (`workflowDemo.ts`).

## Non-Functional
- TDD; vitest, `tsc -b`, eslint, build green.

## Out of Scope
- Bulk cancel; customer search without orders; live demo script (ADM-9).
