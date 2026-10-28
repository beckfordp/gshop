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
`cartClient.ts` (US-2), `orderClient.ts` (`create()` from US-3,
`list()` from US-8, extended for the checkout form), `inventoryClient.ts`
(Admin stock table), and `paymentClient.ts` (`createMethod()` for
`POST /payments/methods`, US-13). gshop never calls
`POST /payments/authorize` — order-service does, server-side.

## User stories in scope
From `../../../docs/user-stories.md` (UI realization, not new stories):
- **US-1** — Browse catalog
- **US-2** — Add to cart
- **US-3** — Checkout
- **US-8** — Order history / status
- **US-11/US-12** — shipping + billing address in the checkout form
- **US-13** — payment method (card) collection
- **US-14** — authorised/declined result of the synchronous checkout call

US-11–US-14 are implemented against the real contracts (Checkout Journey 1,
wired 2026-10-27); the in-browser mock remains available as an optional
dev-only mode.

Out of scope: **US-7** (order status notifications) has no UI surface — it's
email-only, nothing for this app to call.

## Client scope (resolved 2026-10-26)
`inventoryClient.ts` is used by the Admin screen only (stock list/adjust) —
checkout reservation remains server-to-server inside `POST /orders`.
`paymentClient.ts` now has `createMethod()` for the gshop-facing
`POST /payments/methods` (US-13); authorization stays server-side in
order-service. The earlier "paymentClient still open" question is closed.

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
  "Checkout" button now hands the priced lines to the Checkout form; Cart
  no longer places the order itself.
- `src/screens/Checkout/Checkout.tsx` is the single-page form: shipping
  address, billing address with a defaulted "same as shipping" checkbox,
  card number/expiry, and an order summary. Submit creates a
  `PaymentMethod` then `POST /orders`; `201` clears the cart and moves to
  confirmation, `402` shows the decline reason inline (card editable,
  retry), `409` lists **every** failed line with its own Remove action
  (removes it from cart-service, then retry the rest), and
  `400`/`503`/`500` show the server error. A failed attempt persists no
  order. A dev-only prototype scenario control is shown when
  `VITE_CHECKOUT_MOCK=true`.
- `src/screens/Auth/Auth.tsx` (prototype, Checkout Journey 2): signup/login
  reached from Checkout; backed by `mockAuth` in the browser until
  user-service lands. Signed-in checkout sends the mock `userId` as
  `customerId`; Order History reads that user's orders.
- `src/screens/OrderConfirmation/OrderConfirmation.tsx` is the post-order
  display (order id, status, "Payment authorised", shipping address, line
  items, total). "Continue Shopping" returns to Catalog.
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
- `App.tsx` toggles between six views via a local `AppView` union — no
  router yet (deliberately deferred, see `tech-stack.md`): Catalog, Cart,
  Checkout, OrderConfirmation, Order History, Admin. Nav shows "the other
  reachable screens" per current screen; Checkout and OrderConfirmation
  hide both nav and the Admin link, using their own Back/Continue CTAs.
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
- **Admin screen (as of the `admin-screen_20261010` track):** a discreet,
  customer-hidden screen (`src/screens/Admin/Admin.tsx`), reachable only
  via a small, low-contrast text link fixed to the page's bottom-right
  corner — no auth/login, consistent with the rest of this demo app's
  no-auth architecture, discretion only. Two features: "Clear order
  history" (lists the current customer's orders and deletes each one,
  behind a confirm step — irreversible, no undo); an inventory table
  (real rows from `inventory-service`, joined against the catalog for
  display names) with "+1"/"−1" buttons adjusting `quantityAvailable`
  (`quantityReserved` shown read-only, system-managed by the
  order/checkout flow). Required adding a previously-missing
  `GET /inventorys` list/filter-by-sku endpoint to `inventory-service`
  itself (tracked there as `list-inventory-endpoint_20261010`) — it only
  had lookup-by-internal-UUID before, which gshop had no way to discover.
- All screens connect directly to their backend services locally via
  cluster DNS (no proxy, no port-forward — see `tech-stack.md`'s "Local
  dev against a running backend", resolved 2026-10-10). Also found during
  US-3: `inventory-service` has no
  stock seeded for any sku, so real checkouts currently all come back
  `reservation_failed` unless test stock is seeded by hand (see
  `gluon`'s `backlogs/inventory-service.md`). And found during US-8:
  order-service's history endpoint has a 60s cache TTL with no
  write-invalidation (its own documented, deliberate design) — a
  just-placed order can take up to a minute to show up in Order History.
