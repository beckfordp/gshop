# gshop

The first frontend app on the Gluon platform. Walks a user through the
shopping workflow — browse catalog → cart → checkout → order status — by
calling the real backend services directly, no mock data. Intended to be
one of potentially many frontend apps the platform hosts simultaneously
(see `../README.md`).

Scaffolded with Vite + React + TypeScript, per
[ADR 0006](../../docs/adr/0006-react-frontend-framework.md) in the `gluon`
platform repo. This repo owns its own source, its own `Dockerfile`
(not yet added — see `gluon/PLAN.md`'s local-k8s phase), and its own CI;
`gluon` itself holds only the cross-cutting docs/ADRs and the shared infra
— see [ADR 0007](../../docs/adr/0007-platform-repo-vs-hosted-workloads.md).

## Backend services

Design reference: `gluon/prototype/storefront.html` (mock data, not
reused code — see ADR 0006's Consequences). Real contracts: `gluon/docs/
system-design.md`.

| Service | Client | Status |
|---|---|---|
| catalog-service | `src/services/catalogClient.ts` | base URL + health only — browse screen not built yet |
| cart-service | `src/services/cartClient.ts` | base URL + health only — cart screen not built yet |
| order-service | `src/services/orderClient.ts` | base URL + health only — checkout/status screens not built yet |
| inventory-service | `src/services/inventoryClient.ts` | likely called only server-side by order-service, not directly — kept for symmetry |
| payment-service | `src/services/paymentClient.ts` | fully event-driven today, no documented frontend-facing endpoint — kept for symmetry |

Base URLs are read from Vite env vars (`VITE_<NAME>_SERVICE_URL`, see
`src/services/env.ts`) — there's no documented local port map yet for
running every service at once, so set these in a local `.env` (gitignored)
before running against real backends.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check + production build
- `npm run lint` — ESLint

## Status

Scaffold only — no real UI screens yet. Next: seed `conductor/tracks.md`
from the UI-side tasks in `../../backlogs/gshop-frontend.md` and start
building against US-1 (`../../docs/user-stories.md`).
