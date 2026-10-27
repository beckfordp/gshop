# Plan: US-11–US-14 real backend wiring

## Phase 1: Status-code result model (clients + gateway)

- [ ] Task: Write failing tests for `orderClient.create()` mapping the real `POST /orders` responses — 201 → `created` with the `authorized` order; 402 → `declined` with `paymentFailure.reason`; 409 → `stock_unavailable` with **every** `reservationFailures` entry; 400/503/500 → thrown `OrderClientError` carrying status and the body's `error`; non-JSON body → fallback message; network failure → `OrderClientError` (Red)
- [ ] Task: Write failing tests for `paymentClient.createMethod()` surfacing the server's `error` on 400 (Red)
- [ ] Task: Implement the discriminated `CreateOrderResult` in `orderClient.ts`, drop the stale `reservationFailure`/`paymentFailure` fields from `Order`, and parse error bodies in both clients (Green)
- [ ] Task: Write failing tests for `checkoutGateway.submit()` mapping the client result to `CheckoutResult` (`authorized`/`declined`/`stock_unavailable`, no order on failure) and propagating `CheckoutGatewayError` with the server message (Red)
- [ ] Task: Reshape `CheckoutResult`/`createHttpCheckoutGateway` to the ADR 0018 model (Green)
- [ ] Task: Refactor, keep tests green
- [ ] Task: Conductor - User Manual Verification 'Status-code result model' (Protocol in workflow.md)

## Phase 2: Checkout form failure handling

- [ ] Task: Write failing `Checkout.test.tsx` tests — 201 clears cart and calls `onOrderPlaced`; 402 shows the reason inline, keeps typed values, resubmit re-invokes the gateway; 409 renders **every** failed line with its own Remove; removing one line calls `cartClient.removeItem` and leaves the others; no auto-resubmit; emptying all lines shows the empty state; `CheckoutGatewayError` (400/503/500) shows the server message and keeps the form (Red)
- [ ] Task: Implement the new failure model in `Checkout.tsx` + `Checkout.css` (multi-line failure list, per-line Remove, generic error) (Green)
- [ ] Task: Refactor, keep tests green
- [ ] Task: Conductor - User Manual Verification 'Checkout form failure handling' (Protocol in workflow.md)

## Phase 3: Mock parity + scenario control

- [ ] Task: Write failing `checkoutMock.test.ts` — every scenario returns the new result kinds; `items_unavailable` returns 2+ failed lines; `card_declined` → `declined`; `service_error` throws `CheckoutGatewayError`; no `Order` is fabricated on failure; no PAN in any returned value (Red)
- [ ] Task: Rewrite `checkoutMock.ts` (and the Checkout scenario-selector wiring if needed) to the new model, keeping it dev-only under `VITE_CHECKOUT_MOCK` (Green)
- [ ] Task: Refactor, keep tests green
- [ ] Task: Conductor - User Manual Verification 'Mock parity' (Protocol in workflow.md)

## Phase 4: Docs + full suite

- [ ] Task: Update `README.md`, `conductor/tech-stack.md`, `conductor/product.md` — status-code contract, retained dev-only mock, no-order-on-failure
- [ ] Task: Run full `npm test`, `npm run lint`, `npm run build`, `npm run test:coverage`; confirm green and >80%
- [ ] Task: Conductor - User Manual Verification 'Docs + full suite' (Protocol in workflow.md)

## Phase 5: Live end-to-end against local k8s

- [ ] Task: Redeploy order-service and payment-service from current `main` (`bin/k8s-local-up …`) and wait for rollout
- [ ] Task: Write and run `scripts/verify-checkout-real.sh` — through port-forwarded services: approve card → create payment method → `POST /orders` → 201 `authorized`; card `4000 0000 0000 0002` → 402; a known under-stocked sku → 409 listing every failed line; invalid `paymentMethodId` → 400; assert Order History unchanged after each failure and clean up the successful order
- [ ] Task: Run gshop dev server against real services (`npm run dev` with `VITE_*_SERVICE_URL`s) and click through authorized / declined / stock-failure paths; confirm failures leave no Order History row
- [ ] Task: Check off US-11.2/12.2/13.3/14.4 and TD-7.4 in `gluon` docs; mark Journey 1 gshop rows done in `PLAN.md`
- [ ] Task: Conductor - User Manual Verification 'Live end-to-end' (Protocol in workflow.md)

## Risks / notes

- Removing `reservationFailure`/`paymentFailure` from `Order` touches OrderHistory/Admin tests — grep every usage before editing.
- A declined (402) resubmit mints a fresh PaymentMethod per attempt; fine until TD-10's authorize idempotency lands.
- The live script must use a throwaway customerId and delete its successful order, so the demo history stays clean.
- The mock stays opt-in (`VITE_CHECKOUT_MOCK=true`) and never ships as the default path.
