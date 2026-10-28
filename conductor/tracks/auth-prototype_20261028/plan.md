# Plan: US-16.5 prototype — signup/login UI for manual review

## Phase 1: Mock auth + validation

- [ ] Task: Write failing `mockAuth.test.ts` — signup creates a user + fake token (password stored only as a SHA-256 hash), duplicate email rejected, login succeeds for the right password and rejects unknown email/wrong password with one generic message, sign out clears the session, session survives a reload (localStorage) (Red)
- [ ] Task: Implement `src/services/mockAuth.ts` + `authTypes.ts` behind `AUTH_MOCK_ENABLED` (default on until user-service lands) (Green)
- [ ] Task: Write failing validation tests (email format, password ≥ 8, confirm match) and implement `authValidation.ts` (Red → Green)
- [ ] Task: Refactor, tests green
- [ ] Task: Conductor - User Manual Verification 'Mock auth + validation' (Protocol in workflow.md)

## Phase 2: Auth screen

- [ ] Task: Write failing `Auth.test.tsx` — Sign in / Create account toggle, validation and focus handling, aria-live form error, submitting state, back returns to checkout, success calls `onAuthenticated` (Red)
- [ ] Task: Implement `src/screens/Auth/Auth.tsx` + `Auth.css` in the boutique design language (Green)
- [ ] Task: Refactor, tests green
- [ ] Task: Conductor - User Manual Verification 'Auth screen' (Protocol in workflow.md)

## Phase 3: Checkout + Order History identity

- [ ] Task: Write failing tests — Checkout shows "Sign in / Create account" when signed out and the email + Sign out when signed in; opening Auth and returning preserves the checkout form; signed-in submit sends the mock `userId` as `customerId`, signed-out sends the anonymous id; Order History lists with the signed-in id (Red)
- [ ] Task: Implement the Checkout auth state/identity wiring and the Order History identity fallback (Green)
- [ ] Task: Refactor, tests green
- [ ] Task: Conductor - User Manual Verification 'Checkout + Order History identity' (Protocol in workflow.md)

## Phase 4: Docs + full suite + review handoff

- [ ] Task: Update `README.md`, `conductor/tech-stack.md`, `conductor/product.md` — dev-only auth mock, replaced when user-service lands
- [ ] Task: Add `scripts/verify-auth-prototype.sh` (build/lint/test/coverage) and run it
- [ ] Task: Start the dev server and hand the user the URL with a walkthrough (signup → checkout → history → sign out → login)
- [ ] Task: Conductor - User Manual Verification 'Manual UI review' (Protocol in workflow.md) — **stop here for the user's review**; backend work does not start until sign-off

## Risks / notes

- Auth remains local to Checkout (a local view state) rather than an App-level route, so checkout values survive the round trip; this is prototype-only and can become a route when the real flow lands.
- `crypto.subtle` is async; the mock auth API is promise-based to match the real client shape, and tests await it.
- Mock user/token live in localStorage under `gshop:authUser`/`gshop:authToken`, wiped on sign out; no password is ever sent or logged.
- The two new PLAN checklist items map to this track's Phase 4 review handoff.
