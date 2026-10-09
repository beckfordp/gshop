#!/usr/bin/env bash
# Phase 1 verification (track history_20261009): customerId service,
# orderClient.list(), and Cart's checkout customerId source update. Run
# from the repo root.
set -euo pipefail

echo "== gshop Phase 1 verification: customerId + orderClient.list() =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm test --"
npm test

echo "All checks passed."
