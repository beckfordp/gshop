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
| payment-service | `src/services/paymentClient.ts` | live — `POST /payments/methods` (US-13) |
| user-service | `src/services/userClient.ts` | live — `POST /auth/signup`, `POST /auth/login` (US-16) |

Base URLs are read from Vite env vars (`VITE_<NAME>_SERVICE_URL`, see
`src/services/env.ts`) — there's no documented local port map yet for
running every service at once, so set these in a local `.env` (gitignored)
before running against real backends.

## Checkout mock mode (dev-only)

Checkout runs against real payment-service/order-service by default. To try
the UX without backends:

```sh
VITE_CHECKOUT_MOCK=true npm run dev
```

A dev-only "Prototype scenario" control then drives the in-browser mock:
normal, some items unavailable (reports two failed lines), card declined,
service error. Cards ending `0002` also decline; `0003` reports an
unavailable item. The mock returns the same result model as the real
contract — `authorized` / `declined` / `stock_unavailable`, with no order
on failure (ADR 0018) — and never stores or logs the card number.

Prototype caveat: collecting a raw PAN in browser state is acceptable only
for the simulator. A real provider integration needs hosted fields or
provider-side tokenization.

## Auth

Signup/login runs against the real user-service by default
(`POST /auth/signup`, `POST /auth/login`; set `VITE_USER_SERVICE_URL` like the
other service URLs). For offline UX work, `VITE_AUTH_MOCK=true` switches to
the in-browser mock instead.

- A prominent banner at the top of Checkout offers **Sign in** and **Create
  account**; auth opens as a modal dialog over the form (full-screen sheet on
  mobile; Esc/backdrop close, focus trapped and returned to the trigger).
- Order History shows a large identity header and a User/Anonymous badge on
  every card (mock-user join); anonymous orders show a short id.
- A signed-in user's shipping/billing address (and the "same as shipping"
  choice) is saved after a successful checkout and prefilled next time
  (`gshop:savedAddress:<userId>`); card details are never saved.
- Accounts and the fake session live in `localStorage` (`gshop:mockUsers`,
  `gshop:authSession`); the password is stored only as a SHA-256 hash and
  nothing leaves the browser.
- When signed in, the `userId` becomes the order's `customerId` and Order
  History reads that user's orders; signed out keeps the anonymous id. A
  per-browser identity registry powers the User/Anonymous badges.
- Sign up, wrong password, duplicate email, field validation and sign out are
  all reachable by hand for review.

The mock remains available only via `VITE_AUTH_MOCK=true`.

## Fulfilment (operator prototype, mock mode)

The operator order-processing screen runs on a seeded, localStorage-persisted
queue — fulfilment-service's operator REST is internal and not wired to gshop
yet (`VITE_FULFILMENT_MOCK=false` hides the screen).

- Admin → **Open order processing** lists the queue with customer, items,
  total and state: Pending → Picking → Packed → Dispatched, or Dispatch
  failed with a reason. Dispatch requires a tracking number + carrier;
  failure requires a reason. **Reset demo queue** restores the seed.
- Order History shows the real `Dispatched` / `Dispatch failed` / `Confirmed` /
  `Payment failed` statuses from order-service (US-17.6/18.5, US-19.5) — the
  old mock preview is gone.
- Queue state lives under `gshop:fulfilmentQueue`; nothing leaves the browser.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check + production build
- `npm run lint` — ESLint

## Status

Catalog, Cart, Checkout (form + confirmation), Order History, and Admin
screens are live. Signup/login is a mock-backed prototype pending
user-service (see "Auth prototype" above). Checkout collects shipping/billing addresses and card
details, creates a payment method, then submits the order against the real
`POST /orders` contract: `201` → confirmation, `402` → inline decline with
the card editable, `409` → every failed line with its own Remove action,
`400`/`503`/`500` → error. Failed attempts persist no order. See
`gluon/docs/system-design.md`'s "REST contracts" and Checkout Journey 1.
