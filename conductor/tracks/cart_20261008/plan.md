# Plan: US-2 Cart Screen

## Phase 1: cartClient + cart identity
- [x] Task: Write failing tests for `cartClient`'s `create()`/`get()`/`addItem()`/`removeItem()` in `src/services/cartClient.test.ts` — covers request shape, response parsing, `CartClientError` on non-2xx/network failure (Red) [2aa997b]
- [x] Task: Implement `cartClient` methods against cart-service's real contract — minimum code to pass (Green) [230d66b]
- [x] Task: Write failing tests for `getOrCreateCartId()` in `src/services/cartId.test.ts` — covers: returns existing `localStorage` id without calling the API; creates via `cartClient.create()` and persists when absent (Red) [858865f]
- [x] Task: Implement `src/services/cartId.ts` — minimum code to pass (Green) [dddffc9]
- [x] Task: Refactor; rerun tests — no refactor needed; both files already minimal, consistent with catalogClient.ts's pattern; full suite (20/20) + lint re-confirmed green [03b1fc4]
- [ ] Task: Conductor - User Manual Verification 'cartClient + cart identity' (Protocol in workflow.md)

## Phase 2: Add to cart (Catalog screen)
- [ ] Task: Write failing tests for Catalog's "Add to cart" button in `Catalog.test.tsx` — covers: click calls `getOrCreateCartId()` + `cartClient.addItem()`, shows brief "Added" feedback, shows inline error on failure (Red)
- [ ] Task: Implement the button in `Catalog.tsx` — minimum code to pass (Green)
- [ ] Task: Refactor; rerun tests
- [ ] Task: Conductor - User Manual Verification 'Add to cart' (Protocol in workflow.md)

## Phase 3: Cart screen
- [ ] Task: Write failing tests for `Cart.tsx` in `src/screens/Cart/Cart.test.tsx` — covers: empty state (no stored id, no API call), loading, joins cart items against catalog list to render name/qty/price lines + total, "+1" and "Remove" actions, error+Retry for get/addItem/removeItem (Red)
- [ ] Task: Implement `Cart.tsx` + `Cart.css` — minimum code to pass (Green)
- [ ] Task: Refactor; rerun tests
- [ ] Task: Conductor - User Manual Verification 'Cart screen' (Protocol in workflow.md)

## Phase 4: Navigation
- [ ] Task: Write failing tests for `App.tsx`'s Catalog/Cart screen toggle in `App.test.tsx` — covers: default screen, switching via nav links (Red)
- [ ] Task: Implement the toggle in `App.tsx` — minimum code to pass (Green)
- [ ] Task: Refactor; rerun full test suite; check coverage (>80% target)
- [ ] Task: Conductor - User Manual Verification 'Navigation' (Protocol in workflow.md)
