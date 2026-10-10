# Plan: Admin Screen (Order History Clear + Inventory Management)

## Phase 1: inventory-service — list/filter endpoint (separate repo, separate commit)
- [ ] Task: Write failing tests in `InventoryRoutesSuite.scala` and an in-memory-store test for `list`: no-filter returns all rows, `sku` filter returns just that row (or empty), logging assertions matching existing patterns (Red)
- [ ] Task: Add `InventoryStore.list(skuFilter: Option[String])` to the trait + both `inMemory` and `postgres` implementations (Green)
- [ ] Task: Add `GET /inventorys` (optional `sku` query param) to `InventoryRoutes.scala`, wire into `routes()` (Green)
- [ ] Task: Refactor, keep tests green
- [ ] Task: Run this repo's full test suite; commit directly (prompt-off is active there too)

## Phase 2: gshop service clients
- [ ] Task: Write failing tests for `inventoryClient.list()` and `orderClient.remove(id)` (Red)
- [ ] Task: Implement both against the real endpoints; add the inventory-service Vite proxy entry + `.env` var (Green)
- [ ] Task: Refactor, keep tests green
- [ ] Task: Conductor - User Manual Verification 'Service clients' (Protocol in workflow.md)

## Phase 3: Admin screen
- [ ] Task: Write failing tests for `Admin.tsx`: renders inventory table from `inventoryClient.list()` joined with catalog names, +/− adjusts via `inventoryClient` and re-renders the new quantity, "Clear order history" shows a confirm step then calls `orderClient.remove()` for every order from `orderClient.list()`, with success/error states (Red)
- [ ] Task: Implement `src/screens/Admin/Admin.tsx` + `Admin.css` (styled consistently with the rest of the dark-luxury token system) (Green)
- [ ] Task: Refactor, keep tests green
- [ ] Task: Conductor - User Manual Verification 'Admin screen' (Protocol in workflow.md)

## Phase 4: App shell wiring + full verification
- [ ] Task: Write failing test asserting the discreet "Admin" link appears and navigates to the Admin screen (Red)
- [ ] Task: Wire into `App.tsx`'s screen state + add the low-contrast corner-styled link (Green)
- [ ] Task: Run full suite + lint + build in gshop; confirm green
- [ ] Task: Conductor - User Manual Verification: live browser check — adjust real inventory via the admin screen and confirm it reflects in a fresh `GET /inventorys`; clear order history and confirm orders are gone (Protocol in workflow.md)
