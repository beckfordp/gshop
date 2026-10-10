# Plan: Real Unsplash Photos for WatchArt

## Phase 1: Image data + lookup logic
- [x] Task: Write failing tests for `imageForSku` in `src/data/watchImages.test.ts` — covers: same sku always returns the same URL, two known skus 60 apart in the fixed order map to the same image, an unknown sku still returns a valid URL from the pool (Red) `pending-commit`
- [x] Task: Implement `src/data/watchImages.ts`: the 60 Unsplash URLs, the fixed 100-sku order table, round-robin `imageForSku(sku)` with hash-based fallback (Green) `pending-commit`
- [x] Task: Refactor, keep tests green `pending-commit` (no refactor needed)
- [x] Task: Conductor - User Manual Verification 'Image data + lookup logic' (Protocol in workflow.md) — `scripts/verify-watchart-photos-phase1.sh`

## Phase 2: WatchArt component swap
- [x] Task: Update `WatchArt.test.tsx`: replace the hue/initials assertions with assertions that an `<img>` is rendered with the expected `src` (from `imageForSku`) and `alt` (the product name) (Red) `pending-commit`
- [x] Task: Rewrite `WatchArt.tsx` to render the photo in the existing circular gold-bezel frame; update `WatchArt.css` (object-fit: cover, remove now-unused hue-background rule) (Green) `pending-commit`
- [x] Task: Remove `hueFromSku`/`initialsFromName` from `watchArtLogic.ts` and their tests (now superseded by `imageForSku`) — delete the file entirely if nothing else uses it `pending-commit` (confirmed no other importers, deleted both files)
- [x] Task: Refactor, keep tests green `pending-commit` (no further refactor needed)
- [x] Task: Conductor - User Manual Verification 'WatchArt component swap' (Protocol in workflow.md) — live browser check: Catalog grid, Cart, and Order History (including a pre-existing order from the original 10-item catalog) all render real distinct photos in the gold-bezel frame; one thumbnail needed an extra moment to finish loading on first paint (not a bug, confirmed via zoom after a short wait)

## Phase 3: Verification
- [x] Task: Run full suite + lint + build — confirm green, confirm Catalog/Cart/Checkout/OrderHistory tests needed no changes (WatchArt's props contract is unchanged) `pending-commit`
- [x] Task: Conductor - User Manual Verification: live browser check that real photos render across Catalog, Cart, and Order History against the real 100-item catalog, and that a few spaced-apart repeats look as expected (Protocol in workflow.md) — loaded all 100 catalog cards via "Load more", confirmed `watch-rolex-submariner` and `watch-franckmuller-vanguard` (60 positions apart) render the identical image URL; `scripts/verify-watchart-photos-phase3.sh`
