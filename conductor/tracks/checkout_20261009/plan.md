# Plan: US-3 Checkout

## Phase 1: orderClient [checkpoint: 16426b8]
- [x] Task: Write failing tests for `orderClient.create()` in `src/services/orderClient.test.ts` — covers request shape/body, response parsing, `OrderClientError` on non-2xx/network failure (Red) [741f81b]
- [x] Task: Implement `orderClient.create()` against order-service's real `POST /orders` contract — minimum code to pass (Green) [a524b62]
- [x] Task: Refactor; rerun tests — no refactor needed, implementation already minimal and reuses errorMessage() from src/lib/format.ts; full suite (41/41) + lint re-confirmed green
- [x] Task: Conductor - User Manual Verification 'orderClient' (Protocol in workflow.md) — prompting off, verified via `scripts/verify-checkout-phase1.sh`

## Phase 2: Checkout button (Cart screen) [checkpoint: 2bbedb6]
- [x] Task: Write failing tests for Cart's "Checkout" button in `Cart.test.tsx` — covers: blocked submission when a line has no resolved price, waiting state while in flight, success calls the parent's callback with the order + clears `gshop:cartId`, `reservation_failed` shows inline error+Retry and stays on Cart, request error shows error+Retry (Red) [85250fc]
- [x] Task: Implement the button in `Cart.tsx` (new `onCheckoutSuccess` prop) — minimum code to pass (Green) [874c918]
- [x] Task: Refactor; rerun tests — extracted `CartProps` interface for readability; full suite (47/47) + lint + build re-confirmed green [49c1cbc]
- [x] Task: Conductor - User Manual Verification 'Checkout button' (Protocol in workflow.md) — prompting off, verified via real browser click against live order-service (new Vite dev proxy, same CORS workaround pattern): got a genuine `reservation_failed` response (inventory-service has no seeded stock — confirmed via GET /inventory/<sku> 404, noted in gluon's backlogs/inventory-service.md), correctly showed "Some items are out of stock." + Retry, cart id preserved, no console errors

## Phase 3: Checkout screen [checkpoint: 6293f5e]
- [x] Task: Write failing tests for `Checkout.tsx` in `src/screens/Checkout/Checkout.test.tsx` — covers: renders the passed-in order's id/status/items/total, "Continue Shopping" button (Red) [087b1f7]
- [x] Task: Implement `Checkout.tsx` + `Checkout.css` — minimum code to pass (Green) [aa9f62b]
- [x] Task: Refactor; rerun tests — no refactor needed, implementation already minimal; full suite (50/50) + lint re-confirmed green
- [x] Task: Conductor - User Manual Verification 'Checkout screen' (Protocol in workflow.md) — prompting off, verified via `scripts/verify-checkout-phase3.sh`; live browser click-through deferred to Phase 4 (screen not reachable in the app until nav is wired)

## Phase 4: Navigation wiring
- [x] Task: Write failing tests for `App.tsx`'s Checkout-screen wiring in `App.test.tsx` — covers: Cart's success callback switches to the Checkout screen with the order, "Continue Shopping" returns to Catalog (Red) [fe78325]
- [x] Task: Implement the wiring in `App.tsx` (`screen: 'catalog' | 'cart' | 'checkout'`, `lastOrder` state) — minimum code to pass (Green) [f87ca32]
- [ ] Task: Refactor; rerun full test suite; check coverage (>80% target)
- [ ] Task: Conductor - User Manual Verification 'Navigation wiring' (Protocol in workflow.md)
