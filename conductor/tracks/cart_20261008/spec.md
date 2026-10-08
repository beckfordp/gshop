# Spec: US-2 Cart Screen

## Overview
Wire `cartClient` to cart-service's real endpoints; add an "Add to cart" button to the Catalog screen (deferred from US-1) and a new Cart screen (view/add-one-more/remove). App.tsx gets a simple state-based nav toggle between Catalog and Cart — no router.

## Functional Requirements
- `cartClient.ts`: real methods matching cart-service's contract — `create()` (POST /carts), `get(id)` (GET /carts/{id}), `addItem(id, sku, quantity)` (POST /carts/{id}/items), `removeItem(id, sku)` (DELETE /carts/{id}/items/{sku}). Typed `CartClientError`, same pattern as `CatalogClientError`.
- New `src/services/cartId.ts`: `getOrCreateCartId()` — reads `gshop:cartId` from `localStorage`; if absent, calls `cartClient.create()` and persists the returned id. Only the id is stored client-side; contents always come from the server.
- Catalog screen: "Add to cart" button per item — click calls `getOrCreateCartId()` then `cartClient.addItem(id, sku, 1)`; brief inline feedback (e.g. button shows "Added" briefly) and inline error on failure.
- New `src/screens/Cart/Cart.tsx` + `.test.tsx` + `.css`:
  - No stored cart id → "Your cart is empty" (no API call).
  - Stored id → `GET /carts/{id}`, then join its `{sku: qty}` against a full catalog fetch (`catalogClient.list({limit: 100, offset: 0})` — covers today's ~10 items in one page) to show name + price per line; sku shown as fallback if a sku isn't found in the catalog (e.g. deleted item).
  - Each line: name, quantity, line price (`priceCents × qty`), "+1" button (`addItem`, qty 1) and "Remove" button (`removeItem`).
  - Computed cart total (sum of line prices).
  - Loading/error states with Retry, same pattern as Catalog screen.
- `App.tsx`: `useState<'catalog' | 'cart'>` screen toggle; simple nav ("View Cart" / "Back to Catalog" links).

## Non-Functional Requirements
- TDD per `workflow.md`.
- No new runtime dependencies (confirmed: no router).

## Acceptance Criteria
- "Add to cart" on a Catalog item increments that sku's quantity in the persistent cart; the cart id survives a page reload via `localStorage`.
- Cart screen shows each line's name/quantity/price and a correct total.
- "+1" increments an existing line; "Remove" deletes it entirely.
- Empty cart (no id yet, or id exists with no items) shows an empty-cart message.
- Failed requests (create/get/addItem/removeItem) show an inline error + working Retry.
- `cartClient.ts` exposes typed methods matching cart-service's real contract.

## Out of Scope
- Quantity decrement / set-to-exact-quantity — cart-service's HTTP API only supports increment and remove-entirely today (`setQuantity` exists in its store layer but isn't wired to a route). Possible future backend+frontend track.
- Checkout (US-3).
- A cart count/badge indicator elsewhere in the UI.
- Catalogs over 100 items (join assumes one page covers the whole catalog — fine at today's ~10-item scale, breaks beyond `catalogClient`'s max `limit`).
- Auth/user-specific carts (no session system exists in cart-service).
