# Plan: US-8 Order History

## Phase 1: customerId + orderClient.list() + Cart checkout update [checkpoint: 76a3293]
- [x] Task: Write failing tests for `customerId.ts` in `src/services/customerId.test.ts` — covers: `getOrCreateCustomerId()` creates+persists a UUID when absent, returns the existing one when present (no new UUID generated); `getStoredCustomerId()` returns null when absent, the stored value otherwise (Red) [f3c7c14]
- [x] Task: Implement `src/services/customerId.ts` — minimum code to pass (Green) [fd7fd53]
- [x] Task: Write failing tests for `orderClient.list()` in `orderClient.test.ts` — covers request shape (GET /orders?customerId=...), response parsing, `OrderClientError` on non-2xx/network failure (Red) [73a8518]
- [x] Task: Implement `orderClient.list()` against order-service's real contract — minimum code to pass (Green) [13ffa70]
- [x] Task: Update `Cart.test.tsx`'s checkout tests to expect `customerId` from `getOrCreateCustomerId()` instead of the cart id, then update `Cart.tsx`'s `handleCheckout` to match (Red → Green in one task, since it's a one-line source swap in an already-tested code path) [df6fc04]
- [x] Task: Refactor; rerun tests — no refactor needed, all Phase 1 changes already minimal; full suite (59/59) + lint re-confirmed green
- [x] Task: Conductor - User Manual Verification 'customerId + orderClient.list()' (Protocol in workflow.md) — prompting off, verified via `scripts/verify-history-phase1.sh` + a real browser walkthrough: two separate checkouts in the same session both used the SAME persistent `gshop:customerId` (confirmed via `GET /orders?customerId=`), while `gshop:cartId` was correctly cleared/regenerated each time; discovered order-service's history cache has a 60s staleness TTL with no write-invalidation (documented in tech-stack.md, not a gshop bug)

## Phase 2: Order History screen [checkpoint: 558597f]
- [x] Task: Write failing tests for `OrderHistory.tsx` in `src/screens/OrderHistory/OrderHistory.test.tsx` — covers: empty state (no stored customerId, no API call), loading, renders past orders (id/status/items/total/date) newest-first, error+Retry (Red) [e0410a4]
- [x] Task: Implement `OrderHistory.tsx` + `.css` — minimum code to pass (Green) [cd0588f]
- [x] Task: Refactor; rerun tests — `formatStatus` was identically duplicated between Checkout.tsx and OrderHistory.tsx; extracted to `src/lib/format.ts` with its own test; full suite (65/65) + lint + build re-confirmed green [32e2dc5]
- [x] Task: Conductor - User Manual Verification 'Order History screen' (Protocol in workflow.md) — prompting off, verified via `scripts/verify-history-phase2.sh`; live browser click-through deferred to Phase 3 (screen not reachable in the app until nav is wired)

## Phase 3: Navigation wiring
- [x] Task: Write failing tests for `App.tsx`'s History screen + per-screen nav buttons in `App.test.tsx` — covers: "Order History" reachable from Catalog and Cart, History screen's own nav shows "Back to Catalog" and "View Cart" (Red) [00d8ea0]
- [x] Task: Implement the wiring in `App.tsx` (`screen` widened to include `'history'`) — minimum code to pass (Green) [751bf3e]
- [x] Task: Refactor; rerun full test suite; check coverage (>80% target) — App.tsx's three near-identical nav button blocks (each repeating the same screen/label pairs) replaced with a data-driven `NAV_TARGETS` list filtered by current screen [1d0a7ce]; 67/67 tests pass; aggregate coverage 94.86% (App.tsx/OrderHistory.tsx/customerId.ts 100%), exceeds target
- [x] Task: Conductor - User Manual Verification 'Navigation wiring' (Protocol in workflow.md) — prompting off, verified via full live browser walkthrough after an OrbStack/k8s outage + restart (pods restarted, but Postgres data for both prior real orders survived): Catalog -> Order History shows both real orders (newest first, correct id/status/date/items/total) -> View Cart -> Back to Catalog, nav button sets correct on every screen, no console errors
