# Plan: US-16.5 — real auth wiring

## Phase 1: user-service login contract

- [x] Task: Add failing `AuthRoutesSuite` assertion that login returns `{userId, token, refreshToken}` matching the signup's user; implement the `userId` field; update `system-design.md` and extend the live script (Red → Green) `b1e81c4`
- [x] Task: `sbt scalafmtCheck test`; rebuild/redeploy user-service; rerun `verify-auth.sh` `672b2b8` (verify-auth.sh green)
- [x] Task: Conductor - User Manual Verification 'user-service login contract' (Protocol in workflow.md) `672b2b8`

## Phase 2: gshop real client + identity registry

- [x] Task: Write failing `userClient.test.ts` — signup 201/login 200 parse `{userId, token, refreshToken}`, 400/401/409 surface the server `error` with status, network failure typed (Red) `b1e81c4`
- [x] Task: Implement `userClient.ts`, `VITE_USER_SERVICE_URL`, and an `identityStore` (`gshop:knownIdentities`) recording `userId → email` (the mock also records it); `resolveIdentity` checks the registry before mock users (Green) `b1e81c4`
- [x] Task: Add an `authGateway` selecting real vs mock from `AUTH_MOCK_ENABLED` (now `VITE_AUTH_MOCK === 'true'`, real default) with tests (Green) `b1e81c4`
- [x] Task: Refactor, tests green `b1e81c4`
- [x] Task: Conductor - User Manual Verification 'Real client + identity registry' (Protocol in workflow.md) `b1e81c4`

## Phase 3: UI wiring

- [x] Task: Write failing tests — Auth submits through the gateway (409/401/400 messages), Checkout/OrderHistory use the session userId and identity registry (Red) `b1e81c4`
- [x] Task: Swap `Auth.tsx`/`Checkout`/`OrderHistory` onto the gateway + registry, leaving all approved UI behaviour unchanged (Green) `b1e81c4`
- [x] Task: Refactor, full suite green `b1e81c4`
- [x] Task: Conductor - User Manual Verification 'UI wiring' (Protocol in workflow.md) `b1e81c4`

## Phase 4: Docs + live proof

- [x] Task: Update README/tech-stack/product; add `.env` `VITE_USER_SERVICE_URL` and document real-default/mock opt-in `b1e81c4`
- [x] Task: Start the dev server against the cluster; run `scripts/verify-auth-real.sh` (signup via the app's real client, welcome log in notification-service, login, checkout stores the userId) and hand over for a browser click-through `b1e81c4`
- [x] Task: Conductor - User Manual Verification 'Docs + live proof' (Protocol in workflow.md) `b1e81c4`

## Risks / notes

- Tokens live in localStorage (demo convention); never logged. No refresh endpoint yet, so a refreshToken is stored but unused.
- "User" badges rely on a per-browser identity registry; cross-browser identities remain anonymous until the order contract carries `userId` (existing follow-up).
- The approved UI and its accessibility behaviour are unchanged; only the data source moves.
