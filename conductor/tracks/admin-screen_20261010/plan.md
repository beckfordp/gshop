# Plan: Admin Screen (Order History Clear + Inventory Management)

## Phase 1: inventory-service — list/filter endpoint (separate repo, separate commit)

**Cross-repo dependency**: tracked in full (spec/plan/archive) in
`inventory-service`'s own conductor as
[`list-inventory-endpoint_20261010`](https://github.com/beckfordp/inventory-service/tree/main/conductor/archive/list-inventory-endpoint_20261010) —
done.

- [x] Task: Write failing tests in `InventoryRoutesSuite.scala` and an in-memory-store test for `list`: no-filter returns all rows, `sku` filter returns just that row (or empty), logging assertions matching existing patterns (Red) `40d91ab`
- [x] Task: Add `InventoryStore.list(skuFilter: Option[String])` to the trait + both `inMemory` and `postgres` implementations (Green) `40d91ab`
- [x] Task: Add `GET /inventorys` (optional `sku` query param) to `InventoryRoutes.scala`, wire into `routes()` (Green) `40d91ab`
- [x] Task: Refactor, keep tests green `40d91ab` (no refactor needed; also wired into Main.scala's explicit endpoint list and two pre-existing stub InventoryStore impls in HealthRoutesSuite.scala)
- [x] Task: Run this repo's full test suite; commit directly (prompt-off is active there too) `40d91ab`, `be581b9` (85/85 tests, including testcontainers-backed Postgres tests) — live redeploy to local k8s pending (user redeploying via `bin/k8s-local-up inventory-service`)

## Phase 2: gshop service clients
- [x] Task: Write failing tests for `inventoryClient.list()` and `orderClient.remove(id)` (Red) `pending-commit`
- [x] Task: Implement both against the real endpoints; add the inventory-service Vite proxy entry + `.env` var (Green) `pending-commit`
- [x] Task: Refactor, keep tests green `pending-commit` (no refactor needed)
- [x] Task: Conductor - User Manual Verification 'Service clients' (Protocol in workflow.md) — live: `inventoryClient.list()`/`adjust()` and `orderClient.remove()` verified end-to-end via the Admin screen below against the real redeployed services

## Phase 3: Admin screen
- [x] Task: Write failing tests for `Admin.tsx`: renders inventory table from `inventoryClient.list()` joined with catalog names, +/− adjusts via `inventoryClient` and re-renders the new quantity, "Clear order history" shows a confirm step then calls `orderClient.remove()` for every order from `orderClient.list()`, with success/error states (Red) `pending-commit`
- [x] Task: Implement `src/screens/Admin/Admin.tsx` + `Admin.css` (styled consistently with the rest of the dark-luxury token system) (Green) `pending-commit`
- [x] Task: Refactor, keep tests green `pending-commit` (added a small `lastDelta` tracker so a failed adjustment's Retry button repeats the exact same +1/−1, not a no-op)
- [x] Task: Conductor - User Manual Verification 'Admin screen' (Protocol in workflow.md) — live browser check: inventory table rendered real rows joined against catalog names; `+1` on `watch-rolex-submariner` (0→1 available) confirmed persisted via a fresh `GET /inventorys?sku=` (quantityReserved unchanged at 5); "Clear order history" confirm step, then deleted all 22 real orders for the stored customerId — confirmed via individual `GET /orders/{id}` (404, bypassing the known 60s list-cache staleness) that the deletes were real

## Phase 4: App shell wiring + full verification
- [x] Task: Write failing test asserting the discreet "Admin" link appears and navigates to the Admin screen (Red) `pending-commit`
- [x] Task: Wire into `App.tsx`'s screen state + add the low-contrast corner-styled link (Green) `pending-commit`
- [x] Task: Run full suite + lint + build in gshop; confirm green `pending-commit` (102+ tests, 86.76% overall coverage, App.tsx 100%)
- [x] Task: Conductor - User Manual Verification: live browser check — adjust real inventory via the admin screen and confirm it reflects in a fresh `GET /inventorys`; clear order history and confirm orders are gone (Protocol in workflow.md) — discreet "Admin" link confirmed in the bottom-right corner (tiny, low-contrast, as designed), navigates correctly; see Phase 3's verification above for the inventory-adjust and clear-history checks run through it
