# Plan: Classy Watch Boutique Redesign + 100-Item Catalog

## Phase 1: Design Tokens + WatchArt Component

- [x] Task: Write failing tests for `watchArt.ts`'s pure logic in `src/components/WatchArt/watchArt.test.ts` — covers: same sku always yields the same hue, different brand segments yield different hues, initials extracted correctly from multi-word names (Red) `9a28cf6`
- [x] Task: Implement `watchArt.ts` (hue-from-brand hashing, initials-from-name) to pass tests (Green) `9a28cf6`
- [x] Task: Refactor `watchArt.ts` if needed, keep tests green `9a28cf6` (no refactor needed)
- [x] Task: Add design-token CSS custom properties (colors, typography, spacing) to a shared stylesheet `pending-commit`
- [x] Task: Add Playfair Display Google Font `<link>` to `index.html` `pending-commit`
- [x] Task: Build `WatchArt.tsx` presentational component (dial, bezel, gradient, initials) consuming `watchArtLogic.ts`, with a basic render test `pending-commit` (renamed `watchArt.ts` → `watchArtLogic.ts`: this filesystem is case-insensitive and Vite resolves `.ts` before `.tsx`, so `./WatchArt` was wrongly matching the logic file)
- [x] Task: Conductor - User Manual Verification 'Design Tokens + WatchArt Component' (Protocol in workflow.md) — `scripts/verify-boutique-phase1.sh`, prompting off

## Phase 2: Catalog Screen

- [ ] Task: Write failing tests asserting `Catalog.tsx` renders a `WatchArt` per item and the new card-grid structure (Red)
- [ ] Task: Integrate `WatchArt` into `Catalog.tsx`, restyle as card grid, including loading/error/"Load more" states (Green)
- [ ] Task: Refactor styling/markup, keep tests green
- [ ] Task: Conductor - User Manual Verification 'Catalog Screen' (Protocol in workflow.md)

## Phase 3: Cart, Checkout, Order History

- [ ] Task: Write failing tests asserting `Cart.tsx` renders `WatchArt` thumbnails per line item (Red)
- [ ] Task: Integrate `WatchArt` into `Cart.tsx`, restyle buttons/total/gold-filled Checkout button (Green)
- [ ] Task: Write failing tests asserting `Checkout.tsx`'s restyled confirmation still shows all order data (Red)
- [ ] Task: Restyle `Checkout.tsx` to match Cart's line-item look (Green)
- [ ] Task: Write failing tests asserting `OrderHistory.tsx` renders each order as a styled card with correct data (Red)
- [ ] Task: Restyle `OrderHistory.tsx` as styled cards (Green)
- [ ] Task: Refactor shared styling across the three screens, keep tests green
- [ ] Task: Conductor - User Manual Verification 'Cart, Checkout, Order History' (Protocol in workflow.md)

## Phase 4: App Shell / Nav

- [ ] Task: Write failing tests asserting `App.tsx`'s header shows the brand wordmark and nav renders as text links (Red)
- [ ] Task: Restyle `App.tsx`'s header/nav — serif brand wordmark, text-link nav with accent hover underline (Green)
- [ ] Task: Refactor, keep tests green
- [ ] Task: Run full suite + coverage check, confirm >80% maintained
- [ ] Task: Conductor - User Manual Verification 'App Shell / Nav' (Protocol in workflow.md)

## Phase 5: 100-Item Catalog Data (cross-repo)

- [ ] Task: Draft 90 new real-brand/model watch entries (original one-line descriptions, `watch-<brand>-<model-slug>` SKUs, ~$4,300–$35,000 price band), avoiding duplicates with the existing 10
- [ ] Task: Append the 90 entries to `gluon/services/catalog-service/scripts/seed-watches.sh`'s `WATCHES` array (separate commit, in the `gluon` repo)
- [ ] Task: Run the script live against port-forwarded catalog-service
- [ ] Task: Verify via `GET /catalogs` that 100 items exist with no SKU collisions
- [ ] Task: Live browser verification — page through "Load more" on the Catalog screen until all 100 items are shown
- [ ] Task: Conductor - User Manual Verification '100-Item Catalog Data' (Protocol in workflow.md)
