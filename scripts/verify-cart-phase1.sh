#!/usr/bin/env bash
# Phase 1 verification (track cart_20261008): cartClient + cart identity.
# Run from the repo root.
set -euo pipefail

echo "== gshop Phase 1 verification: cartClient + cart identity =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm test --"
npm test

echo "All checks passed."
