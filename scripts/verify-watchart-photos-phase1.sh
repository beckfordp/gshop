#!/usr/bin/env bash
# Phase 1 verification (track watchart-photos_20261010): watchImages data +
# imageForSku lookup logic. Run from the repo root.
set -euo pipefail

echo "== gshop Phase 1 verification: Image data + lookup logic =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm run test:coverage --"
npm run test:coverage

echo "All checks passed."
