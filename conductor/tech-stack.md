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
