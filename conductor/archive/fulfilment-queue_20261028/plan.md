# Plan: Real fulfilment queue (gshop)

## Phase 1: Fulfilment API client

- [x] Task: Write failing `src/services/fulfilmentClient.test.ts` — listTasks GET, the four POST actions with correct paths/bodies, and 400/404/409 mapping to `FulfilmentClientError` (Red) `1f9c7d5`
- [x] Task: Implement `src/services/fulfilmentClient.ts` — real `TaskResponse` types, `listTasks`/`startPicking`/`pack`/`dispatch`/`fail` via `serverErrorMessage` (Green) `1f9c7d5`
- [x] Task: Refactor, full suite green — reused `lib/format.ts`'s `errorMessage`, 244 tests pass `1f9c7d5`
- [x] Task: Conductor - User Manual Verification 'Fulfilment API client' (Protocol in workflow.md) — 9 client tests green `1f9c7d5`

## Phase 2: Screen wired to the real queue

- [x] Task: Rewrite `src/screens/Fulfilment/Fulfilment.test.tsx` against a mocked client — state badges, transition flow, dispatch/reason validation, server-error alert, refresh, empty state, back-to-Admin (Red) `cb4f863`
- [x] Task: Rewrite `Fulfilment.tsx` — load on mount, action calls with per-card busy state, ship-to line, computed total, Refresh button, empty state; drop "Reset demo queue" and mock copy (Green) `cb4f863`
- [x] Task: Delete `fulfilmentStore.ts` + test; remove dead `FULFILMENT_MOCK_ENABLED`, add `FULFILMENT_SERVICE_URL` to `env.ts`; add the var to local `.env` `1f9c7d5`
- [x] Task: Refactor, suite + lint green — `tsc -b`, eslint and 244 tests clean `cb4f863`
- [x] Task: Conductor - User Manual Verification 'Screen wired to the real queue' (Protocol in workflow.md) — 10 screen tests green `cb4f863`

## Phase 3: Docs + live proof

- [x] Task: Update `README.md` (backend table, env vars) and `conductor/tech-stack.md` local-dev env block `819f5fb`
- [x] Task: Add `scripts/verify-fulfilment-queue.sh` — port-forwards, approving-card checkout → PENDING task, drives start-picking/pack/dispatch/fail, polls order-service for `dispatched`|`confirmed` / `dispatch_failed`, cleans up — and run it against `gluon-local`: green `4350d7c`
- [x] Task: Glean entry: `gluon/CHANGELOG.md` (2026-10-28) + completed `US-17.7` line in `gluon/docs/user-stories.md` — gluon `f4350f8`, `99dd628`
- [x] Task: Run build/lint/test; hand over the dev-server URL for an optional browser click-through — `tsc -b`/lint/vitest clean; http://localhost:5173 restarted with the new env var
- [x] Task: Conductor - User Manual Verification 'Docs + live proof' (Protocol in workflow.md) — `verify-fulfilment-queue.sh` green against `gluon-local` `4350d7c`

## Risks / notes

- Queue is empty until an authorized order exists; the live script creates one.
- Real dispatch calls drive payment capture asynchronously (US-19) — poll,
  don't assume immediate `confirmed`.
- Mock seed data disappears; that is intended.
- The live script must clean up order/payment/fulfilment rows and release
  inventory, as existing verify scripts do.
- OrbStack restart dropped the Debezium connectors; re-register with
  `kubectl delete job debezium-connector-register -n gluon-local` then
  `kubectl apply -f infra/k8s/local-infra/debezium-connectors-register.yaml`
  before live verification.
