# Plan: ADM-7/8 — real-wired admin console

## Phase 1: Client

- [x] Task: Failing `adminClient.test.ts` (URLs/filters, merged queue with a
  failing service, token on writes, 409 surfaced, guest 404, missing URL);
  implement `adminClient.ts` and env vars.

## Phase 2: Console

- [x] Task: Failing `AdminConsole.test.tsx` (list + guest label + queue,
  resolve with note, detail ledger/fulfilment/emails, operator cancel,
  expire, refused cancel, ineligible order, customer email history, guest
  detail, retry); replace `WorkflowDemo` with `AdminConsole`, drop the mock.
- [x] Task: README/product.md; `vitest`, `tsc -b`, `eslint`, `build`.
- [x] Task: Conductor - User Manual Verification 'Console'
  (Protocol in workflow.md) — prompting off: suites green (280 passed);
  live walk-through is ADM-9's script.

## Review

- Reviewed 2026-11-02 (conductor:review): plan compliance yes; style pass;
  fixed a refresh that unmounted the open order detail (panels now blank
  only on first load). No blocking findings.
