# Product Guide — gshop

## Context
Full cross-repo vision lives in the `gluon` platform repo, not here:
[`../../../docs/product.md`](../../../docs/product.md), [`../../../docs/system-design.md`](../../../docs/system-design.md),
[`../../../docs/user-stories.md`](../../../docs/user-stories.md),
[ADR 0006](../../../docs/adr/0006-react-frontend-framework.md) (React/TS/Vite choice),
[ADR 0007](../../../docs/adr/0007-platform-repo-vs-hosted-workloads.md) (gshop is a hosted workload, gluon is the platform).

## What this app does
The first frontend app on the Gluon platform — walks a user through the shopping
workflow (browse catalog → cart → checkout → order status) by calling the real
backend services directly (no mock data, no shared code with the
`prototype/storefront.html` design reference). Intended to be one of potentially
many frontend apps the platform hosts simultaneously.

## Domain model
None of its own — gshop is a pure client. It consumes five backend services'
REST APIs (catalog, cart, order, inventory, payment), whose contracts live in
gluon's `system-design.md`, not duplicated here. `src/services/*Client.ts` are
the thin per-service client modules (scaffolded, base URL + health check only
so far — see Status below).

## User stories in scope
From `../../../docs/user-stories.md` (UI realization, not new stories):
- **US-1** — Browse catalog
- **US-2** — Add to cart
- **US-3** — Checkout
- **US-8** — Order history / status

Out of scope: **US-7** (order status notifications) has no UI surface — it's
email-only, nothing for this app to call.

## Open question (flagged, not yet resolved)
Per `system-design.md`'s sync/async boundaries, `inventoryClient.ts` and
`paymentClient.ts` may be unneeded — both look server-to-server/event-driven
only, no documented frontend-facing endpoint. Confirm during US-3/US-8 work;
drop them if so (see `../../../backlogs/gshop-frontend.md`).

## Sequencing
Per `../../../PLAN.md`'s Phase 9 — depends on catalog-service, cart-service,
order-service's checkout + history endpoints (all already built in their own
repos). No ordering constraint between US-1/US-2/US-3/US-8 themselves beyond
what's natural to build and demo (browse before cart before checkout before
history).

## Status
Scaffold only (Vite + React + TypeScript) — no real UI screens yet. This
Conductor setup is what starts tracking that work.
