# TD-24 Implementation Plan

## Phase 1 — Available-only stock adjust [checkpoint: f14ecb3]
- [x] Task: `adjust` sends `quantityAvailable` only (FR1–FR2) — efa4304
  - [x] Red: `inventoryClient.test.ts` body `{quantityAvailable: 6}` via `adjust('inv-1', 6)`; `CatalogueAdmin.test.tsx` ±1 expect `adjust('inv-1', 6)` / `('inv-1', 0)`. Confirm failure.
  - [x] Green: `inventoryClient.adjust(id, quantityAvailable)`; `CatalogueAdmin` call site.
  - [x] Refactor; coverage.
- [x] Task: Checks — `npm test`, `npm run lint`, `npm run format:check`, `npm run build`; live ±1 against gluon-local. — no code change (293/293, lint/format/build clean). Live browser ±1 NOT run: Chrome tab unresponsive (screenshot timeout); request body covered by tests, server-side ignore verified live in inventory-service track.
- [x] Task: Conductor - User Manual Verification 'Phase 1 — Available-only stock adjust' (Protocol in workflow.md)
