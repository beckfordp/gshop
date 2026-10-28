# Plan: US-17.6/18.5 — Order History dispatch statuses

## Phase 1: Real statuses in Order History

- [ ] Task: Write failing `OrderHistory` tests — a `dispatched` order renders `Status: Dispatched`, a `dispatch_failed` order renders `Status: Dispatch failed`; delete the two prototype-preview tests and the env mock (Red)
- [ ] Task: Remove the prototype preview from `OrderHistory.tsx` (imports, derived data, both JSX insertions); `fulfilmentStore` and the Fulfilment screen untouched (Green)
- [ ] Task: Refactor, full suite green
- [ ] Task: Conductor - User Manual Verification 'Real statuses in Order History' (Protocol in workflow.md)

## Phase 2: Docs + live proof

- [ ] Task: Update README, `conductor/product.md`, `conductor/tech-stack.md`; add the `gluon/CHANGELOG.md` entry
- [ ] Task: Add `scripts/verify-fulfilment-history.sh` — port-forwards, two throwaway orders, fulfilment `simulate-next` success/failure, poll order-service for both statuses, cleanup — and run it against `gluon-local`
- [ ] Task: Run build/lint/test/coverage; hand over the dev-server URL for an optional browser click-through
- [ ] Task: Conductor - User Manual Verification 'Docs + live proof' (Protocol in workflow.md)

## Risks / notes

- The live script deletes order rows but leaves payment rows behind (capture
  is Journey 4); a throwaway customer keeps real demo history clean.
- Fulfilment task creation is async off `PaymentAuthorized` — poll, don't
  assume.
- Removing the preview is a user-visible change to approved prototype output,
  intended once the backend landed.
