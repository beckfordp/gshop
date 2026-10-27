#!/usr/bin/env bash
# Live verification for track checkout-real-wiring_20261027 (Phase 5).
# Drives the real order-service/payment-service/inventory-service contracts
# through port-forwards, exactly as gshop's checkout gateway does:
#   create payment method -> POST /orders -> 201 / 402 / 409 / 400.
# Uses a throwaway customer id and releases + deletes the successful order,
# so demo inventory/history are left clean. Run from the repo root.
set -euo pipefail

NAMESPACE="${NAMESPACE:-gluon-local}"
ORDER_URL="${ORDER_URL:-http://localhost:18080}"
PAYMENT_URL="${PAYMENT_URL:-http://localhost:18081}"
INVENTORY_URL="${INVENTORY_URL:-http://localhost:18082}"

PIDS=()
cleanup() {
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT

start_port_forward() {
  local service="$1" port="$2"
  kubectl -n "$NAMESPACE" port-forward "svc/$service" "$port:8080" >/dev/null 2>&1 &
  PIDS+=("$!")
}

wait_ready() {
  local url="$1" name="$2"
  for _ in $(seq 1 30); do
    if curl -sf "$url/health/ready" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "FAIL: $name never became ready at $url" >&2
  exit 1
}

json_field() {
  python3 -c "import json,sys; print(json.load(sys.stdin)$1)" 2>/dev/null
}

echo "== checkout real-wiring live verification =="
start_port_forward order-service 18080
start_port_forward payment-service 18081
start_port_forward inventory-service 18082
wait_ready "$ORDER_URL" order-service
wait_ready "$PAYMENT_URL" payment-service
wait_ready "$INVENTORY_URL" inventory-service

CUSTOMER_ID="$(python3 -c 'import uuid; print(uuid.uuid4())')"
ADDRESS='{"line1":"1 Verification Lane","city":"London","postalCode":"EC1A 1BB","country":"GB"}'

echo "-- picking a stocked sku from inventory-service --"
INVENTORY_JSON="$(curl -sf "$INVENTORY_URL/inventorys")"
SKU="$(printf '%s' "$INVENTORY_JSON" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
stocked = [r for r in rows if r["quantityAvailable"] > 0]
if not stocked:
    sys.exit("no inventory row has quantityAvailable > 0")
print(stocked[0]["sku"])
')"
echo "   using sku $SKU"

create_method() {
  local card="$1" out="$2"
  curl -sS -o "$out" -w '%{http_code}' -X POST "$PAYMENT_URL/payments/methods" \
    -H 'Content-Type: application/json' \
    -d "{\"customerId\":\"$CUSTOMER_ID\",\"cardNumber\":\"$card\",\"expiry\":\"12/30\",\"billingAddress\":$ADDRESS}"
}

post_order() {
  local body="$1" out="$2"
  curl -sS -o "$out" -w '%{http_code}' -X POST "$ORDER_URL/orders" \
    -H 'Content-Type: application/json' -d "$body"
}

history_count() {
  curl -sf "$ORDER_URL/orders?customerId=$CUSTOMER_ID" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))'
}

echo "-- 201: approved card authorizes and persists an order --"
STATUS="$(create_method "4242424242424242" /tmp/gshop-pm-approve.json)"
[ "$STATUS" = "201" ] || { echo "FAIL: payment method returned $STATUS" >&2; cat /tmp/gshop-pm-approve.json >&2; exit 1; }
APPROVE_PM="$(json_field '["id"]' < /tmp/gshop-pm-approve.json)"
ORDER_BODY="{\"customerId\":\"$CUSTOMER_ID\",\"items\":[{\"sku\":\"$SKU\",\"productName\":\"Verification Widget\",\"unitPriceCents\":100,\"quantity\":1}],\"shippingAddress\":$ADDRESS,\"paymentMethodId\":\"$APPROVE_PM\"}"
STATUS="$(post_order "$ORDER_BODY" /tmp/gshop-order-ok.json)"
[ "$STATUS" = "201" ] || { echo "FAIL: expected 201, got $STATUS" >&2; cat /tmp/gshop-order-ok.json >&2; exit 1; }
ORDER_STATUS="$(json_field '["status"]' < /tmp/gshop-order-ok.json)"
[ "$ORDER_STATUS" = "authorized" ] || { echo "FAIL: expected authorized, got $ORDER_STATUS" >&2; exit 1; }
ORDER_ID="$(json_field '["id"]' < /tmp/gshop-order-ok.json)"
echo "   order $ORDER_ID authorized"

echo "-- cleanup: release reservation, delete order --"
curl -sf -X POST "$INVENTORY_URL/inventorys/order-reservations/$ORDER_ID/release" >/dev/null
curl -sf -X DELETE "$ORDER_URL/orders/$ORDER_ID" >/dev/null
[ "$(history_count)" = "0" ] || { echo "FAIL: history not empty after cleanup" >&2; exit 1; }

echo "-- 402: declining card returns the decline reason --"
STATUS="$(create_method "4000000000000002" /tmp/gshop-pm-decline.json)"
[ "$STATUS" = "201" ] || { echo "FAIL: payment method returned $STATUS" >&2; exit 1; }
DECLINE_PM="$(json_field '["id"]' < /tmp/gshop-pm-decline.json)"
DECLINE_BODY="{\"customerId\":\"$CUSTOMER_ID\",\"items\":[{\"sku\":\"$SKU\",\"productName\":\"Verification Widget\",\"unitPriceCents\":100,\"quantity\":1}],\"shippingAddress\":$ADDRESS,\"paymentMethodId\":\"$DECLINE_PM\"}"
STATUS="$(post_order "$DECLINE_BODY" /tmp/gshop-order-decline.json)"
[ "$STATUS" = "402" ] || { echo "FAIL: expected 402, got $STATUS" >&2; cat /tmp/gshop-order-decline.json >&2; exit 1; }
REASON="$(json_field '["paymentFailure"]["reason"]' < /tmp/gshop-order-decline.json)"
[ "$REASON" = "insufficient_funds" ] || { echo "FAIL: expected insufficient_funds, got $REASON" >&2; exit 1; }
[ "$(history_count)" = "0" ] || { echo "FAIL: declined checkout left an order row" >&2; exit 1; }
echo "   decline reason: $REASON"

echo "-- 409: every failed line is reported in one response --"
CONFLICT_BODY="{\"customerId\":\"$CUSTOMER_ID\",\"items\":[{\"sku\":\"$SKU\",\"productName\":\"Verification Widget\",\"unitPriceCents\":100,\"quantity\":1000000},{\"sku\":\"does-not-exist\",\"productName\":\"Ghost\",\"unitPriceCents\":100,\"quantity\":1}],\"shippingAddress\":$ADDRESS,\"paymentMethodId\":\"$APPROVE_PM\"}"
STATUS="$(post_order "$CONFLICT_BODY" /tmp/gshop-order-conflict.json)"
[ "$STATUS" = "409" ] || { echo "FAIL: expected 409, got $STATUS" >&2; cat /tmp/gshop-order-conflict.json >&2; exit 1; }
FAILED_LINES="$(json_field '["reservationFailures"].__len__()' < /tmp/gshop-order-conflict.json)"
[ "$FAILED_LINES" = "2" ] || { echo "FAIL: expected 2 failed lines, got $FAILED_LINES" >&2; cat /tmp/gshop-order-conflict.json >&2; exit 1; }
[ "$(history_count)" = "0" ] || { echo "FAIL: rejected checkout left an order row" >&2; exit 1; }
echo "   failed lines: $FAILED_LINES"

echo "-- 400: an invalid paymentMethodId is rejected before reserving --"
BAD_BODY="{\"customerId\":\"$CUSTOMER_ID\",\"items\":[{\"sku\":\"$SKU\",\"productName\":\"Verification Widget\",\"unitPriceCents\":100,\"quantity\":1}],\"shippingAddress\":$ADDRESS,\"paymentMethodId\":\"not-a-uuid\"}"
STATUS="$(post_order "$BAD_BODY" /tmp/gshop-order-bad.json)"
[ "$STATUS" = "400" ] || { echo "FAIL: expected 400, got $STATUS" >&2; cat /tmp/gshop-order-bad.json >&2; exit 1; }
[ "$(history_count)" = "0" ] || { echo "FAIL: invalid checkout left an order row" >&2; exit 1; }

echo "All live checkout checks passed."
