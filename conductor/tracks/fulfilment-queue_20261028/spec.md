# Spec: Real fulfilment queue (gshop)

## Overview

gshop's Admin → "Open order processing" screen is a localStorage prototype
(`src/services/fulfilmentStore.ts`: seeded `FUL-1001…`, "Mock data only").
`fulfilment-service` now exists (US-17/18, deployed 2026-10-28) with a real
operator API. This track replaces the mock with the real service so the
operator screen lists and drives actual orders.

Decisions taken during planning: show the ship-to address (the API carries no
customer identity); manual refresh (fetch on mount and after actions, plus a
Refresh button) rather than polling.

## Functional Requirements

- The screen lists all fulfilment tasks from `GET /fulfilment-tasks`.
- Each card shows order id, state badge, ship-to address, items and computed
  total, and dispatch outcome/failure reason where present.
- Operator actions map 1:1 to the real endpoints: Start picking
  (`start-picking`), Mark packed (`pack`), Dispatch (`dispatch` with tracking
  number + carrier), Report problem (`fail` with reason).
- A successful action updates the card from the returned task; "Refresh"
  refetches the list.
- Server errors (400/404/409) surface in the existing alert banner with the
  server's `error` message; buttons are disabled while a call is in flight.
- Empty queue shows a short explanatory state.
- Local dev config: `VITE_FULFILMENT_SERVICE_URL` (cluster DNS in `.env`).

## Non-Functional Requirements

- Reuse `serverErrorMessage` (src/services/httpError.ts) and the existing
  client conventions from `orderClient.ts`.
- No localStorage persistence for tasks; no dead feature flags.
- Tests via vitest + Testing Library; suite and lint stay green.

## Acceptance Criteria

- `src/services/fulfilmentClient.ts` covers list/start-picking/pack/dispatch/
  fail, with typed errors and unit tests.
- `Fulfilment.tsx` renders real tasks, drives transitions, refreshes, shows
  loading/empty/error states; screen tests mock the client.
- `fulfilmentStore.ts` and its test are deleted; `FULFILMENT_MOCK_ENABLED` is
  removed; `.env` + README + tech-stack document the new URL var.
- `scripts/verify-fulfilment-queue.sh` proves the flow against `gluon-local`:
  authorized order → PENDING task → PICKING → PACKED → DISPATCHED, with
  order-service reaching `dispatched`/`confirmed`, and cleans up.
- Gluon `CHANGELOG.md` entry and a completed `US-17.7` task line.

## Out of Scope

- Customer identity in the fulfilment API (needs a fulfilment-service change;
  PaymentAuthorized carries none).
- Polling/websockets for live queue updates.
- Dispatch simulation controls in gshop (dev-only `simulate-next` stays out).
- Journey 4 / payment capture UI changes.
