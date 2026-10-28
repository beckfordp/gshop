# Specification: US-16.5 prototype — signup/login UI for manual review

## Overview

Checkout Journey 2's backend (user-service) does not exist yet. This track
adds the gshop signup/login experience as a clickable, mock-backed prototype
so the UX can be signed off before the service is built — the same
"prototype, review, then wire the real contract" flow used for Checkout
Journey 1. No network calls; nothing leaves the browser.

## Functional Requirements

- **FR-1 — Separate auth screen.** Checkout gains a "Sign in / Create
  account" entry point that opens a dedicated Auth screen; Back returns to
  the checkout form with its values preserved. The screen toggles between
  Sign in and Create account.
- **FR-2 — Realistic validation.** Email format, password ≥ 8 characters,
  confirm-password match on signup; inline field errors, an aria-live
  form-level error, disabled submit while submitting, and focus moved to the
  first invalid field.
- **FR-3 — Working mock auth.** A `VITE_AUTH_MOCK` module stores a mock user
  (`userId`, email, password hash) in localStorage; signup rejects an
  existing email, login rejects unknown email/wrong password with the same
  generic message; both mint a fake token. Sign out clears the session.
- **FR-4 — Identity.** When signed in, Checkout shows the email and sends
  the mock `userId` as `customerId`; signed out keeps today's anonymous id.
  Order History lists the signed-in user's orders, falling back to the
  anonymous id when signed out.
- **FR-5 — Reviewable states.** Signed-out, signing-in, signup, field
  errors, form error, submitting, signed-in, and signed-out-again are all
  reachable by hand.
- **FR-6 — Docs.** README/tech-stack/product note the dev-only mock flag and
  that it is replaced when user-service lands.

## Non-Functional Requirements

- No real network calls, no token or password sent anywhere; mock password
  stored only as a SHA-256 hash in localStorage, clearly prototype-only.
- Existing checkout/cart/order flows unchanged when signed out.
- Lint/build/`npm test` green; >80% coverage on touched modules.

## Acceptance Criteria

- The full signup → signed-in checkout → order history → sign out loop works
  in the browser with no backend.
- All validation and mock-auth error states are reachable and covered by
  tests.
- Manual review: the user walks the flows and signs off (or requests
  changes) before the Journey 2 backend work starts.

## Out of Scope

- Real user-service, tokens sent to any API, JWT/refresh-token handling,
  password reset, email verification.
- Auth on screens other than Checkout/Order History entry.
- Any user-service, notification-service or Kafka work.
