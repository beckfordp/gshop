# Tech Stack — gshop

Inferred from `package.json` (brownfield — documenting what's actually
there, not proposing changes).

## In package.json today
- **React** 18.3.1 + **react-dom** 18.3.1
- **TypeScript** ~5.6.2
- **Vite** ^5.4.10 (`@vitejs/plugin-react` ^4.3.3) — dev server + build
- **ESLint** 9.13.0 + **typescript-eslint** 8.11.0 +
  `eslint-plugin-react-hooks`/`eslint-plugin-react-refresh`

## Testing (added 2026-10-08, track `catalog_20261008` Phase 1)
Per `product-guidelines.md`'s Testing section:
- **Vitest** ^3.2.7 — reuses `vite.config.ts` directly (via `vitest/config`'s
  `defineConfig`), no separate Jest config
- **@vitest/coverage-v8** ^3.2.7 — `npm run test:coverage`
- **@testing-library/react** ^16.3.3 + **@testing-library/jest-dom** ^7.0.1 —
  component tests; jest-dom wired via its `/vitest` subpath
  (`src/test/setup.ts`), which auto-extends `expect` with types, no manual
  augmentation needed
- **jsdom** ^26.1.0 — Vitest's DOM environment. Pinned below latest (30.x)
  because 30's own deps (`tr46`, `entities`) require Node ≥20/22; this repo
  runs Node 18.16. 26.x's dep chain (`whatwg-url` ^14, `tr46` 5) is
  Node-18-safe — verified via `npm view <pkg> engines` before installing.

### Known accepted vulnerability (dev-only)
`npm audit` flags `@vitest/mocker` (GHSA-82fw-gwwq-j7x9, path traversal via
mock redirects) across vitest 2.1.0–4.1.10 — every vitest release compatible
with our pinned `vite ^5.4.10`. The fix (vitest ≥4.1.11) requires `vite ≥6`,
a larger bump than this track's scope. Accepted as low-risk for now: it's a
devDependency (never shipped), and this project doesn't use `vi.mock`
redirects or Vitest's browser mode. Revisit when `vite` is next upgraded.

A second, unrelated `npm audit` finding (`esbuild`/`vite` dev-server request
vulnerability) pre-dates this track — already present from the original
`vite ^5.4.10` scaffold, not introduced here.

### `tinypool` override
Vitest 3.2.7 depends on `tinypool ^1.1.1`, which has a critical prototype-
pollution RCE (fixed at ≥2.1.2). Added an `"overrides": { "tinypool":
"^2.2.0" }` in `package.json` to force the patched version — verified
working on Node 18.16 despite its own `engines` field claiming Node ≥20
(ran a real test file through it, not just `--passWithNoTests`).

## Design tokens / shared CSS (added 2026-10-10, track `boutique-redesign_20261010`)
`product-guidelines.md`'s default is no shared CSS system (plain per-screen
`.css` files). This track deliberately supersedes that for one real,
cross-screen need: a consistent dark-luxury visual language. `src/index.css`
defines CSS custom properties on `:root` (colors, typography, spacing —
`--color-bg`, `--color-accent`, `--font-serif`, `--space-md`, etc.); every
screen's own `.css` file consumes these tokens rather than hardcoding
values. No new npm dependency — just one Google Fonts `<link>`
(`index.html`, Playfair Display) plus plain CSS. `src/components/WatchArt/`
(`WatchArt.tsx` — renders a real photo via `src/data/watchImages.ts`'s
`imageForSku(sku)`, see "Real watch photos" below) is the first component
under `src/components/` — justified by reuse across all four screens per
`product-guidelines.md`'s component-extraction bar.

Note (still relevant generally, even though the file that first hit it —
`watchArtLogic.ts` — was later deleted in the `watchart-photos_20261010`
track): this filesystem is case-insensitive (macOS default) while Vite's
module resolver tries extensions in `.ts`-before-`.tsx` order — a bare
import `./Foo` from a sibling file can silently resolve to a lowercase
`foo.ts` instead of the intended `Foo.tsx`. Keep component/logic sibling
file names clearly distinct (not just a
case difference) anywhere else this pattern is used.

## Real watch photos (added 2026-10-10, track `watchart-photos_20261010`)
`WatchArt` originally rendered CSS-generated placeholder art (solid
per-brand hue + initials) — replaced per explicit user feedback that it
looked "made up." `src/data/watchImages.ts` now hotlinks 60 real,
licensed, free-to-use watch photos directly from Unsplash's CDN
(`images.unsplash.com/photo-<id>?w=400&h=400&fit=crop&auto=format`) — no
binary assets added to the repo, no new npm dependency, no API key
needed (Unsplash's CDN serves these URLs with
`access-control-allow-origin: *`, verified via curl; their search *page*
itself is bot-challenge-protected, so the 60 photo ids were sourced via a
real browser session, not scraped programmatically).

Only 60 unique usable photos were found for the 100-item catalog, so the
photos don't claim to depict the specific brand/model shown (explicit
user instruction — not required to match). `imageForSku(sku)` round-robins
the 60 photos against `SKU_ORDER`, a fixed copy of the catalog's real
seeding order (`gluon`'s `services/catalog-service/scripts/seed-watches.sh`'s
`WATCHES` array) — `WATCH_IMAGES[index_in_SKU_ORDER % 60]` — so any reused
photo is always exactly 60 catalog positions from its first use, as far
apart as mathematically possible with 60 images across 100 items. An
unknown/future sku (not in `SKU_ORDER`) falls back to a hash-based pick
so the app never breaks. Verified live: `watch-rolex-submariner` (position
0) and `watch-franckmuller-vanguard` (position 60) render the identical
image URL once the full 100-item catalog is loaded.

## Local dev against a running backend (added 2026-10-08, extended 2026-10-09, resolved 2026-10-10)
Backend services run in `gluon-local` (OrbStack k8s). `.env` (gitignored,
not committed) points each service's client straight at that service's
own cluster-DNS address:
```
VITE_CATALOG_SERVICE_URL=http://catalog-service.gluon-local.svc.cluster.local:8080
VITE_CART_SERVICE_URL=http://cart-service.gluon-local.svc.cluster.local:8080
VITE_ORDER_SERVICE_URL=http://order-service.gluon-local.svc.cluster.local:8080
VITE_INVENTORY_SERVICE_URL=http://inventory-service.gluon-local.svc.cluster.local:8080
VITE_PAYMENT_SERVICE_URL=http://payment-service.gluon-local.svc.cluster.local:8080
VITE_USER_SERVICE_URL=http://user-service.gluon-local.svc.cluster.local:8080
VITE_FULFILMENT_SERVICE_URL=http://fulfilment-service.gluon-local.svc.cluster.local:8080
```
No `kubectl port-forward`, no Vite proxy. OrbStack bridges the cluster's
own DNS/network straight to the host — that hostname resolves and the
connection works from a plain `curl`, confirmed, with no forwarding set
up — and because `.env` points at the Service's own stable DNS name rather
than a forwarded port tied to one specific pod, a `bin/k8s-local-up`
redeploy (new pod, new ClusterIP, same Service/DNS name) keeps working
with no manual re-forwarding step afterward.

**Resolved 2026-10-10:** catalog-service, cart-service, and order-service
used to send no `Access-Control-Allow-Origin` header, so even though the
server responded fine (`curl` worked), the browser blocked the
cross-origin `fetch()` (`TypeError: Failed to fetch`) — confirmed via
`curl -i -H "Origin: http://localhost:5173" ...` returning 200/201 with no
ACAO header, for all three services. Worked around at the time with
`kubectl port-forward` + Vite dev-server proxy entries (`vite.config.ts`'s
`server.proxy`) so the browser's request stayed same-origin and Vite
forwarded it server-to-server, not subject to browser CORS. Fixed upstream
via Rework 1/TD-1 (each service's own `cors_20261010` Conductor track,
implemented/reviewed/archived) — every service now sends
`Access-Control-Allow-Origin`, so the direct-connection `.env` above works
from a real browser with zero console errors. Verified live: Catalog load,
Add to cart, View Cart, Order History all round-trip through
catalog-service/cart-service/order-service directly. Proxy config removed
from `vite.config.ts`.

Verified end-to-end for cart-service 2026-10-09 (track `cart_20261008`
Phase 2, via the then-current proxy setup): clicking "Add to cart" in a
real browser created a real cart via `POST /carts` and persisted the item
via `POST /carts/{id}/items`, confirmed by re-fetching `GET /carts/{id}`.

Verified for order-service 2026-10-09 (track `checkout_20261009` Phase 2,
via the then-current proxy setup): clicking "Checkout" in a real browser
called the real `POST /orders` and got back a genuine
`reservation_failed` response — **`inventory-service` has no stock seeded
for any sku** (`GET /inventory/<sku>` returns 404 for real catalog skus),
so every real reservation currently fails. Cart correctly stayed
un-cleared and showed the "Some items are out of stock." error — this is
gshop behaving correctly against real (if unseeded) data, not a gshop bug.
Noted in `gluon`'s `backlogs/inventory-service.md`.

Verified the full success path too, Phase 4 2026-10-09: manually seeded
one sku (`POST /inventorys {"sku":"watch-rolex-submariner",
"quantityAvailable":5}`) so a real reservation could succeed. End-to-end
in a real browser: Catalog → Add to cart → View Cart → Checkout → real
`POST /orders` with `status: "pending"` (reservation succeeded) →
Checkout screen showing the correct order id/status/items/total →
`gshop:cartId` cleared from `localStorage` → "Continue Shopping" back to
Catalog. No console errors at any step. This seeded row is local-k8s test
data only, not part of the official seed script — it'll persist until
`inventory-postgres`'s volume is reset.

**Superseded 2026-10-26:** the Cart "Checkout" button now opens the
single-page Checkout form; it no longer places the order itself.

**Wired to the real contract 2026-10-27** (track
`checkout-real-wiring_20261027`): Checkout Journey 1's services landed, so
`orderClient.create()` now reads ADR 0018's status codes rather than a
status field on the response — `201` returns the `authorized` order, `402`
a decline reason, `409` every failed reservation line, and `400`/`503`/`500`
the server's error message. A failed checkout persists no order, so only
the success result carries one. The Checkout screen maps each result to its
own UI (confirmation / inline decline with the card editable / per-line
Remove plus retry / generic error).

### Checkout mock mode (dev-only, added 2026-10-26)

```sh
VITE_CHECKOUT_MOCK=true npm run dev
```

`src/services/checkoutGateway.ts` selects the in-browser mock
(`checkoutMock.ts`) instead of `paymentClient.createMethod()` +
`orderClient.create()`. Catalog/cart still talk to real services; only
checkout submission is mocked. The mock mirrors the real result model
(`authorized` / `declined` / `stock_unavailable`, no order on failure)
rather than a separate shape. Test controls: a dev-only "Prototype
scenario" select (normal / some items unavailable / card declined / service
error); cards ending `0002` decline and `0003` report an unavailable item,
and the scenario control reports two failed lines so the multi-line 409 UI
can be exercised without a real stock shortfall. Raw card details stay in
component state only — never localStorage or logs — and the mock never
leaves the browser. A real provider integration must use
hosted fields/tokenization, not this form's direct PAN handling.

## Catalog "Load more" regression from the CORS rollout (found and fixed 2026-10-11)
The direct cluster-DNS CORS fix above (resolved 2026-10-10) introduced a
side effect: catalog-service's CORS middleware allowed the cross-origin
request but didn't expose the custom `X-Total-Count` header, so browsers
hid it from JS by default (only the small CORS-safelisted header set is
exposed without an explicit `Access-Control-Expose-Headers`) — `curl` saw
`X-Total-Count` fine, a real browser's `fetch()` reported it `null` and
omitted it from `response.headers.keys()` entirely.
`catalogClient.list()`'s fallback (`items.length` when the header is
missing) made `total === items.length` on every page, so the Catalog
screen's "Load more" button silently stopped appearing even though 100
items existed. **Fixed entirely in `catalog-service`'s own conductor**, no
gshop code change — see its archived track
[`expose-x-total-count_20261011`](https://github.com/beckfordp/catalog-service/tree/main/conductor/archive/expose-x-total-count_20261011)
(`Cors.scala` now calls `.withExposeHeadersIn(Set(ci"X-Total-Count"))`).
Live-verified after redeploy: real browser `fetch()` reads `X-Total-Count`
correctly, "Load more" pages through all 100 real items again.

## Catalog-service's list cache appears to miss invalidation on write (found 2026-10-10)
While seeding the boutique-redesign track's 90 new watches (catalog now
100 items, see `product.md`), a `GET /catalogs?limit=100&offset=0` request
made *before* seeding (via Cart's catalog join) kept returning the stale
pre-seed 10-item result afterward, while other limit/offset windows never
requested before seeding (e.g. the real Catalog screen's `limit=20`
pages) returned fresh 100-item data immediately. Looks like a
per-(limit,offset) cache key with no write-side invalidation — same shape
as order-service's documented 60s history-cache TTL below, but
undocumented here and with no visible TTL expiry observed in this
session. Filed in `gluon`'s `backlogs/catalog-service.md`. Not a gshop
bug and not fixed here — if it recurs, a hard refresh / waiting out
whatever TTL exists clears it; gshop's own request shapes (`limit=20`
Catalog paging, `limit=100&offset=0` Cart join) are unchanged by this
track.

## Order-service's history cache has a 60s staleness window (found 2026-10-09)
Confirmed live while verifying track `history_20261009`'s Phase 1 (same
persistent `customerId` used across two real checkouts): `GET
/orders?customerId=...` is cache-aside with **TTL-only freshness, no
active invalidation on write** (`order-service`'s own
`application.conf`: `order-history-cache.history-ttl-seconds = 60`, and
`OrderHistoryCache.scala`'s own doc comment says so explicitly — this is
a known, deliberate choice on their side, not a bug). Placed a second
order for the same customer right after the first; `GET
/orders?customerId=` kept returning only the first order (verified via
direct `curl` to the port-forwarded service, not just through gshop) for
up to a minute. **Not something gshop can fix client-side** — the
Order History screen (US-8) just won't show a just-placed order
immediately; it'll appear once the 60s TTL rolls over. No action needed
here beyond this note — order-service's own docs already scope this as
intentional, so no new upstream backlog item filed for it.

**Same gap applies to `DELETE /orders/{id}`** (found 2026-10-10, track
`admin-screen_20261010`'s Admin screen "Clear order history" feature):
deleting every order for a customer doesn't invalidate the cached list
either — `GET /orders?customerId=` kept reporting the pre-delete order
count for up to a minute after 22 real orders were deleted and
individually confirmed gone (`GET /orders/{id}` → 404 for each, which
bypasses this list-level cache). Same "not a gshop bug, TTL-only cache is
order-service's own deliberate design" reasoning as above — the Admin
screen's "Order history cleared." message is accurate (the deletes did
happen), the Order History *screen* just won't reflect it for up to a
minute, same as a just-placed order's delayed appearance.

## Auth (real, with optional mock) — updated 2026-10-28

`src/services/userClient.ts` calls user-service's `POST /auth/signup` and
`POST /auth/login` (typed `UserClientError` carrying the server's status and
message). `src/services/authGateway.ts` selects the real client, or the
in-browser `mockAuth` when `VITE_AUTH_MOCK=true` (real is the default), and
records `userId → email` in `src/services/identityStore.ts` for Order History
badges. Sessions persist in localStorage under `gshop:authSession`; tokens are
never logged. Saved addresses remain localStorage keyed by `userId` until
user-service owns them. The approved UI (banner, modal, a11y behaviour) is
unchanged.

## Fulfilment queue (real service; added 2026-10-28)

`src/services/fulfilmentClient.ts` calls fulfilment-service's operator REST
(`GET /fulfilment-tasks`; `POST .../{id}/start-picking|pack|dispatch|fail`)
with the `FulfilmentClientError` (status + server `error` message) convention
used by the other clients. Tasks themselves are created by the service from
`payment-events: PaymentAuthorized` — gshop never seeds or persists queue
state (the old `fulfilmentStore.ts` localStorage prototype and its
`VITE_FULFILMENT_MOCK` flag were removed). The screen fetches on mount and
after each action, with a manual Refresh; the response carries no customer
identity, so cards show the shipping-address snapshot instead. Order History
reads the real order-service statuses (`dispatched` / `dispatch_failed` /
`confirmed` / `payment_failed`) with no mock preview (US-17.6/18.5, US-19.5,
US-17.7).
