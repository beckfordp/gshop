# Project Tracks

This file tracks all major tracks for the project.

---

## Tracks

---

## Backlog

Title-only placeholders for future tracks — not yet detailed (no spec/plan, no linked
folder), so `/conductor:implement` cannot pick these up by accident. Reorder freely as
priorities change. When ready to work on one, run `/conductor:newTrack <title>` to go
through the spec/plan questions and promote it into a real track above.

- US-8: order status/history screen, wire orderClient to real endpoints
- Drop `inventoryClient.ts` — confirmed unneeded during US-3: order-service
  calls inventory-service server-to-server itself (synchronous reservation
  inside `POST /orders`), gshop never calls it directly. See product.md's
  "Open question" section. `paymentClient.ts` stays an open question —
  revisit when a payment-collection story gets scoped (not US-3, which
  explicitly left payment out: `payment_failed` is an async status gshop
  doesn't trigger or wait for).
- Wire local dev against the real local-k8s deployment (`bin/k8s-local-up`,
  `gluon-local` namespace) via `kubectl port-forward` per service — done by
  hand for catalog-service, cart-service, and order-service (2026-10-08/09)
  while verifying US-1/US-2/US-3; what's left is deciding if this should be
  scripted (e.g. a `docs`/`.env.example` + helper script) instead of done
  by hand each time, and whether inventory-service needs the same treatment
  once something consumes it directly (US-8 doesn't).
  **Important discovery**: pointing `.env` at a port-forwarded URL directly
  (`VITE_CATALOG_SERVICE_URL=http://localhost:<port>`) does NOT work from a
  browser — none of catalog-service, cart-service, or order-service sends
  an `Access-Control-Allow-Origin` header, so the browser blocks the
  cross-origin `fetch()` (confirmed via curl working fine, browser throwing
  `TypeError: Failed to fetch`, for all three). Worked around with a Vite
  dev-server proxy entry per service instead (see `vite.config.ts`'s
  `server.proxy` and `tech-stack.md`) — browser calls a same-origin
  relative path, Vite forwards it server-to-server, no CORS involved. Also
  found while verifying US-3: `inventory-service` has no stock seeded for
  any sku, so every real order reservation fails (`reservation_failed`)
  until that's fixed. Both the CORS gap and the missing seed data are
  noted upstream in `gluon`'s `backlogs/catalog-service.md`,
  `backlogs/cart-service.md`, `backlogs/order-service.md`, and
  `backlogs/inventory-service.md` — worth raising there rather than
  re-solving per-service with more proxy entries indefinitely.

---
