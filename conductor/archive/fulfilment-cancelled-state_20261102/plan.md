# Plan: fulfilment `CANCELLED` state

## Phase 1: UI + tests

- [x] Task: Failing test — CANCELLED card label/outcome/no actions (Red)
- [x] Task: Add union member, label, terminal handling, outcome text, badge CSS (Green)
- [x] Task: `npm test`, lint, build green
- [x] Task: Conductor - User Manual Verification 'UI + tests' (Protocol in workflow.md)

## Review (2026-11-02)

- `npm test` 256 passed; lint and production build green.
- CANCELLED renders its label/outcome and exposes no actions; live state
  observed via the expiry verify script.
- No blocking findings.
