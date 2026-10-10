# Spec: Real Unsplash Photos for WatchArt

## Overview
Replace WatchArt's CSS-generated placeholder dial with real watch photography sourced from Unsplash (free-to-use licensed stock photos, hotlinked directly from Unsplash's CDN — no scraping, no counterfeit-site content). Photos are generic watch photography and are not required to visually match the specific brand/model in the product name (per user instruction). Found 60 unique usable watch photos via Unsplash's own search; since that's fewer than 100 catalog items, photos are reused via a deterministic round-robin mapping across the 100 known SKUs (in catalog order) so any repeat is spaced ~60 catalog positions apart — as far apart as mathematically possible with 60 images across 100 items.

## Functional Requirements
- New `src/data/watchImages.ts`: the 60 curated Unsplash image URLs + an `imageForSku(sku)` lookup using a fixed SKU-order table for the round-robin spacing; an unknown/future SKU falls back to a hash-based pick so the app never breaks.
- `WatchArt.tsx` rewritten to render the real photo inside the existing circular gold-bezel frame (same `sku`/`name`/`size` props — no changes needed at any of the 4 screens' call sites).
- Remove the now-unused `hueFromSku`/`initialsFromName` logic and tests; add new tests for `imageForSku`'s determinism/spacing/fallback behavior.
- `alt` text uses the real product name for accessibility, even though the photo doesn't depict that specific product.

## Non-Functional Requirements
- Images hotlinked directly from Unsplash's CDN — no binary image assets added to the repo, no new npm dependency.
- Existing Catalog/Cart/Checkout/OrderHistory tests stay green (WatchArt's external contract is unchanged).

## Acceptance Criteria
- Every catalog/cart/checkout/history item shows a real photo, not CSS-generated art.
- Same SKU always shows the same photo (deterministic).
- Build/lint/test stay green; live browser check confirms real photos render across all 4 screens.

## Out of Scope
- Downloading/self-hosting the images.
- Any change to the 100-item catalog data itself (names/descriptions/prices/SKUs unchanged).
- Sourcing brand-accurate photos (explicitly not required).
