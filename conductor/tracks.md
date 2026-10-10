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

- Checkout's `reservation_failed` handling currently shows a generic
  inline error + Retry (`Cart.tsx`'s checkout button) — doesn't yet read
  the structured `reservationFailure: {sku, reason}` field on the
  `POST /orders` response (see `gluon/docs/system-design.md`'s REST
  contracts, added 2026-10-09) to show *which* item failed and *why*, or
  point the customer back to this same Cart screen to remove that
  specific item (the existing "Remove" per line) before retrying. That
  remove-and-retry loop is the actual recovery path the design relies on
  — `reservationFailure` is deliberately ephemeral (not persisted, only
  present on the response that failed), so this detail has to be captured
  and shown at that moment, not re-fetched from `GET /orders/{id}` later.
- Drop `inventoryClient.ts` — confirmed unneeded during US-3: order-service
  calls inventory-service server-to-server itself (synchronous reservation
  inside `POST /orders`), gshop never calls it directly. See product.md's
  "Open question" section. `paymentClient.ts` stays an open question —
  revisit when a payment-collection story gets scoped (not US-3, which
  explicitly left payment out: `payment_failed` is an async status gshop
  doesn't trigger or wait for).
---
