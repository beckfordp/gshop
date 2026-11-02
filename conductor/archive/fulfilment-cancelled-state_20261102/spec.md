# Specification: fulfilment `CANCELLED` state in the admin screen

## Overview

fulfilment-service gains a terminal `CANCELLED` state (US-9.5). The admin
screen types its states as an exhaustive union/record, so without a matching
change a cancelled task renders a blank badge and is treated as active.

## Functional Requirements

- `FulfilmentState` gains `'CANCELLED'`.
- `STATE_LABELS` maps it to "Cancelled"; `isTerminalState` returns true.
- The card shows "Cancelled before dispatch" and no action buttons.
- A badge style distinguishes it from the active states.

## Acceptance Criteria

- A `CANCELLED` task renders the label, outcome text and no actions.
- Existing states are unchanged; `npm test`, lint and build green.

## Out of Scope

Order History cancellation action (US-9.8) and any backend change.
