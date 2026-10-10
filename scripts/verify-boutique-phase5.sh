#!/usr/bin/env bash
# Phase 5 verification (track boutique-redesign_20261010): 100-item catalog
# data. Checks gshop's own test suite stays green (no gshop source changed
# in this phase) and that the live catalog-service now reports 100 items
# with no sku collisions. Run from the repo root, with catalog-service
# reachable at CATALOG_SERVICE_URL (default http://localhost:8081, i.e. a
# `kubectl port-forward` to catalog-service already running).
set -euo pipefail

echo "== gshop Phase 5 verification: 100-item catalog data =="

echo "-- npm run build --"
npm run build

echo "-- npm run lint --"
npm run lint

echo "-- npm run test:coverage --"
npm run test:coverage

BASE_URL="${CATALOG_SERVICE_URL:-http://localhost:8081}"

echo "-- verifying live catalog-service has 100 items, no sku collisions --"
python3 - "$BASE_URL" <<'EOF'
import json
import sys
import urllib.request

base_url = sys.argv[1]
items = []
offset = 0
limit = 20
while True:
    with urllib.request.urlopen(f"{base_url}/catalogs?limit={limit}&offset={offset}") as resp:
        page = json.load(resp)
    if not page:
        break
    items.extend(page)
    offset += limit

skus = [item["sku"] for item in items]
assert len(items) == 100, f"expected 100 items, got {len(items)}"
assert len(set(skus)) == 100, f"expected 100 unique skus, got {len(set(skus))}"
print(f"OK: {len(items)} items, {len(set(skus))} unique skus")
EOF

echo "All checks passed."
