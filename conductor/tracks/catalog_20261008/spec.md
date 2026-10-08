# Spec: US-1 Browse Catalog Screen

## Overview
Add a read-only "Browse Catalog" screen that lists products from catalog-service via `catalogClient`, with manual pagination. First real UI screen in gshop (replaces the Vite/React scaffold default in `App.tsx`).

## Functional Requirements
- New `src/screens/Catalog/Catalog.tsx` + co-located `Catalog.test.tsx` and `Catalog.css`, per `product-guidelines.md` file organization.
- On mount, fetch first page via `catalogClient.list({ limit: 20, offset: 0 })` (new method added to `catalogClient.ts`, replacing today's base-URL/health-check-only stub).
- Render each item: `name`, `sku`, price formatted from `priceCents` (cents → `$X.XX`).
- "Load more" button below the list: on click, fetch next page (`offset += 20`) and append results. Button hides once the list length reaches the total from the `X-Total-Count` response header.
- Loading state: show a simple loading indicator (text, e.g. "Loading...") during the initial fetch and during each "Load more" fetch (button shows a disabled/loading state).
- Error state (network failure, non-2xx, or 400 invalid-pagination from the server): show an inline error message in place of the list (initial load) or below the existing list (load-more failure), plus a "Retry" button that re-runs the same fetch.
- `App.tsx` renders the new `Catalog` screen (scaffold boilerplate removed).
- No add-to-cart action, no detail view/click-through, no search/filter/category UI — out of scope per answers above.

## Non-Functional Requirements
- No new runtime dependencies beyond what's already in `tech-stack.md` (React/Vite/TS) plus the test stack being added now (Vitest, @testing-library/react, @testing-library/jest-dom, jsdom) — all already flagged as "needed for the first track" in `tech-stack.md`.
- Follows TDD per `workflow.md`: failing tests before implementation for both `catalogClient`'s new method and the `Catalog` screen.

## Acceptance Criteria
- Loading the app shows the catalog list (name, sku, formatted price) fetched from `catalogClient`.
- Clicking "Load more" appends the next page; button disappears once all items are loaded.
- A failed fetch (initial or load-more) shows an error message and a working "Retry" button.
- `catalogClient.ts` exposes a typed `list()` method matching catalog-service's real `GET /catalogs` contract (limit/offset query params, `X-Total-Count` header, `CatalogResponse[]` body).

## Out of Scope
- Detail view / click-through to a single catalog item (`GET /catalogs/{id}`).
- Add-to-cart (deferred to US-2 track).
- Search, filtering, categories (no server-side support).
- Styling polish beyond basic plain CSS per `product-guidelines.md`.
