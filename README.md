# gshop

The first frontend app on the Gluon platform. Walks a user through the
shopping workflow — browse catalog → cart → checkout → order status — by
calling the real backend services directly, except the opt-in checkout
prototype mock described below. Intended to be
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
| catalog-service | `src/services/catalogClient.ts` | live — Catalog screen |
| cart-service | `src/services/cartClient.ts` | live — Cart screen |
| order-service | `src/services/orderClient.ts` | live — Checkout (`POST /orders`, extended with address/payment method), Order History |
| inventory-service | `src/services/inventoryClient.ts` | live — Admin screen stock table |
| payment-service | `src/services/paymentClient.ts` | live once the backend lands — `POST /payments/methods` (US-13); mocked in prototype mode |

Base URLs are read from Vite env vars (`VITE_<NAME>_SERVICE_URL`, see
`src/services/env.ts`) — there's no documented local port map yet for
running every service at once, so set these in a local `.env` (gitignored)
before running against real backends.

## Checkout prototype (mock mode)

The checkout form can run without the US-11–US-14 backend contracts:

```sh
VITE_CHECKOUT_MOCK=true npm run dev
```

A dev-only "Prototype scenario" control then drives the in-browser mock:
normal, some items unavailable, card declined, service error. Cards ending
`0002` also decline; `0003` reports an unavailable item. The mock returns
the target response shape (`authorized` / `payment_failed` /
`reservation_failed` with ephemeral failure detail) and never stores or
logs the card number.

Prototype caveat: collecting a raw PAN in browser state is acceptable only
for the simulator. A real provider integration needs hosted fields or
provider-side tokenization.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check + production build
- `npm run lint` — ESLint

## Status

Catalog, Cart, Checkout (form + confirmation), Order History, and Admin
screens are live. Checkout collects shipping/billing addresses and card
details; submission is prototyped against the in-browser mock until
payment-service/order-service implement `POST /payments/methods`,
`POST /payments/authorize`, and the extended `POST /orders` contract. See
`gluon/docs/system-design.md`'s "REST contracts" and Checkout Journey 1.
