#!/usr/bin/env bash
# Verification for track checkout-real-wiring_20261027 (Phases 1-4): the
# checkout form's client, gateway, mock and failure UI. Run from the repo root.
set -euo pipefail

echo "== gshop checkout real-wiring verification =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm test --"
CI=true npm test

echo "-- npm run test:coverage --"
CI=true npm run test:coverage

echo "All checks passed."
