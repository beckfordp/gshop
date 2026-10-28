# Plan: US-16.5 prototype — signup/login UI for manual review

## Phase 1: Mock auth + validation

- [x] Task: Write failing `mockAuth.test.ts` — signup creates a user + fake token (password stored only as a SHA-256 hash), duplicate email rejected, login succeeds for the right password and rejects unknown email/wrong password with one generic message, sign out clears the session, session survives a reload (localStorage) (Red) `bb931ca`
- [x] Task: Implement `src/services/mockAuth.ts` + `authTypes.ts` behind `AUTH_MOCK_ENABLED` (default on until user-service lands) (Green) `bb931ca`
- [x] Task: Write failing validation tests (email format, password ≥ 8, confirm match) and implement `authValidation.ts` (Red → Green) `bb931ca`
- [x] Task: Refactor, tests green `bb931ca`
- [ ] Task: Conductor - User Manual Verification 'Mock auth + validation' (Protocol in workflow.md)

## Phase 2: Auth screen

- [x] Task: Write failing `Auth.test.tsx` — Sign in / Create account toggle, validation and focus handling, aria-live form error, submitting state, back returns to checkout, success calls `onAuthenticated` (Red) `bb931ca`
- [x] Task: Implement `src/screens/Auth/Auth.tsx` + `Auth.css` in the boutique design language (Green) `bb931ca`
- [x] Task: Refactor, tests green `bb931ca`
- [ ] Task: Conductor - User Manual Verification 'Auth screen' (Protocol in workflow.md)

## Phase 3: Checkout + Order History identity

- [x] Task: Write failing tests — Checkout shows "Sign in / Create account" when signed out and the email + Sign out when signed in; opening Auth and returning preserves the checkout form; signed-in submit sends the mock `userId` as `customerId`, signed-out sends the anonymous id; Order History lists with the signed-in id (Red) `bb931ca`
- [x] Task: Implement the Checkout auth state/identity wiring and the Order History identity fallback (Green) `bb931ca`
- [x] Task: Refactor, tests green `bb931ca`
- [ ] Task: Conductor - User Manual Verification 'Checkout + Order History identity' (Protocol in workflow.md)

## Phase 4: Docs + full suite + review handoff

- [x] Task: Update `README.md`, `conductor/tech-stack.md`, `conductor/product.md` — dev-only auth mock, replaced when user-service lands `bb931ca`
- [x] Task: Add `scripts/verify-auth-prototype.sh` (build/lint/test/coverage) and run it `bb931ca`
- [x] Task: Start the dev server and hand the user the URL with a walkthrough (signup → checkout → history → sign out → login) `bb931ca`
- [ ] Task: Conductor - User Manual Verification 'Manual UI review' (Protocol in workflow.md) — **waiting on the user**: dev server at http://localhost:5173; backend work does not start until sign-off

## Risks / notes

- Auth remains local to Checkout (a local view state) rather than an App-level route, so checkout values survive the round trip; this is prototype-only and can become a route when the real flow lands.
- `crypto.subtle` is async; the mock auth API is promise-based to match the real client shape, and tests await it.
- Mock user/token live in localStorage under `gshop:authUser`/`gshop:authToken`, wiped on sign out; no password is ever sent or logged.
- The two new PLAN checklist items map to this track's Phase 4 review handoff.
