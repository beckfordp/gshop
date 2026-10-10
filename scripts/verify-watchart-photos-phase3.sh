#!/usr/bin/env bash
# Phase 3 verification (track watchart-photos_20261010): full suite after
# swapping WatchArt to real Unsplash photos. Run from the repo root.
set -euo pipefail

echo "== gshop Phase 3 verification: full suite =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm run test:coverage --"
npm run test:coverage

echo "All checks passed."
