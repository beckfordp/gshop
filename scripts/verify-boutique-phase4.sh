#!/usr/bin/env bash
# Phase 4 verification (track boutique-redesign_20261010): App shell header
# and nav restyle. Run from the repo root.
set -euo pipefail

echo "== gshop Phase 4 verification: App Shell / Nav =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm run test:coverage --"
npm run test:coverage

echo "All checks passed."
