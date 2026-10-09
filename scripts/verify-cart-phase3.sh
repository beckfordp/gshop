#!/usr/bin/env bash
# Phase 3 verification (track cart_20261008): Cart screen. Run from the
# repo root.
set -euo pipefail

echo "== gshop Phase 3 verification: Cart screen =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm test --"
npm test

echo "All checks passed."
echo "Note: Cart screen is not yet reachable in the running app (no nav"
echo "wiring until Phase 4) — live browser click-through deferred to"
echo "Phase 4's checkpoint, where the full Catalog -> Cart flow becomes"
echo "reachable end-to-end."
