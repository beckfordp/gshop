#!/usr/bin/env bash
# Verification for track admin-screen_20261010: Admin screen (order-history
# clear + inventory management). Run from the repo root.
set -euo pipefail

echo "== gshop verification: Admin screen =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm run test:coverage --"
npm run test:coverage

echo "All checks passed."
