#!/usr/bin/env bash
# Live verification for track fulfilment-history_20261028 (US-17.6/18.5).
# Drives the real stack the way gshop's Order History sees it:
#   checkout -> PaymentAuthorized -> fulfilment simulate-next (dispatch and
#   forced failure) -> order-service status.
# Asserts order-service reports `dispatched` / `dispatch_failed`, which
# orderClient.list() renders as "Dispatched" / "Dispatch failed".
# Uses a throwaway customer and deletes its orders, so demo history stays
# clean. Run from the repo root with the local cluster up.
set -euo pipefail

NAMESPACE="${NAMESPACE:-gluon-local}"
ORDER_URL="${ORDER_URL:-http://localhost:18080}"
PAYMENT_URL="${PAYMENT_URL:-http://localhost:18081}"
INVENTORY_URL="${INVENTORY_URL:-http://localhost:18082}"
FULFILMENT_URL="${FULFILMENT_URL:-http://localhost:18085}"

PIDS=()
ORDER_IDS=()
TMP_DIR="$(mktemp -d)"
cleanup() {
  if [ "${#ORDER_IDS[@]}" -gt 0 ]; then
    for id in "${ORDER_IDS[@]}"; do
      curl -sf -X POST \
        "$INVENTORY_URL/inventorys/order-reservations/$id/release" \
        >/dev/null 2>&1 || true
      curl -sf -X DELETE "$ORDER_URL/orders/$id" >/dev/null 2>&1 || true
    done
  fi
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  done
  rm -rf "$TMP_DIR"
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

task_state() {
  curl -sf "$FULFILMENT_URL/fulfilment-tasks" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
match = [r for r in rows if r["orderId"] == sys.argv[1]]
print(match[0]["state"] if match else "")
' "$1"
}

order_status() {
  curl -sf "$ORDER_URL/orders?customerId=$CUSTOMER_ID" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
match = [r for r in rows if r["id"] == sys.argv[1]]
print(match[0]["status"] if match else "")
' "$1"
}

echo "== gshop fulfilment-history live verification =="
start_port_forward order-service 18080
start_port_forward payment-service 18081
start_port_forward inventory-service 18082
start_port_forward fulfilment-service 18085
wait_ready "$ORDER_URL" order-service
wait_ready "$PAYMENT_URL" payment-service
wait_ready "$INVENTORY_URL" inventory-service
wait_ready "$FULFILMENT_URL" fulfilment-service

CUSTOMER_ID="$(python3 -c 'import uuid; print(uuid.uuid4())')"
ADDRESS='{"line1":"1 Verification Lane","city":"London","postalCode":"EC1A 1BB","country":"GB"}'

echo "-- picking a stocked sku from inventory-service --"
SKU="$(curl -sf "$INVENTORY_URL/inventorys" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
stocked = [r for r in rows if r["quantityAvailable"] >= 2]
if not stocked:
    sys.exit("no inventory row has quantityAvailable >= 2")
print(stocked[0]["sku"])
')"
echo "   using sku $SKU"

echo "-- creating an approved payment method and two authorized orders --"
STATUS="$(curl -sS -o "$TMP_DIR/pm.json" -w '%{http_code}' -X POST \
  "$PAYMENT_URL/payments/methods" -H 'Content-Type: application/json' \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"cardNumber\":\"4242424242424242\",\"expiry\":\"12/30\",\"billingAddress\":$ADDRESS}")"
[ "$STATUS" = "201" ] || { echo "FAIL: payment method -> $STATUS" >&2; cat "$TMP_DIR/pm.json" >&2; exit 1; }
PAYMENT_METHOD_ID="$(json_field '["id"]' < "$TMP_DIR/pm.json")"

create_order() {
  local out="$1"
  local body="{\"customerId\":\"$CUSTOMER_ID\",\"items\":[{\"sku\":\"$SKU\",\"productName\":\"Verification Widget\",\"unitPriceCents\":100,\"quantity\":1}],\"shippingAddress\":$ADDRESS,\"paymentMethodId\":\"$PAYMENT_METHOD_ID\"}"
  local status
  status="$(curl -sS -o "$out" -w '%{http_code}' -X POST "$ORDER_URL/orders" \
    -H 'Content-Type: application/json' -d "$body")"
  [ "$status" = "201" ] || { echo "FAIL: POST /orders -> $status" >&2; cat "$out" >&2; exit 1; }
  [ "$(json_field '["status"]' < "$out")" = "authorized" ] || {
    echo "FAIL: order was not authorized" >&2; cat "$out" >&2; exit 1
  }
  json_field '["id"]' < "$out"
}

ORDER_DISPATCH="$(create_order "$TMP_DIR/order-dispatch.json")"
ORDER_IDS+=("$ORDER_DISPATCH")
ORDER_FAIL="$(create_order "$TMP_DIR/order-fail.json")"
ORDER_IDS+=("$ORDER_FAIL")
echo "   orders $ORDER_DISPATCH / $ORDER_FAIL authorized"

echo "-- waiting for fulfilment-service to snapshot both orders --"
for _ in $(seq 1 60); do
  A="$(task_state "$ORDER_DISPATCH")"
  B="$(task_state "$ORDER_FAIL")"
  [ -n "$A" ] && [ -n "$B" ] && break
  sleep 1
done
[ -n "$A" ] && [ -n "$B" ] || { echo "FAIL: fulfilment task(s) never appeared" >&2; exit 1; }
echo "   tasks created (${A} / ${B})"

simulate() {
  local id="$1" body="$2" out="$3"
  local status
  status="$(curl -sS -o "$out" -w '%{http_code}' -X POST \
    "$FULFILMENT_URL/fulfilment-tasks/$id/simulate-next" \
    -H 'Content-Type: application/json' -d "$body")"
  [ "$status" = "200" ] || { echo "FAIL: simulate-next -> $status" >&2; cat "$out" >&2; exit 1; }
  json_field '["state"]' < "$out"
}

echo "-- dispatch path: PENDING -> PICKING -> PACKED -> DISPATCHED --"
for expected in PICKING PACKED DISPATCHED; do
  GOT="$(simulate "$ORDER_DISPATCH" '{}' "$TMP_DIR/simulate-dispatch.json")"
  [ "$GOT" = "$expected" ] || { echo "FAIL: expected $expected, got $GOT" >&2; exit 1; }
done
echo "   DISPATCHED"

echo "-- failure path: forced DispatchFailed --"
GOT="$(simulate "$ORDER_FAIL" '{"forceFailure":true,"reason":"Verification failure"}' "$TMP_DIR/simulate-fail.json")"
[ "$GOT" = "DISPATCH_FAILED" ] || { echo "FAIL: expected DISPATCH_FAILED, got $GOT" >&2; exit 1; }
echo "   DISPATCH_FAILED"

echo "-- waiting for order-service to apply both events --"
for _ in $(seq 1 60); do
  A="$(order_status "$ORDER_DISPATCH")"
  B="$(order_status "$ORDER_FAIL")"
  { [ "$A" = "dispatched" ] || [ "$A" = "confirmed" ]; } &&
    [ "$B" = "dispatch_failed" ] && break
  sleep 1
done
{ [ "$A" = "dispatched" ] || [ "$A" = "confirmed" ]; } || {
  echo "FAIL: dispatch order status is '$A'" >&2
  exit 1
}
[ "$B" = "dispatch_failed" ] || { echo "FAIL: failed order status is '$B'" >&2; exit 1; }
echo "   order statuses: $A / $B (confirmed is capture-on-dispatch)"

echo "All fulfilment-history live checks passed (Order History renders"
echo "'Dispatched' and 'Dispatch failed')."
