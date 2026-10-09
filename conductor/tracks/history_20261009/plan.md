# Plan: US-8 Order History

## Phase 1: customerId + orderClient.list() + Cart checkout update
- [x] Task: Write failing tests for `customerId.ts` in `src/services/customerId.test.ts` — covers: `getOrCreateCustomerId()` creates+persists a UUID when absent, returns the existing one when present (no new UUID generated); `getStoredCustomerId()` returns null when absent, the stored value otherwise (Red) [f3c7c14]
- [x] Task: Implement `src/services/customerId.ts` — minimum code to pass (Green) [fd7fd53]
- [x] Task: Write failing tests for `orderClient.list()` in `orderClient.test.ts` — covers request shape (GET /orders?customerId=...), response parsing, `OrderClientError` on non-2xx/network failure (Red) [73a8518]
- [x] Task: Implement `orderClient.list()` against order-service's real contract — minimum code to pass (Green) [13ffa70]
- [ ] Task: Update `Cart.test.tsx`'s checkout tests to expect `customerId` from `getOrCreateCustomerId()` instead of the cart id, then update `Cart.tsx`'s `handleCheckout` to match (Red → Green in one task, since it's a one-line source swap in an already-tested code path)
- [ ] Task: Refactor; rerun tests
- [ ] Task: Conductor - User Manual Verification 'customerId + orderClient.list()' (Protocol in workflow.md)

## Phase 2: Order History screen
- [ ] Task: Write failing tests for `OrderHistory.tsx` in `src/screens/OrderHistory/OrderHistory.test.tsx` — covers: empty state (no stored customerId, no API call), loading, renders past orders (id/status/items/total/date) newest-first, error+Retry (Red)
- [ ] Task: Implement `OrderHistory.tsx` + `.css` — minimum code to pass (Green)
- [ ] Task: Refactor; rerun tests
- [ ] Task: Conductor - User Manual Verification 'Order History screen' (Protocol in workflow.md)

## Phase 3: Navigation wiring
- [ ] Task: Write failing tests for `App.tsx`'s History screen + per-screen nav buttons in `App.test.tsx` — covers: "Order History" reachable from Catalog and Cart, History screen's own nav shows "Back to Catalog" and "View Cart" (Red)
- [ ] Task: Implement the wiring in `App.tsx` (`screen` widened to include `'history'`) — minimum code to pass (Green)
- [ ] Task: Refactor; rerun full test suite; check coverage (>80% target)
- [ ] Task: Conductor - User Manual Verification 'Navigation wiring' (Protocol in workflow.md)
