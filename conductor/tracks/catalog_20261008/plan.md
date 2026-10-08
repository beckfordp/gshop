# Plan: US-1 Browse Catalog Screen

## Phase 1: Test Infrastructure
- [ ] Task: Add Vitest + @testing-library/react + @testing-library/jest-dom + jsdom to `package.json` devDependencies; add `test`/`test:coverage` scripts; configure `vite.config.ts` (`test` block: environment `jsdom`, setup file for jest-dom matchers)
- [ ] Task: Conductor - User Manual Verification 'Test Infrastructure' (Protocol in workflow.md)

## Phase 2: catalogClient.list()
- [ ] Task: Write failing tests for `catalogClient.list({limit, offset})` in `src/services/catalogClient.test.ts` — covers: correct URL/query params built, parses `CatalogResponse[]` body + `X-Total-Count` header into `{items, total}`, throws/returns typed error on non-2xx and on network failure (Red)
- [ ] Task: Implement `catalogClient.list()` against real `GET /catalogs` contract — minimum code to pass (Green)
- [ ] Task: Refactor `catalogClient.ts` if needed; rerun tests
- [ ] Task: Conductor - User Manual Verification 'catalogClient.list()' (Protocol in workflow.md)

## Phase 3: Catalog screen
- [ ] Task: Write failing tests for `Catalog.tsx` in `src/screens/Catalog/Catalog.test.tsx` — covers: shows loading state on mount, renders fetched items (name/sku/formatted price), "Load more" fetches+appends next page then hides at total, initial-fetch error shows message+Retry that re-fetches, load-more error shows message+Retry (Red)
- [ ] Task: Implement `Catalog.tsx` + `Catalog.css` — minimum code to pass (Green)
- [ ] Task: Wire `App.tsx` to render `Catalog` screen, remove scaffold boilerplate
- [ ] Task: Refactor; rerun full test suite; check coverage (>80% target)
- [ ] Task: Conductor - User Manual Verification 'Catalog screen' (Protocol in workflow.md)
