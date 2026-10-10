# Spec: Admin Screen (Order History Clear + Inventory Management)

## Overview
Add a discreet, customer-hidden admin screen to gshop, reachable via a small text link tucked in a page corner (not in the main nav). Two features: (1) clear the current customer's order history, and (2) list real inventory rows with their remaining stock and adjust `quantityAvailable` per item. No auth/login — matches this demo app's existing no-auth architecture; the link is just visually out of the way.

**Backend gap found and being fixed as part of this track**: inventory-service has no way to list inventory rows or look up by sku (only `GET /inventorys/{id}` by internal UUID). Adding `GET /inventorys?sku=<optional>` (list all, or filter to one sku) to inventory-service (separate commit, in the `gluon` repo, same cross-repo pattern as the watch-catalog seed script).

## Functional Requirements
- **inventory-service**: new `GET /inventorys?sku=<optional>` endpoint — omitted `sku` returns all rows; present `sku` returns just that row (or an empty list). TDD, matching this service's existing route/store/test conventions.
- **gshop `inventoryClient.ts`**: real `list()` method wired to the new endpoint (currently a stub); new Vite proxy entry + `.env` var for inventory-service (doesn't have one yet).
- **gshop `orderClient.ts`**: new `remove(id)` method wired to the existing `DELETE /orders/{id}`.
- **Admin screen** (`src/screens/Admin/Admin.tsx`):
  - "Clear order history" button — lists the current customer's orders, confirms with the user, then deletes each one; shows success/error feedback. (Known caveat: order-service's 60s history-read cache isn't invalidated on delete, so Order History may briefly still show cleared orders — noted in the UI copy or just accepted as a known quirk.)
  - Inventory table — sku, name (joined from catalog), quantity available, quantity reserved (read-only). "+1"/"−1" buttons adjust `quantityAvailable` via `PATCH /inventorys/{id}` (sending the unchanged `quantityReserved` alongside, per that endpoint's full-pair contract); disabled at 0.
- **App shell**: small "Admin" text link added to the header, styled distinctly low-contrast/out of the way from "View Cart"/"Order History".

## Non-Functional Requirements
- No new npm dependency.
- Existing screens/tests unchanged except where noted above.
- New backend endpoint and new client methods covered by tests per this project's TDD standard.

## Acceptance Criteria
- Admin link is present but visually discreet; customers browsing normally wouldn't notice it.
- "Clear order history" prompts for confirmation, then empties the customer's order list (after any cache staleness window passes).
- Inventory table shows real rows from inventory-service with working +/− adjustment, live-verified.
- Build/lint/test green in both repos throughout.

## Out of Scope
- Any real authentication/access control.
- Creating new inventory rows for catalog skus that don't have one yet (only adjusting existing rows).
- Editing `quantityReserved` directly.
- Fixing order-service's cache-invalidation-on-delete gap (noted, not fixed — separate concern).
