# Specification: drop retired order statuses from gshop

## Overview

order-service retired `pending`/`reserved`/`reservation_failed` (TD-21).
gshop must stop type-checking/fixturing them while keeping fulfilment
`PENDING` and inventory reservation wording.

## Requirements

- Remove the three values from the `OrderStatus` union.
- Move tests/fixtures to live statuses (`authorized`, `confirmed`,
  `cancelled`, `payment_failed`, `dispatch_failed`).
- Remove the stale "checkouts return reservation_failed" product claim.
- `npm test`, lint and build green.
