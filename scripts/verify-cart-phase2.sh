#!/usr/bin/env bash
# Phase 2 verification (track cart_20261008): Add to cart button on the
# Catalog screen. Run from the repo root.
set -euo pipefail

echo "== gshop Phase 2 verification: Add to cart =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm test --"
npm test

echo "All checks passed."
