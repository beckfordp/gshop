# Product Guidelines — gshop

## Code style
ESLint config already in `eslint.config.js` (`@eslint/js` recommended +
`typescript-eslint` recommended + `react-hooks`/`react-refresh`) is the
enforced baseline — not restated here. Functional components + hooks only,
no class components (matches the scaffold's `App.tsx`).

`code_styleguides/typescript.md` (Google TypeScript Style Guide summary)
applies, with one exception: it says named exports only — keep **default
exports for React components** instead, matching the existing scaffold
(`App.tsx`) and `react-refresh`'s usual expectation. Everything else in
that guide applies as-is.

## File organization
- `src/services/` — one thin REST client module per backend service
  (already scaffolded: `catalogClient.ts`, `cartClient.ts`, `orderClient.ts`,
  `inventoryClient.ts`, `paymentClient.ts`, plus shared `env.ts`/`health.ts`).
  Each screen below imports only the client(s) it needs.
- `src/screens/` (new) — one folder per top-level screen (`Catalog/`,
  `Cart/`, `Checkout/`, `OrderHistory/`), each a `.tsx` + co-located
  `.test.tsx`.
- `src/components/` (new, as needed) — only once something is reused across
  ≥2 screens; don't pre-build a component library for a 4-screen app.

## API calls & state
- Extend each `*Client.ts` with real methods (replacing the current
  base-URL-plus-health-check stub) as each screen needs them — against the
  real service's own tapir-generated `/docs`, not guessed.
- Loading/error as local component state (`useState`) per screen — no
  global data-fetching library (React Query, etc.) introduced for a 4-screen
  app at this scale; revisit only if real duplication shows up.
- Cart state: lives in cart-service (Redis, server-side), not client state
  — gshop always reads/writes through `cartClient`, never a local cart
  store, so page refresh never loses it.

## Testing
No test framework is configured yet (scaffold has none). Add **Vitest** +
**React Testing Library** (`@testing-library/react`, `@testing-library/jest-dom`,
`jsdom`) — Vitest reuses the existing `vite.config.ts`, fastest fit, no
separate Jest config. Per the standing TDD workflow: a failing test before
implementation for every screen/client change.

## Styling
Plain CSS per screen (co-located `.css` file, matches the scaffold's
`App.css`/`index.css`) — no CSS framework/library added unless a real need
shows up across screens.
