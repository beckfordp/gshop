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

## Local dev against a running backend (added 2026-10-08, extended 2026-10-09)
Backend services in `gluon-local` (OrbStack k8s) have no local port map by
default — forward the one(s) you need:
```bash
kubectl port-forward -n gluon-local svc/catalog-service 8081:8080
kubectl port-forward -n gluon-local svc/cart-service 8082:8080
```
**Do not** point `.env`'s service URLs straight at those forwarded ports
(`VITE_CATALOG_SERVICE_URL=http://localhost:8081`) — neither catalog-service
nor cart-service sends an `Access-Control-Allow-Origin` header, so the
browser blocks the cross-origin `fetch()` even though the server itself
responds fine (curl works, browser throws `TypeError: Failed to fetch`).
Confirmed via `curl -i -H "Origin: http://localhost:5173" ...` returning 200
with no ACAO header, for both services.

Worked around with Vite dev-server proxy entries (`vite.config.ts`'s
`server.proxy`, one per service), so the browser's request stays
same-origin and Vite forwards it server-to-server (not subject to browser
CORS):
```
# .env (gitignored, not committed)
VITE_CATALOG_SERVICE_URL=/api/catalog
VITE_CART_SERVICE_URL=/api/cart
```
Verified end-to-end for cart-service 2026-10-09 (track `cart_20261008`
Phase 2): clicking "Add to cart" in a real browser created a real cart via
`POST /carts` and persisted the item via `POST /carts/{id}/items`,
confirmed by re-fetching `GET /carts/{id}`.

See `conductor/tracks.md`'s backlog item on local-k8s dev wiring — this
same gap will hit order-service next (US-3). Worth fixing CORS upstream in
these services (and siblings) rather than adding more proxy entries
per-service indefinitely — noted in `gluon`'s `backlogs/catalog-service.md`.
