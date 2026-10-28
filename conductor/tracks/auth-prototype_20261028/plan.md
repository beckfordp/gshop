# Plan: US-16.5 prototype — signup/login UI for manual review

## Phase 1: Mock auth + validation

- [x] Task: Write failing `mockAuth.test.ts` — signup creates a user + fake token (password stored only as a SHA-256 hash), duplicate email rejected, login succeeds for the right password and rejects unknown email/wrong password with one generic message, sign out clears the session, session survives a reload (localStorage) (Red) `bb931ca`
- [x] Task: Implement `src/services/mockAuth.ts` + `authTypes.ts` behind `AUTH_MOCK_ENABLED` (default on until user-service lands) (Green) `bb931ca`
- [x] Task: Write failing validation tests (email format, password ≥ 8, confirm match) and implement `authValidation.ts` (Red → Green) `bb931ca`
- [x] Task: Refactor, tests green `bb931ca`
- [x] Task: Conductor - User Manual Verification 'Mock auth + validation' (Protocol in workflow.md) — `scripts/verify-auth-prototype.sh` green

## Phase 2: Auth screen

- [x] Task: Write failing `Auth.test.tsx` — Sign in / Create account toggle, validation and focus handling, aria-live form error, submitting state, back returns to checkout, success calls `onAuthenticated` (Red) `bb931ca`
- [x] Task: Implement `src/screens/Auth/Auth.tsx` + `Auth.css` in the boutique design language (Green) `bb931ca`
- [x] Task: Refactor, tests green `bb931ca`
- [x] Task: Conductor - User Manual Verification 'Auth screen' (Protocol in workflow.md) — `scripts/verify-auth-prototype.sh` green

## Phase 3: Checkout + Order History identity

- [x] Task: Write failing tests — Checkout shows "Sign in / Create account" when signed out and the email + Sign out when signed in; opening Auth and returning preserves the checkout form; signed-in submit sends the mock `userId` as `customerId`, signed-out sends the anonymous id; Order History lists with the signed-in id (Red) `bb931ca`
- [x] Task: Implement the Checkout auth state/identity wiring and the Order History identity fallback (Green) `bb931ca`
- [x] Task: Refactor, tests green `bb931ca`
- [x] Task: Conductor - User Manual Verification 'Checkout + Order History identity' (Protocol in workflow.md) — `scripts/verify-auth-prototype.sh` green

## Phase 4: Docs + full suite + review handoff

- [x] Task: Update `README.md`, `conductor/tech-stack.md`, `conductor/product.md` — dev-only auth mock, replaced when user-service lands `bb931ca`
- [x] Task: Add `scripts/verify-auth-prototype.sh` (build/lint/test/coverage) and run it `bb931ca`
- [x] Task: Start the dev server and hand the user the URL with a walkthrough (signup → checkout → history → sign out → login) `bb931ca`
- [x] Task: Conductor - User Manual Verification 'Manual UI review' (Protocol in workflow.md) — **approved by the user 2026-10-28**; backend work may start

## Risks / notes

- Auth remains local to Checkout (a local view state) rather than an App-level route, so checkout values survive the round trip; this is prototype-only and can become a route when the real flow lands.
- `crypto.subtle` is async; the mock auth API is promise-based to match the real client shape, and tests await it.
- Mock users/session live in localStorage under `gshop:mockUsers`/`gshop:authSession`; sign out removes the session, and no password is ever sent or logged.
- The two new PLAN checklist items map to this track's Phase 4 review handoff.

## Phase 5: Review changes (2026-10-28)

- [x] Task: Prominence — accent-bordered auth banner at the top of Checkout: primary "Sign in" + secondary "Create account"; signed-in identity bar with email + Sign out (Red → Green) `b01912f`
- [x] Task: Presentation — auth becomes a modal dialog over Checkout (full-screen sheet on mobile): Esc/backdrop close, focus trap, return focus, `role="dialog"`/`aria-modal`; Auth gains `initialMode` and a Cancel close (Red → Green) `b01912f`
- [x] Task: Ownership — Order History gains a large identity header (signed-in email vs anonymous) and a prominent User/Anonymous badge per card, resolving ids through the mock users (`resolveIdentity`) (Red → Green) `b01912f`
- [x] Task: Admin copy clarifies that Clear history affects this browser's anonymous history; Admin all-orders listing deferred to a follow-up order-service track (no backend change here) `b01912f`
- [x] Task: Docs updated; full suite green `b01912f`
- [x] Task: Conductor - User Manual Verification 'Review changes' — **approved by the user 2026-10-28** (`b01912f`)

## Phase 6: Saved addresses (2026-10-28)

- [x] Task: Save a signed-in user's shipping/billing addresses + "same as shipping" after a successful checkout (`savedAddress.ts`, scoped by mock userId; card never stored) `3af7240`
- [x] Task: Prefill on checkout mount and after mid-checkout sign-in, without overwriting an address already being typed `3af7240`
- [x] Task: Tests for round-trip/corrupt storage, per-user scoping, mount prefill, post-checkout save, anonymous no-save, mid-sign-in prefill; docs updated `3af7240` (209 tests, 96.4% coverage)
- [x] Task: Conductor - User Manual Verification 'Saved addresses' — **approved by the user 2026-10-28** (`3af7240`)
