# Spec: US-3 Checkout

## Overview
Add a "Checkout" button to the Cart screen that places a real order via order-service, waits for the synchronous stock-reservation result, and only then either shows a new Checkout confirmation screen (success) or an inline error+Retry on the Cart screen itself (reservation failed or request error).

## Functional Requirements
- `orderClient.ts`: `create({customerId, items})` → `POST /orders`. Typed `OrderClientError`, same pattern as `CatalogClientError`/`CartClientError`. Only `create()` is needed — `GET /orders`/`GET /orders/{id}` are for US-8 (order history), out of scope here.
- `customerId`: reuse the existing cart id (`getStoredCartId()`) — no new identifier.
- Cart screen: new "Checkout" button below the total (shown only when the cart has ≥1 line). Clicking it:
  1. If any line has no resolved price (sku not found in the catalog join — e.g. a deleted product), block submission and show an inline error asking the user to remove that item first.
  2. Otherwise, show a waiting state ("Placing order...", button disabled) and call `orderClient.create({ customerId: cartId, items: [{sku, productName: name, unitPriceCents: priceCents, quantity}, ...] })`.
  3. On a response whose `status` is **not** `reservation_failed`: clear `gshop:cartId` from `localStorage` (next "Add to cart" starts a fresh cart) and navigate to the new Checkout screen with the created order's data.
  4. On `status === 'reservation_failed'`, or any request error (`OrderClientError`): stay on the Cart screen, show an inline error ("Some items are out of stock" for reservation_failed, the error message otherwise) + a "Retry" button that resubmits the same `POST /orders` call.
- New `src/screens/Checkout/Checkout.tsx` + `.test.tsx` + `.css`: pure display of the order just placed (id, status, line items, total) — passed in as a prop from `App.tsx`, not re-fetched. A "Continue Shopping" button returns to the Catalog screen.
- `App.tsx`: adds a third screen state `'checkout'` plus a `lastOrder` slot to pass the created order from Cart to Checkout (no router, no re-fetch needed since the data's already in hand).

## Non-Functional Requirements
- TDD per `workflow.md`.
- No new runtime dependencies.

## Acceptance Criteria
- Clicking "Checkout" with a valid cart shows a waiting state, then either the Checkout confirmation screen (reservation succeeded) or an inline error+Retry on the Cart screen (reservation failed / request error) — never a silent success message that hides a real stock problem.
- A successful checkout clears the local cart id; the next "Add to cart" starts a fresh cart.
- The Checkout screen shows the order's id, status, line items, and total, matching what order-service returned.
- `orderClient.create()` matches order-service's real `POST /orders` contract.

## Out of Scope
- Order history / listing past orders (US-8).
- Editing the order after creation (admin-style PATCH/PUT/DELETE endpoints exist server-side but aren't used here).
- Payment collection — order-service's `payment_failed` status comes from an async event gshop doesn't trigger or wait for.
- Preventing duplicate orders from repeated Retry clicks — order-service has no idempotency key; each Retry is a genuinely new `POST /orders`.
