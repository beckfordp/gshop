# Plan: US-16.5 — real auth wiring

## Phase 1: user-service login contract

- [ ] Task: Add failing `AuthRoutesSuite` assertion that login returns `{userId, token, refreshToken}` matching the signup's user; implement the `userId` field; update `system-design.md` and extend the live script (Red → Green)
- [ ] Task: `sbt scalafmtCheck test`; rebuild/redeploy user-service; rerun `verify-auth.sh`
- [ ] Task: Conductor - User Manual Verification 'user-service login contract' (Protocol in workflow.md)

## Phase 2: gshop real client + identity registry

- [ ] Task: Write failing `userClient.test.ts` — signup 201/login 200 parse `{userId, token, refreshToken}`, 400/401/409 surface the server `error` with status, network failure typed (Red)
- [ ] Task: Implement `userClient.ts`, `VITE_USER_SERVICE_URL`, and an `identityStore` (`gshop:knownIdentities`) recording `userId → email` (the mock also records it); `resolveIdentity` checks the registry before mock users (Green)
- [ ] Task: Add an `authGateway` selecting real vs mock from `AUTH_MOCK_ENABLED` (now `VITE_AUTH_MOCK === 'true'`, real default) with tests (Green)
- [ ] Task: Refactor, tests green
- [ ] Task: Conductor - User Manual Verification 'Real client + identity registry' (Protocol in workflow.md)

## Phase 3: UI wiring

- [ ] Task: Write failing tests — Auth submits through the gateway (409/401/400 messages), Checkout/OrderHistory use the session userId and identity registry (Red)
- [ ] Task: Swap `Auth.tsx`/`Checkout`/`OrderHistory` onto the gateway + registry, leaving all approved UI behaviour unchanged (Green)
- [ ] Task: Refactor, full suite green
- [ ] Task: Conductor - User Manual Verification 'UI wiring' (Protocol in workflow.md)

## Phase 4: Docs + live proof

- [ ] Task: Update README/tech-stack/product; add `.env` `VITE_USER_SERVICE_URL` and document real-default/mock opt-in
- [ ] Task: Start the dev server against the cluster; run `scripts/verify-auth-real.sh` (signup via the app's real client, welcome log in notification-service, login, checkout stores the userId) and hand over for a browser click-through
- [ ] Task: Conductor - User Manual Verification 'Docs + live proof' (Protocol in workflow.md)

## Risks / notes

- Tokens live in localStorage (demo convention); never logged. No refresh endpoint yet, so a refreshToken is stored but unused.
- "User" badges rely on a per-browser identity registry; cross-browser identities remain anonymous until the order contract carries `userId` (existing follow-up).
- The approved UI and its accessibility behaviour are unchanged; only the data source moves.
