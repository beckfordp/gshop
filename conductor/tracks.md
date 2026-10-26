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

- US-11–US-14 real backend wiring — run the checkout form against real
  services: swap `VITE_CHECKOUT_MOCK` off once payment-service and
  order-service implement `POST /payments/methods`,
  `POST /payments/authorize` (taking `paymentMethodId`), and the extended
  `POST /orders` (shippingAddress/paymentMethodId). Checkout Journey 1 in
  `gluon/PLAN.md`.
---
