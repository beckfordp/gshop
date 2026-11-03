# TD-24 Implementation Plan

## Phase 1 — Available-only stock adjust
- [ ] Task: `adjust` sends `quantityAvailable` only (FR1–FR2)
  - [ ] Red: `inventoryClient.test.ts` body `{quantityAvailable: 6}` via `adjust('inv-1', 6)`; `CatalogueAdmin.test.tsx` ±1 expect `adjust('inv-1', 6)` / `('inv-1', 0)`. Confirm failure.
  - [ ] Green: `inventoryClient.adjust(id, quantityAvailable)`; `CatalogueAdmin` call site.
  - [ ] Refactor; coverage.
- [ ] Task: Checks — `npm test`, `npm run lint`, `npm run format:check`, `npm run build`; live ±1 against gluon-local.
- [ ] Task: Conductor - User Manual Verification 'Phase 1 — Available-only stock adjust' (Protocol in workflow.md)
