# Specification: Checkout Journey 7 — gshop cancel polish

## Overview

US-21.5's core behaviour already exists: Cancel is enabled only for
`authorized` orders and the 409 is surfaced. This track adds the US-23 returns
pointer to the 409 copy, a cancelled-status exclusion test, and brings the
admin mock's reservation statuses in line with inventory's new `shipped`
state.

## Functional Requirements

- 409 copy: server message plus a pointer that a shipped order is handled by
  returns (US-23); do not imply a returns UI exists.
- Add a cancelled-status test alongside the dispatched exclusion test: no
  Cancel action and `Status: Cancelled` rendered.
- `DemoReservationStatus` gains `shipped`; the admin ledger renders it and the
  CSS badge group covers it. No operator UI (deferred to ADM-7).
- No Authorization header or customer-auth change.

## Acceptance Criteria

- Component tests cover the new 409 copy and the cancelled status.
- Mock/store tests pass with the widened union; build/lint green.
- `npm test` (or the repo's test script) green.

## Out of Scope

Real admin wiring (ADM-7), operator identity, customer auth.
