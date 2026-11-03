# TD-24 — admin stock adjust sends quantityAvailable only

## Overview
The Catalogue admin's stock −1/+1 PATCHed `{quantityAvailable, quantityReserved}` using the
reserved value read at page load, overwriting any reservation made since (gluon TD-24).
inventory-service now owns `quantityReserved` via its ledger and ignores a sent value
(inventory-service track `td24-ledger-only-reserved_20261103`); gshop stops sending it.

## Functional Requirements
- FR1: `inventoryClient.adjust(id, quantityAvailable)` PATCHes `{quantityAvailable}` only.
- FR2: `CatalogueAdmin` ±1 calls `adjust(stock.id, stock.quantityAvailable + delta)` and renders
  the returned row (reserved comes from the server).

## Acceptance Criteria
- `inventoryClient` and `CatalogueAdmin` tests assert the new call/body; `npm test`, lint,
  `format:check`, build green.
- Live: ±1 in the running admin changes available, reserved unchanged.

## Out of Scope
- Lost updates on `quantityAvailable` itself (absolute value from page load).
