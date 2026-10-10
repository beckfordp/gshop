#!/usr/bin/env bash
# Phase 2 verification (track boutique-redesign_20261010): Catalog screen
# restyled as a watch-boutique card grid. Run from the repo root.
set -euo pipefail

echo "== gshop Phase 2 verification: Catalog screen =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm run test:coverage --"
npm run test:coverage

echo "All checks passed."
