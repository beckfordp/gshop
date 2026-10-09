# Project Tracks

This file tracks all major tracks for the project.

---

## Tracks

- [~] **Track: US-3: checkout screen, wire orderClient to real endpoints**
  *Link: [./tracks/checkout_20261009/](./tracks/checkout_20261009/)*

---

## Backlog

Title-only placeholders for future tracks — not yet detailed (no spec/plan, no linked
folder), so `/conductor:implement` cannot pick these up by accident. Reorder freely as
priorities change. When ready to work on one, run `/conductor:newTrack <title>` to go
through the spec/plan questions and promote it into a real track above.

- US-8: order status/history screen, wire orderClient to real endpoints
- Confirm whether inventoryClient/paymentClient are needed at all, or drop
  them — per system-design.md, both look server-to-server/event-driven
  only today, no documented frontend-facing endpoint
- Wire local dev against the real local-k8s deployment (`bin/k8s-local-up`,
  `gluon-local` namespace) via `kubectl port-forward` per service — done by
  hand for catalog-service and cart-service (2026-10-08/09) while verifying
  US-1/US-2; what's left is order-service (US-3) and deciding if this
  should be scripted (e.g. a `docs`/`.env.example` + helper script) instead
  of done by hand each time.
  **Important discovery**: pointing `.env` at a port-forwarded URL directly
  (`VITE_CATALOG_SERVICE_URL=http://localhost:<port>`) does NOT work from a
  browser — neither catalog-service nor cart-service sends an
  `Access-Control-Allow-Origin` header, so the browser blocks the
  cross-origin `fetch()` (confirmed via curl working fine, browser throwing
  `TypeError: Failed to fetch`, for both services). Worked around with a
  Vite dev-server proxy entry per service instead (see `vite.config.ts`'s
  `server.proxy` and `tech-stack.md`) — browser calls a same-origin
  relative path, Vite forwards it server-to-server, no CORS involved. This
  same gap will hit order-service next (US-3) unless CORS gets fixed
  upstream in the `gluon` platform repo — noted there in
  `backlogs/catalog-service.md` and `backlogs/cart-service.md`, worth
  raising rather than re-solving per-service with more proxy entries
  indefinitely.

---
