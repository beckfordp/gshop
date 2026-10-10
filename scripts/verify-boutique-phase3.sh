#!/usr/bin/env bash
# Phase 3 verification (track boutique-redesign_20261010): Cart, Checkout,
# and Order History restyled with WatchArt thumbnails. Run from the repo root.
set -euo pipefail

echo "== gshop Phase 3 verification: Cart, Checkout, Order History =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm run test:coverage --"
npm run test:coverage

echo "All checks passed."
