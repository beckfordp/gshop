# Product Guide — gshop

## Context
Full cross-repo vision lives in the `gluon` platform repo, not here:
[`../../../docs/product.md`](../../../docs/product.md), [`../../../docs/system-design.md`](../../../docs/system-design.md),
[`../../../docs/user-stories.md`](../../../docs/user-stories.md),
[ADR 0006](../../../docs/adr/0006-react-frontend-framework.md) (React/TS/Vite choice),
[ADR 0007](../../../docs/adr/0007-platform-repo-vs-hosted-workloads.md) (gshop is a hosted workload, gluon is the platform).

## What this app does
The first frontend app on the Gluon platform — walks a user through the shopping
workflow (browse catalog → cart → checkout → order status) by calling the real
backend services directly (no mock data, no shared code with the
`prototype/storefront.html` design reference). Intended to be one of potentially
many frontend apps the platform hosts simultaneously.

## Domain model
None of its own — gshop is a pure client. It consumes five backend services'
REST APIs (catalog, cart, order, inventory, payment), whose contracts live in
gluon's `system-design.md`, not duplicated here. `src/services/*Client.ts` are
the thin per-service client modules — `catalogClient.ts` (US-1),
`cartClient.ts` (US-2), and `orderClient.ts` (`create()` from US-3,
`list()` from US-8) now have real methods; `inventoryClient.ts` and
`paymentClient.ts` are still base URL + health check only stubs — see
Status below and the Open question below (inventory confirmed unneeded
during US-3; payment still open).

## User stories in scope
From `../../../docs/user-stories.md` (UI realization, not new stories):
- **US-1** — Browse catalog
- **US-2** — Add to cart
- **US-3** — Checkout
- **US-8** — Order history / status

Out of scope: **US-7** (order status notifications) has no UI surface — it's
email-only, nothing for this app to call.

## Open question (partially resolved during US-3)
Per `system-design.md`'s sync/async boundaries, `inventoryClient.ts` and
`paymentClient.ts` may be unneeded — both look server-to-server/event-driven
only, no documented frontend-facing endpoint.
- **`inventoryClient.ts`: confirmed unneeded.** US-3's checkout flow
  verified this directly — order-service itself calls inventory-service
  server-to-server (synchronous reservation inside `POST /orders`); gshop
  never calls inventory-service. The stub is still present but unused;
  dropping it is a small separate cleanup, not done as part of US-3.
- **`paymentClient.ts`: still open.** No payment-collection story has been
  built (US-3 explicitly left it out of scope — `payment_failed` is an
  async order status, not something gshop triggers or waits for). Revisit
  during US-8 or whenever a payment-collection story is scoped.

## Sequencing
Per `../../../PLAN.md`'s Phase 9 — depends on catalog-service, cart-service,
order-service's checkout + history endpoints (all already built in their own
repos). No ordering constraint between US-1/US-2/US-3/US-8 themselves beyond
what's natural to build and demo (browse before cart before checkout before
history).

## Status
All four in-scope user stories are live: US-1 (browse catalog), US-2
(cart), US-3 (checkout), and US-8 (order history).
- `src/screens/Catalog/Catalog.tsx` lists products from catalog-service via
  `catalogClient.list()`, with manual "Load more" pagination, and an
  "Add to cart" button per item. No search/filter/categories, no detail
  view.
- `src/screens/Cart/Cart.tsx` shows the current cart (via `cartClient`),
  joined against the full catalog list for display names/prices (no
  lookup-by-sku endpoint exists yet — see `backlogs/catalog-service.md` in
  `gluon`). Supports "+1" and "Remove" per line; no quantity decrement or
  set-to-exact-quantity (cart-service's HTTP API doesn't expose that). A
  "Checkout" button places a real order (`orderClient.create()`), waiting
  for order-service's synchronous stock-reservation result: on success it
  navigates to the Checkout screen and clears the local cart id; on
  `reservation_failed` (or a request error) it shows an inline error +
  Retry and stays put — checkout never silently "succeeds" over a real
  stock problem.
- `src/screens/Checkout/Checkout.tsx` is a pure confirmation display (order
  id, status, line items, total) for the order just placed — passed in
  from `App.tsx`, not re-fetched. "Continue Shopping" returns to Catalog.
- `src/screens/OrderHistory/OrderHistory.tsx` lists all past orders for
  this customer (`orderClient.list()`), newest first (server-sorted, no
  client re-sort), each with id/status/items/total/date. Empty state when
  there's no customerId yet or no past orders. No pagination (order-service
  doesn't have any).
- The cart itself is anonymous — identified by an opaque id cart-service
  generates, persisted only in the browser's `localStorage`
  (`src/services/cartId.ts`); no auth/session system exists. **As of
  US-8**, the order's `customerId` is a *separate* persistent anonymous id
  (`src/services/customerId.ts`, a `crypto.randomUUID()` minted once and
  never cleared) — not the cart id. Earlier (US-3) checkout reused the
  cart id as customerId, which broke order history: a successful checkout
  clears the cart id, so each checkout got a different "customer". US-8
  fixed this by introducing the separate identity and updating Cart's
  checkout to send it instead.
- `App.tsx` toggles between four screens via local `useState` — no router
  yet (deliberately deferred, see `tech-stack.md`). Nav shows "the other
  reachable screens" per current screen (Catalog/Cart/History each show
  the other two; Checkout has its own "Continue Shopping" CTA instead of
  nav buttons).
- **Visual design (as of the boutique-redesign track):** gshop is styled as
  a dark-luxury watch-boutique storefront — explicitly a demonstration
  skin only, never intended to go live as a real/sellable product. All
  four screens share a token-based dark/gold/serif visual language (see
  `tech-stack.md`), and every catalog/cart/checkout/history line item
  renders a `WatchArt` dial (`src/components/WatchArt/`) showing a real
  watch photo in a circular gold-bezel frame — **as of the
  `watchart-photos_20261010` track**, these are real photos licensed and
  hotlinked directly from Unsplash's CDN (`src/data/watchImages.ts`), not
  CSS-generated placeholder art. The photos are generic watch photography,
  deliberately not matched to the specific brand/model shown (only 60
  unique usable photos exist for the 100-item catalog, so
  `imageForSku(sku)` round-robins them against the catalog's fixed
  seeding order — any reused photo lands exactly 60 catalog positions
  from its first use). The catalog itself was grown from 10 to 100 real
  luxury watches (real brand/model names, originally-written descriptions,
  no scraped/real photography) via `gluon`'s
  `services/catalog-service/scripts/seed-watches.sh`.
- All screens currently need a Vite dev-server proxy to reach their
  backend services locally — catalog-service, cart-service, and
  order-service don't send CORS headers, so a browser blocks direct
  cross-origin calls to them (see `tech-stack.md`'s "Local dev against a
  running backend"). Also found during US-3: `inventory-service` has no
  stock seeded for any sku, so real checkouts currently all come back
  `reservation_failed` unless test stock is seeded by hand (see
  `gluon`'s `backlogs/inventory-service.md`). And found during US-8:
  order-service's history endpoint has a 60s cache TTL with no
  write-invalidation (its own documented, deliberate design) — a
  just-placed order can take up to a minute to show up in Order History.
