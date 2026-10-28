# Plan: Real fulfilment queue (gshop)

## Phase 1: Fulfilment API client

- [ ] Task: Write failing `src/services/fulfilmentClient.test.ts` — listTasks GET, the four POST actions with correct paths/bodies, and 400/404/409 mapping to `FulfilmentClientError` (Red)
- [ ] Task: Implement `src/services/fulfilmentClient.ts` — real `TaskResponse` types, `listTasks`/`startPicking`/`pack`/`dispatch`/`fail` via `serverErrorMessage` (Green)
- [ ] Task: Refactor, full suite green
- [ ] Task: Conductor - User Manual Verification 'Fulfilment API client' (Protocol in workflow.md)

## Phase 2: Screen wired to the real queue

- [ ] Task: Rewrite `src/screens/Fulfilment/Fulfilment.test.tsx` against a mocked client — state badges, transition flow, dispatch/reason validation, server-error alert, refresh, empty state, back-to-Admin (Red)
- [ ] Task: Rewrite `Fulfilment.tsx` — load on mount, action calls with per-card busy state, ship-to line, computed total, Refresh button, empty state; drop "Reset demo queue" and mock copy (Green)
- [ ] Task: Delete `fulfilmentStore.ts` + test; remove dead `FULFILMENT_MOCK_ENABLED`, add `FULFILMENT_SERVICE_URL` to `env.ts`; add the var to local `.env`
- [ ] Task: Refactor, suite + lint green
- [ ] Task: Conductor - User Manual Verification 'Screen wired to the real queue' (Protocol in workflow.md)

## Phase 3: Docs + live proof

- [ ] Task: Update `README.md` (backend table, env vars) and `conductor/tech-stack.md` local-dev env block
- [ ] Task: Add `scripts/verify-fulfilment-queue.sh` — port-forwards, approving-card checkout → PENDING task, drives start-picking/pack/dispatch, polls order-service for `dispatched`/`confirmed`, cleans up — and run it against `gluon-local`
- [ ] Task: Glean entry: `gluon/CHANGELOG.md` (2026-10-28) + completed `US-17.7` line in `gluon/docs/user-stories.md`
- [ ] Task: Run build/lint/test; hand over the dev-server URL for an optional browser click-through
- [ ] Task: Conductor - User Manual Verification 'Docs + live proof' (Protocol in workflow.md)

## Risks / notes

- Queue is empty until an authorized order exists; the live script creates one.
- Real dispatch calls drive payment capture asynchronously (US-19) — poll,
  don't assume immediate `confirmed`.
- Mock seed data disappears; that is intended.
- The live script must clean up order/payment/fulfilment rows and release
  inventory, as existing verify scripts do.
