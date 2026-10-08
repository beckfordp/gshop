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

- US-2: cart screen, wire cartClient to real endpoints
- US-3: checkout screen, wire orderClient to real endpoints
- US-8: order status/history screen, wire orderClient to real endpoints
- Confirm whether inventoryClient/paymentClient are needed at all, or drop
  them — per system-design.md, both look server-to-server/event-driven
  only today, no documented frontend-facing endpoint
- Wire local dev against the real local-k8s deployment (`bin/k8s-local-up`,
  `gluon-local` namespace) via `kubectl port-forward` per service — partially
  done manually for catalog-service (2026-10-08) while verifying US-1, see
  below; what's left is doing this properly for cart/order (US-2/US-3/US-8)
  and deciding if it should be scripted (e.g. a `docs`/`.env.example` +
  helper script) instead of done by hand each time.
  **Important discovery**: pointing `.env` at the port-forwarded URL
  directly (`VITE_CATALOG_SERVICE_URL=http://localhost:<port>`) does NOT
  work from a browser — catalog-service sends no `Access-Control-Allow-Origin`
  header, so the browser blocks the cross-origin `fetch()` (confirmed via
  curl working fine, browser throwing `TypeError: Failed to fetch`). Worked
  around for catalog-service via a Vite dev-server proxy instead (see
  `vite.config.ts`'s `server.proxy` and `tech-stack.md`) — browser calls a
  same-origin relative path, Vite forwards it server-to-server, no CORS
  involved. This same gap will hit every other service's client too
  (cart/order next) unless catalog-service's CORS gap gets fixed upstream in
  the `gluon` platform repo — worth raising there rather than re-solving
  per-service with more proxy entries indefinitely.

---
