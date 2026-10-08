#!/usr/bin/env bash
# Phase 3 verification (track catalog_20261008): Catalog browse screen,
# wired into App.tsx. Run from the repo root.
set -euo pipefail

echo "== gshop Phase 3 verification: Catalog screen =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm run test:coverage --"
npm run test:coverage

echo "All checks passed."
