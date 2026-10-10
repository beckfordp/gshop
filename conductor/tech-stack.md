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
(`watchArt...Logic.ts` pure hue/initials hashing + `WatchArt.tsx`
presentational component) is the first component under `src/components/`
— justified by reuse across all four screens per
`product-guidelines.md`'s component-extraction bar.

Note: `watchArtLogic.ts` is named that (not `watchArt.ts`) because this
filesystem is case-insensitive (macOS default) while Vite's module
resolver tries extensions in `.ts`-before-`.tsx` order — a bare import
`./WatchArt` from a sibling file was silently resolving to the
lowercase-named logic module instead of the capitalized component file.
Keep component/logic sibling file names clearly distinct (not just a
case difference) anywhere else this pattern is used.

## Local dev against a running backend (added 2026-10-08, extended 2026-10-09)
Backend services in `gluon-local` (OrbStack k8s) have no local port map by
default — forward the one(s) you need:
```bash
kubectl port-forward -n gluon-local svc/catalog-service 8081:8080
kubectl port-forward -n gluon-local svc/cart-service 8082:8080
kubectl port-forward -n gluon-local svc/order-service 8083:8080
```
**Do not** point `.env`'s service URLs straight at those forwarded ports
(`VITE_CATALOG_SERVICE_URL=http://localhost:8081`) — catalog-service,
cart-service, and order-service all send no `Access-Control-Allow-Origin`
header, so the browser blocks the cross-origin `fetch()` even though the
server itself responds fine (curl works, browser throws `TypeError: Failed
to fetch`). Confirmed via `curl -i -H "Origin: http://localhost:5173" ...`
returning 200/201 with no ACAO header, for all three services.

Worked around with Vite dev-server proxy entries (`vite.config.ts`'s
`server.proxy`, one per service), so the browser's request stays
same-origin and Vite forwards it server-to-server (not subject to browser
CORS):
```
# .env (gitignored, not committed)
VITE_CATALOG_SERVICE_URL=/api/catalog
VITE_CART_SERVICE_URL=/api/cart
VITE_ORDER_SERVICE_URL=/api/order
```
Verified end-to-end for cart-service 2026-10-09 (track `cart_20261008`
Phase 2): clicking "Add to cart" in a real browser created a real cart via
`POST /carts` and persisted the item via `POST /carts/{id}/items`,
confirmed by re-fetching `GET /carts/{id}`.

Verified for order-service 2026-10-09 (track `checkout_20261009` Phase 2):
clicking "Checkout" in a real browser called the real `POST /orders`
through the proxy and got back a genuine `reservation_failed` response —
**`inventory-service` has no stock seeded for any sku** (`GET
/inventory/<sku>` returns 404 for real catalog skus), so every real
reservation currently fails. Cart correctly stayed un-cleared and showed
the "Some items are out of stock." error — this is gshop behaving
correctly against real (if unseeded) data, not a gshop bug. Noted in
`gluon`'s `backlogs/inventory-service.md`.

Verified the full success path too, Phase 4 2026-10-09: manually seeded
one sku (`POST /inventorys {"sku":"watch-rolex-submariner",
"quantityAvailable":5}` against the port-forwarded inventory-service) so
a real reservation could succeed. End-to-end in a real browser: Catalog →
Add to cart → View Cart → Checkout → real `POST /orders` with
`status: "pending"` (reservation succeeded) → Checkout screen showing the
correct order id/status/items/total → `gshop:cartId` cleared from
`localStorage` → "Continue Shopping" back to Catalog. No console errors
at any step. This seeded row is local-k8s test data only, not part of
the official seed script — it'll persist until `inventory-postgres`'s
volume is reset.

See `conductor/tracks.md`'s backlog item on local-k8s dev wiring — the CORS
gap is worth fixing upstream in these services (and payment-service, if it
ever gets a frontend-facing endpoint) rather than adding more proxy entries
per-service indefinitely — noted in `gluon`'s `backlogs/catalog-service.md`
and `backlogs/cart-service.md`.

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
