#!/usr/bin/env bash
# Verification for track fulfilment-prototype_20261028 (Journey 3 prototype).
# Mock-only UI: build/lint/tests/coverage plus the manual browser review.
set -euo pipefail

echo "== gshop fulfilment prototype verification =="
npm run build
npm run lint
CI=true npm test
CI=true npm run test:coverage
echo "All checks passed."
