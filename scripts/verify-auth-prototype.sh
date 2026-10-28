#!/usr/bin/env bash
# Verification for track auth-prototype_20261028 (US-16.5 prototype).
# Run from the repo root. The mock-auth UI has no backend, so build/lint/tests
# plus a live browser walkthrough are the whole check.
set -euo pipefail

echo "== gshop auth prototype verification =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm test --"
CI=true npm test

echo "-- npm run test:coverage --"
CI=true npm run test:coverage

echo "All checks passed."
