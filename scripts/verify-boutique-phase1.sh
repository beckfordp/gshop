#!/usr/bin/env bash
# Phase 1 verification (track boutique-redesign_20261010): design tokens +
# WatchArt component. Run from the repo root.
set -euo pipefail

echo "== gshop Phase 1 verification: Design Tokens + WatchArt Component =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm run test:coverage --"
npm run test:coverage

echo "All checks passed."
