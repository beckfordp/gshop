# Plan: US-19.5 — Order History payment capture statuses

## Phase 1: Capture statuses in Order History

- [ ] Task: Extend the `OrderHistory` status test with `confirmed` → "Confirmed" and `payment_failed` → "Payment failed", and assert a capture-failed order still shows its items and total. The rendering is already generic (`formatStatus`), so this is a characterisation test — expect green; only change production code if it exposes a real gap
- [ ] Task: Refactor if needed, full suite green
- [ ] Task: Conductor - User Manual Verification 'Capture statuses in Order History' (Protocol in workflow.md)

## Phase 2: Docs + live proof

- [ ] Task: Update README, `conductor/product.md`, `conductor/tech-stack.md`; add the `gluon/CHANGELOG.md` entry
- [ ] Task: Add `scripts/verify-capture-history.sh` — port-forwards, an approving-card order and a capture-decline-card (`5555 5555 5555 4444`) order, drive both to `DISPATCHED`, poll order-service for `confirmed` / `payment_failed`, clean up order/payment/fulfilment rows — and run it against `gluon-local`
- [ ] Task: Run build/lint/test/coverage; hand over the dev-server URL for an optional browser click-through
- [ ] Task: Conductor - User Manual Verification 'Docs + live proof' (Protocol in workflow.md) — `verify-capture-history.sh` green against the real cluster

## Risks / notes

- No production change is expected: `OrderStatus` already includes `confirmed`
  / `payment_failed` and `formatStatus` renders them. The track locks the
  contract with tests plus live proof.
- Capture is asynchronous: dispatch → payment-service capture → `PaymentCaptured`
  → order-service status. Poll with a bounded timeout, don't assume.
- The decline card authorizes successfully but fails at capture — the only way
  to reach `payment_failed` after dispatch.
- Cleanup must remove payment and fulfilment rows as well as order rows, so the
  demo history stays clean.
