# Spec: US-8 Order History

## Overview
Add an "Order History" screen showing all past orders for this anonymous customer, reachable from a nav button on Catalog/Cart/History itself. Introduces a new, checkout-independent customer identity so history survives across multiple checkouts (fixes a wrinkle in US-3's design: reusing the cart's id as customerId broke history, since checkout clears the cart id).

## Functional Requirements
- New `src/services/customerId.ts`: `getOrCreateCustomerId()` (sync, no server call — `crypto.randomUUID()` persisted to a new `gshop:customerId` localStorage key, created once, created if absent) and `getStoredCustomerId()` (read-only, returns null if absent — same get/getOrCreate split pattern as `cartId.ts`).
- `src/screens/Cart/Cart.tsx`: checkout's `customerId` field now comes from `getOrCreateCustomerId()` instead of the cart id. Cart id usage for cart operations (get/addItem/removeItem) is unchanged.
- `orderClient.ts`: new `list(customerId)` → `GET /orders?customerId=...` (already sorted newest-first server-side — no client-side sorting needed). Typed with the same `OrderClientError` pattern.
- New `src/screens/OrderHistory/OrderHistory.tsx` + `.test.tsx` + `.css`:
  - No stored customerId → "You have no past orders." (no API call), same pattern as Cart's empty state.
  - Stored customerId → `orderClient.list(customerId)`; each past order displayed like the Checkout screen (id, friendly status, line items, total) plus a formatted `createdAt` date.
  - Loading/error+Retry states, same pattern as the rest of the app.
- `App.tsx`: adds a fourth screen state `'history'`. Nav shows the *other* reachable screens, minus whichever is current (Checkout keeps its own dedicated "Continue Shopping" CTA, no nav buttons):
  - Catalog → [View Cart, Order History]
  - Cart → [Back to Catalog, Order History]
  - History → [Back to Catalog, View Cart]

## Non-Functional Requirements
- TDD per `workflow.md`.
- No new runtime dependencies (`crypto.randomUUID()` is a browser built-in).

## Acceptance Criteria
- A customerId is minted once (on first checkout) and reused for every subsequent checkout and history lookup, independent of the cart id's own lifecycle.
- Order History shows all past orders for that customerId, newest first, each with id/status/items/total/date.
- No past orders (or no customerId yet) shows an empty-state message, no API call.
- Failed history fetch shows inline error + working Retry.
- `orderClient.list()` matches order-service's real `GET /orders?customerId=` contract.

## Out of Scope
- Pagination (order-service's list endpoint has none today — fine at demo scale).
- Order status updates/cancellation (PATCH/PUT/DELETE endpoints exist server-side but aren't used here).
- Any UI distinction for orders placed before this customerId scheme existed (there are none yet — no track has shipped checkout with the old cart-id-as-customerId scheme to real users).
