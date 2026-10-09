#!/usr/bin/env bash
# Phase 2 verification (track history_20261009): Order History screen.
# Run from the repo root.
set -euo pipefail

echo "== gshop Phase 2 verification: Order History screen =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm test --"
npm test

echo "All checks passed."
echo "Note: Order History screen is not yet reachable in the running app"
echo "(no nav wiring until Phase 3) — live browser click-through deferred"
echo "to Phase 3's checkpoint."
