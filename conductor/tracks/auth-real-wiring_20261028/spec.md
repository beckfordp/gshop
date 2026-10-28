# Specification: US-16.5 — real auth wiring

## Overview

The approved signup/login UI currently talks to the in-browser mock.
user-service is live, so gshop switches to the real `/auth` contracts while
keeping the same banner/modal UX. Login gains `userId` (needed for order
identity), the mock becomes opt-in, and the session/address behaviour stays as
reviewed.

## Functional Requirements

- **FR-1 — Login contract.** user-service's `POST /auth/login` returns
  `200 {userId, token, refreshToken}`; `system-design.md` and tests/live script
  updated.
- **FR-2 — Real client.** New `userClient` (`signup`, `login`) with typed
  errors carrying status + the server's `error`; `VITE_USER_SERVICE_URL`
  support.
- **FR-3 — Mode.** `AUTH_MOCK_ENABLED` becomes opt-in (`VITE_AUTH_MOCK=true`);
  real user-service is the default. Mock keeps working for offline UX.
- **FR-4 — UI unchanged.** Auth modal/banner use a gateway that selects real or
  mock; 409/401/400 map to the existing messages; submit/validation behaviour
  unchanged.
- **FR-5 — Identity.** Session persists in localStorage
  (`gshop:authSession`); a local identity registry records `userId → email` on
  both real and mock auth so Order History badges show **User** for the
  signed-in user's orders and **Anonymous** otherwise. Checkout keeps using the
  session's `userId` as `customerId`; saved addresses stay keyed by it.
- **FR-6 — Docs.** README/tech-stack/product reflect real default + mock
  opt-in and the login userId addition.
- **FR-7 — Live proof.** Against the cluster: signup, sign out, login, and a
  checkout that uses the real userId; the signup also produces the
  notification-service welcome log.

## Non-Functional Requirements

- No new dependencies; tokens/passwords never logged.
- Existing UI tests updated to the gateway; build/lint/test/coverage green.

## Acceptance Criteria

- Same approved UI, now backed by user-service; mocked mode still selectable.
- Login yields userId; order history and checkout identity use it.
- Live signup → welcome-email and login paths verified.

## Out of Scope

- Refresh/logout endpoints server-side, address storage in user-service, admin
  all-orders listing, JWT.
