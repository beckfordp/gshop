# Spec: Classy Watch Boutique Redesign + 100-Item Catalog

## Overview
Restyle gshop into a dark-luxury watch-boutique look across all four screens, add a reusable CSS-generated "watch-face dial" placeholder art component (no real photos), and grow the catalog from 10 to 100 real watches by extending catalog-service's `scripts/seed-watches.sh` (committed separately in the `gluon` repo as a phase of this track).

## Functional Requirements
- **Design tokens**: new shared CSS custom properties (colors, typography, spacing) — near-black background, warm gold/champagne accent, cream text; Playfair Display (Google Font, loaded via `index.html`) for headings/product names, system sans-serif for body/buttons. Documented as a deliberate tech-stack.md addition (product-guidelines.md's default "plain CSS, no shared system" is superseded here by this real, cross-screen need).
- **`WatchArt` component** (new `src/components/WatchArt/`, justified by reuse across ≥2 screens per product-guidelines.md): a circular "dial" per watch — brand-derived accent hue (deterministic from the sku's brand segment, so e.g. every Rolex model shares one hue, every Omega another), centered initials (from the product name), gold bezel ring, subtle gradient. The hue/initials logic lives in a plain, unit-testable module (`watchArt.ts`) separate from the presentational component.
- **Catalog screen**: grid of cards (WatchArt + name + muted sku + accent price + styled "Add to cart" button), restyled loading/error/"Load more" states.
- **Cart screen**: line items get a small WatchArt thumbnail; styled +1/Remove buttons; prominent total; Checkout as a strong primary (gold-filled) button; restyled error+Retry.
- **Checkout screen**: restyled confirmation layout, order summary matching Cart's line-item look.
- **Order History screen**: each past order as a styled card.
- **App shell**: header bar with a serif brand wordmark + nav links styled as understated text links with an accent hover underline (replacing today's plain `<button>` nav).
- **Catalog data**: 90 new watches (real brands/models, not duplicating the existing 10), each with an original one-line description in the existing style, prices in the existing ~$4,300–$35,000 band, SKUs following the existing `watch-<brand>-<model-slug>` convention. Appended to `scripts/seed-watches.sh`'s `WATCHES` array (already idempotent — safe to re-run).

## Non-Functional Requirements
- No new npm runtime dependencies (pure CSS + one Google Fonts `<link>`, not a package).
- All existing tests keep passing; new pure-logic functions (`watchArt.ts`) get their own unit tests per TDD.
- Existing functional behavior (pagination, cart ops, checkout, history) is unchanged — visual/data only.

## Acceptance Criteria
- All four screens share one consistent dark-luxury visual language (verified by eye, not automated).
- Every catalog/cart/checkout/history item shows a `WatchArt` dial instead of plain text; the same sku always renders the same hue/initials (deterministic, tested).
- `GET /catalogs` (real, reseeded) returns 100 items; Catalog screen's existing "Load more" pagination correctly pages through all of them.
- `npm run build`/`lint`/`test` all stay green throughout.

## Out of Scope
- Real product photography (declined — see conversation).
- Any change to screens' underlying data-fetching/business logic.
- A design-system/component library dependency — still hand-written CSS, just shared via tokens now.
- Updating `inventory-service` stock for the 90 new skus (separate concern — checkout already handles "out of stock" gracefully either way).
