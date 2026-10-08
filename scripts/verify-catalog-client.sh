#!/usr/bin/env bash
# Phase 2 verification (track catalog_20261008): catalogClient.list() against
# catalog-service's real GET /catalogs contract. Run from the repo root.
set -euo pipefail

echo "== gshop Phase 2 verification: catalogClient.list() =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm test --"
npm test

echo "All checks passed."
