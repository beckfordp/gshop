# Plan: Checkout Journey 7 — gshop cancel polish

## Phase 1: Copy, tests, mock parity

- [x] Task: Failing tests — 409 returns hint and cancelled status renders
  without a Cancel action (Red). (b9eb627)
- [x] Task: Update the 409 copy; add `shipped` to the mock reservation status
  and badge styling (Green). (b9eb627)
- [x] Task: Run the frontend tests/build/lint.
- [x] Task: Conductor - User Manual Verification 'Cancel polish'
  (Protocol in workflow.md)

## Review

- Reviewed 2026-11-02: plan compliance yes; component/mock tests, build and
  lint green (275 tests). 409 copy points at returns without implying a UI;
  cancelled-status test added; mock reservation union widened to `shipped`.
  No blocking findings.
