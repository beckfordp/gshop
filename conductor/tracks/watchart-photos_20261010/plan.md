# Plan: Real Unsplash Photos for WatchArt

## Phase 1: Image data + lookup logic
- [ ] Task: Write failing tests for `imageForSku` in `src/data/watchImages.test.ts` — covers: same sku always returns the same URL, two known skus 60 apart in the fixed order map to the same image, an unknown sku still returns a valid URL from the pool (Red)
- [ ] Task: Implement `src/data/watchImages.ts`: the 60 Unsplash URLs, the fixed 100-sku order table, round-robin `imageForSku(sku)` with hash-based fallback (Green)
- [ ] Task: Refactor, keep tests green
- [ ] Task: Conductor - User Manual Verification 'Image data + lookup logic' (Protocol in workflow.md)

## Phase 2: WatchArt component swap
- [ ] Task: Update `WatchArt.test.tsx`: replace the hue/initials assertions with assertions that an `<img>` is rendered with the expected `src` (from `imageForSku`) and `alt` (the product name) (Red)
- [ ] Task: Rewrite `WatchArt.tsx` to render the photo in the existing circular gold-bezel frame; update `WatchArt.css` (object-fit: cover, remove now-unused hue-background rule) (Green)
- [ ] Task: Remove `hueFromSku`/`initialsFromName` from `watchArtLogic.ts` and their tests (now superseded by `imageForSku`) — delete the file entirely if nothing else uses it
- [ ] Task: Refactor, keep tests green
- [ ] Task: Conductor - User Manual Verification 'WatchArt component swap' (Protocol in workflow.md)

## Phase 3: Verification
- [ ] Task: Run full suite + lint + build — confirm green, confirm Catalog/Cart/Checkout/OrderHistory tests needed no changes (WatchArt's props contract is unchanged)
- [ ] Task: Conductor - User Manual Verification: live browser check that real photos render across Catalog, Cart, and Order History against the real 100-item catalog, and that a few spaced-apart repeats look as expected (Protocol in workflow.md)
