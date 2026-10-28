# Plan: Journey 3 prototype — order processing UI

## Phase 1: Mock fulfilment store + status formatting

- [ ] Task: Write failing tests for `fulfilmentStore` — seed states; transitions PENDING→PICKING→PACKED→DISPATCHED and →DISPATCH_FAILED persist; terminal states reject transitions; reset restores the seed; corrupt storage falls back (Red)
- [ ] Task: Implement `fulfilmentStore.ts`, `FULFILMENT_MOCK_ENABLED` (default true) and dispatched/dispatch_failed formatting (Green)
- [ ] Task: Refactor, tests green
- [ ] Task: Conductor - User Manual Verification 'Mock store + status formatting' (Protocol in workflow.md)

## Phase 2: Fulfilment screen + Admin entry

- [ ] Task: Write failing `Fulfilment.test.tsx` — queue renders every state, Start picking/Mark packed work, Dispatch validates trackingNo+carrier, Report problem requires a reason, terminal cards show the outcome and no actions, Reset restores the seed (Red)
- [ ] Task: Implement `src/screens/Fulfilment/Fulfilment.tsx` + CSS and the Admin entry link (Green)
- [ ] Task: Wire the screen into `App.tsx`'s view union
- [ ] Task: Refactor, tests green
- [ ] Task: Conductor - User Manual Verification 'Fulfilment screen' (Protocol in workflow.md)

## Phase 3: Order History preview

- [ ] Task: Write failing `OrderHistory` tests — with the flag on, a Dispatched sample card shows tracking/carrier and a Dispatch failed card shows the reason, marked as a prototype preview; with the flag off neither appears (Red)
- [ ] Task: Implement the preview section reusing the order-card styling (Green)
- [ ] Task: Refactor, tests green
- [ ] Task: Conductor - User Manual Verification 'Order History preview' (Protocol in workflow.md)

## Phase 4: Docs + full suite + review handoff

- [ ] Task: Update README/tech-stack/product for the prototype flag, queue and preview
- [ ] Task: Add `scripts/verify-fulfilment-prototype.sh` (build/lint/test/coverage) and run it
- [ ] Task: Hand the dev server URL with a walkthrough and **stop for the user's manual approval**
- [ ] Task: Conductor - User Manual Verification 'Journey 3 prototype review' (Protocol in workflow.md) — waiting on the user; fulfilment-service work does not start until sign-off

## Risks / notes

- The queue is independent of order-service (no list-all API); seeded items use catalog-like watch names/prices.
- Flag-gated preview avoids polluting real Order History later; default on until fulfilment-service lands.
- Terminal-state transitions are rejected in the store as well as hidden in the UI.
- Existing checkout/auth/order flows are untouched.
