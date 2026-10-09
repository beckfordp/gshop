# Plan: US-3 Checkout

## Phase 1: orderClient
- [x] Task: Write failing tests for `orderClient.create()` in `src/services/orderClient.test.ts` — covers request shape/body, response parsing, `OrderClientError` on non-2xx/network failure (Red) [741f81b]
- [x] Task: Implement `orderClient.create()` against order-service's real `POST /orders` contract — minimum code to pass (Green) [a524b62]
- [x] Task: Refactor; rerun tests — no refactor needed, implementation already minimal and reuses errorMessage() from src/lib/format.ts; full suite (41/41) + lint re-confirmed green
- [x] Task: Conductor - User Manual Verification 'orderClient' (Protocol in workflow.md) — prompting off, verified via `scripts/verify-checkout-phase1.sh`

## Phase 2: Checkout button (Cart screen)
- [ ] Task: Write failing tests for Cart's "Checkout" button in `Cart.test.tsx` — covers: blocked submission when a line has no resolved price, waiting state while in flight, success calls the parent's callback with the order + clears `gshop:cartId`, `reservation_failed` shows inline error+Retry and stays on Cart, request error shows error+Retry (Red)
- [ ] Task: Implement the button in `Cart.tsx` (new `onCheckoutSuccess` prop) — minimum code to pass (Green)
- [ ] Task: Refactor; rerun tests
- [ ] Task: Conductor - User Manual Verification 'Checkout button' (Protocol in workflow.md)

## Phase 3: Checkout screen
- [ ] Task: Write failing tests for `Checkout.tsx` in `src/screens/Checkout/Checkout.test.tsx` — covers: renders the passed-in order's id/status/items/total, "Continue Shopping" button (Red)
- [ ] Task: Implement `Checkout.tsx` + `Checkout.css` — minimum code to pass (Green)
- [ ] Task: Refactor; rerun tests
- [ ] Task: Conductor - User Manual Verification 'Checkout screen' (Protocol in workflow.md)

## Phase 4: Navigation wiring
- [ ] Task: Write failing tests for `App.tsx`'s Checkout-screen wiring in `App.test.tsx` — covers: Cart's success callback switches to the Checkout screen with the order, "Continue Shopping" returns to Catalog (Red)
- [ ] Task: Implement the wiring in `App.tsx` (`screen: 'catalog' | 'cart' | 'checkout'`, `lastOrder` state) — minimum code to pass (Green)
- [ ] Task: Refactor; rerun full test suite; check coverage (>80% target)
- [ ] Task: Conductor - User Manual Verification 'Navigation wiring' (Protocol in workflow.md)
