# Plan: US-11–US-14 real backend wiring

## Phase 1: Status-code result model (clients + gateway)

- [x] Task: Write failing tests for `orderClient.create()` mapping the real `POST /orders` responses — 201 → `created` with the `authorized` order; 402 → `declined` with `paymentFailure.reason`; 409 → `stock_unavailable` with **every** `reservationFailures` entry; 400/503/500 → thrown `OrderClientError` carrying status and the body's `error`; non-JSON body → fallback message; network failure → `OrderClientError` (Red) `8e86c94`
- [x] Task: Write failing tests for `paymentClient.createMethod()` surfacing the server's `error` on 400 (Red) `8e86c94`
- [x] Task: Implement the discriminated `CreateOrderResult` in `orderClient.ts`, drop the stale `reservationFailure`/`paymentFailure` fields from `Order`, and parse error bodies in both clients (Green) `8e86c94`
- [x] Task: Write failing tests for `checkoutGateway.submit()` mapping the client result to `CheckoutResult` (`authorized`/`declined`/`stock_unavailable`, no order on failure) and propagating `CheckoutGatewayError` with the server message (Red) `8e86c94`
- [x] Task: Reshape `CheckoutResult`/`createHttpCheckoutGateway` to the ADR 0018 model (Green) `8e86c94`
- [x] Task: Refactor, keep tests green `8e86c94` (moved `CheckoutGatewayError` into `checkoutTypes.ts` so the mock can throw it without a circular import)
- [x] Task: Conductor - User Manual Verification 'Status-code result model' (Protocol in workflow.md) — `scripts/verify-checkout-real-wiring.sh`: build, lint, 159 tests, 96.88% statements green; the HTTP paths themselves are exercised live in Phase 5

## Phase 2: Checkout form failure handling

- [x] Task: Write failing `Checkout.test.tsx` tests — 201 clears cart and calls `onOrderPlaced`; 402 shows the reason inline, keeps typed values, resubmit re-invokes the gateway; 409 renders **every** failed line with its own Remove; removing one line calls `cartClient.removeItem` and leaves the others; no auto-resubmit; emptying all lines shows the empty state; `CheckoutGatewayError` (400/503/500) shows the server message and keeps the form (Red) `8e86c94`
- [x] Task: Implement the new failure model in `Checkout.tsx` + `Checkout.css` (multi-line failure list, per-line Remove, generic error) (Green) `8e86c94`
- [x] Task: Refactor, keep tests green `8e86c94` (reservation reason codes formatted for display; no other cleanup needed)
- [x] Task: Conductor - User Manual Verification 'Checkout form failure handling' (Protocol in workflow.md) — `scripts/verify-checkout-real-wiring.sh` green (13 Checkout tests)

## Phase 3: Mock parity + scenario control

- [x] Task: Write failing `checkoutMock.test.ts` — every scenario returns the new result kinds; `items_unavailable` returns 2+ failed lines; `card_declined` → `declined`; `service_error` throws `CheckoutGatewayError`; no `Order` is fabricated on failure; no PAN in any returned value (Red) `8e86c94`
- [x] Task: Rewrite `checkoutMock.ts` (and the Checkout scenario-selector wiring if needed) to the new model, keeping it dev-only under `VITE_CHECKOUT_MOCK` (Green) `8e86c94` (selector needed no change)
- [x] Task: Refactor, keep tests green `8e86c94` (extracted `failedLines`; mock at 100% statements/83.33% branches)
- [x] Task: Conductor - User Manual Verification 'Mock parity' (Protocol in workflow.md) — `scripts/verify-checkout-real-wiring.sh` green (11 mock tests)

## Phase 4: Docs + full suite

- [x] Task: Update `README.md`, `conductor/tech-stack.md`, `conductor/product.md` — status-code contract, retained dev-only mock, no-order-on-failure `5133d23`
- [x] Task: Run full `npm test`, `npm run lint`, `npm run build`, `npm run test:coverage`; confirm green and >80% `5133d23` (159/159 tests, 96.88% statements)
- [x] Task: Conductor - User Manual Verification 'Docs + full suite' (Protocol in workflow.md) — `scripts/verify-checkout-real-wiring.sh` committed and green

## Phase 5: Live end-to-end against local k8s

- [x] Task: Redeploy order-service and payment-service from current `main` (`bin/k8s-local-up …`) and wait for rollout `8ae1ae5` (also redeployed inventory-service — its pod predated TD-7.1/7.2's bulk-reserve endpoint, which surfaced as `503 Inventory service unavailable` on the first run)
- [x] Task: Write and run `scripts/verify-checkout-real.sh` — through port-forwarded services: approve card → create payment method → `POST /orders` → 201 `authorized`; card `4000 0000 0000 0002` → 402; a known under-stocked sku → 409 listing every failed line; invalid `paymentMethodId` → 400; assert Order History unchanged after each failure and clean up the successful order `8ae1ae5` (all four paths passed; successful order released + deleted)
- [x] Task: Run gshop dev server against real services (`npm run dev` with `VITE_*_SERVICE_URL`s) and click through authorized / declined / stock-failure paths; confirm failures leave no Order History row `8ae1ae5` — dev server restarted with `VITE_PAYMENT_SERVICE_URL`; host resolves the cluster DNS names directly (health 200 on catalog/payment/order). Browser click-through deferred to the user; the same real paths are asserted by the committed script
- [ ] Task: Check off US-11.2/12.2/13.3/14.4 and TD-7.4 in `gluon` docs; mark Journey 1 gshop rows done in `PLAN.md`
- [ ] Task: Conductor - User Manual Verification 'Live end-to-end' (Protocol in workflow.md)

## Risks / notes

- Removing `reservationFailure`/`paymentFailure` from `Order` touches OrderHistory/Admin tests — grep every usage before editing.
- A declined (402) resubmit mints a fresh PaymentMethod per attempt; fine until TD-10's authorize idempotency lands.
- The live script must use a throwaway customerId and delete its successful order, so the demo history stays clean.
- The mock stays opt-in (`VITE_CHECKOUT_MOCK=true`) and never ships as the default path.

## Phase: Review Fixes
- [x] Task: Apply review suggestions — extracted shared `serverErrorMessage` (orderClient/paymentClient dedupe), restored the 201-must-be-`authorized` guard (ADR 0018), and moved the live script's JSON files into a `mktemp -d` dir with clean port-forward teardown `1c47e13`

