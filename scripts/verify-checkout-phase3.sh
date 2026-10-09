#!/usr/bin/env bash
# Phase 3 verification (track checkout_20261009): Checkout screen. Run
# from the repo root.
set -euo pipefail

echo "== gshop Phase 3 verification: Checkout screen =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm test --"
npm test

echo "All checks passed."
echo "Note: Checkout screen is not yet reachable in the running app (no nav"
echo "wiring until Phase 4) — live browser click-through deferred to"
echo "Phase 4's checkpoint."
