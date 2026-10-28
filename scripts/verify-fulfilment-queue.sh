#!/usr/bin/env bash
# Live verification for track fulfilment-queue_20261028.
# Drives the real operator API the way gshop's Admin -> Order processing
# screen sees it:
#   approved checkout -> PaymentAuthorized -> fulfilment task appears
#   start-picking -> pack -> dispatch  => DISPATCHED
#   start-picking -> fail              => DISPATCH_FAILED
# Asserts order-service reaches `dispatched`/`confirmed` for the dispatched
# order and `dispatch_failed` for the failed one, then deletes the throwaway
# order/payment/fulfilment rows and releases inventory. Run from the repo
# root with the local cluster up.
set -euo pipefail

NAMESPACE="${NAMESPACE:-gluon-local}"
ORDER_URL="${ORDER_URL:-http://localhost:18080}"
PAYMENT_URL="${PAYMENT_URL:-http://localhost:18081}"
INVENTORY_URL="${INVENTORY_URL:-http://localhost:18082}"
FULFILMENT_URL="${FULFILMENT_URL:-http://localhost:18085}"

PIDS=()
ORDER_IDS=()
CUSTOMER=""
TMP_DIR="$(mktemp -d)"
cleanup() {
  if [ "${#ORDER_IDS[@]}" -gt 0 ]; then
    for id in "${ORDER_IDS[@]}"; do
      curl -sf -X POST \
        "$INVENTORY_URL/inventorys/order-reservations/$id/release" \
        >/dev/null 2>&1 || true
      curl -sf -X DELETE "$ORDER_URL/orders/$id" >/dev/null 2>&1 || true
      kubectl exec -n "$NAMESPACE" deploy/fulfilment-postgres -- \
        psql -U fulfilment -d fulfilment -q -c \
        "delete from outbox_events where aggregate_id = '$id'; delete from fulfilment_task where order_id = '$id'" \
        >/dev/null 2>&1 || true
      kubectl exec -n "$NAMESPACE" deploy/payment-postgres -- \
        psql -U payment -d payment -q -c \
        "delete from outbox_events where aggregate_id = '$id'; delete from payment where order_id = '$id'" \
        >/dev/null 2>&1 || true
    done
  fi
  if [ -n "$CUSTOMER" ]; then
    kubectl exec -n "$NAMESPACE" deploy/payment-postgres -- \
      psql -U payment -d payment -q -c \
      "delete from payment_methods where customer_id = '$CUSTOMER'" \
      >/dev/null 2>&1 || true
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

task_field() {
  curl -sf "$FULFILMENT_URL/fulfilment-tasks" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
match = [r for r in rows if r["orderId"] == sys.argv[1]]
print(match[0][sys.argv[2]] if match else "")
' "$1" "$2"
}

order_status() {
  curl -sf "$ORDER_URL/orders?customerId=$CUSTOMER" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
match = [r for r in rows if r["id"] == sys.argv[1]]
print(match[0]["status"] if match else "")
' "$1"
}

action() {
  local id="$1" action_name="$2" expected="$3" body="${4:-}"
  local out="$TMP_DIR/action-$action_name.json"
  local status
  if [ -n "$body" ]; then
    status="$(curl -sS -o "$out" -w '%{http_code}' -X POST \
      "$FULFILMENT_URL/fulfilment-tasks/$id/$action_name" \
      -H 'Content-Type: application/json' -d "$body")"
  else
    status="$(curl -sS -o "$out" -w '%{http_code}' -X POST \
      "$FULFILMENT_URL/fulfilment-tasks/$id/$action_name")"
  fi
  [ "$status" = "200" ] || { echo "FAIL: $action_name -> $status" >&2; cat "$out" >&2; exit 1; }
  local got
  got="$(json_field '["state"]' < "$out")"
  [ "$got" = "$expected" ] || { echo "FAIL: $action_name expected $expected, got $got" >&2; exit 1; }
  echo "   $action_name -> $got" >&2
  echo "$out"
}

echo "== gshop fulfilment-queue live verification =="
start_port_forward order-service 18080
start_port_forward payment-service 18081
start_port_forward inventory-service 18082
start_port_forward fulfilment-service 18085
wait_ready "$ORDER_URL" order-service
wait_ready "$PAYMENT_URL" payment-service
wait_ready "$INVENTORY_URL" inventory-service
wait_ready "$FULFILMENT_URL" fulfilment-service

CUSTOMER="$(python3 -c 'import uuid; print(uuid.uuid4())')"
ADDRESS='{"line1":"1 Verification Lane","city":"London","postalCode":"EC1A 1BB","country":"GB"}'
TRACKING="GLN-VERIFY-$(python3 -c 'import uuid; print(str(uuid.uuid4())[:8].upper())')"

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
  -d "{\"customerId\":\"$CUSTOMER\",\"cardNumber\":\"4242424242424242\",\"expiry\":\"12/30\",\"billingAddress\":$ADDRESS}")"
[ "$STATUS" = "201" ] || { echo "FAIL: payment method -> $STATUS" >&2; cat "$TMP_DIR/pm.json" >&2; exit 1; }
PAYMENT_METHOD_ID="$(json_field '["id"]' < "$TMP_DIR/pm.json")"

create_order() {
  local out="$1"
  local body="{\"customerId\":\"$CUSTOMER\",\"items\":[{\"sku\":\"$SKU\",\"productName\":\"Verification Widget\",\"unitPriceCents\":100,\"quantity\":1}],\"shippingAddress\":$ADDRESS,\"paymentMethodId\":\"$PAYMENT_METHOD_ID\"}"
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
  A="$(task_field "$ORDER_DISPATCH" state)"
  B="$(task_field "$ORDER_FAIL" state)"
  [ "$A" = "PENDING" ] && [ "$B" = "PENDING" ] && break
  sleep 1
done
[ "$A" = "PENDING" ] && [ "$B" = "PENDING" ] || {
  echo "FAIL: fulfilment tasks not PENDING (${A:-none} / ${B:-none})" >&2; exit 1
}
echo "   both tasks PENDING"

echo "-- operator dispatch path --"
action "$ORDER_DISPATCH" start-picking PICKING >/dev/null
action "$ORDER_DISPATCH" pack PACKED >/dev/null
DISPATCH_OUT="$(action "$ORDER_DISPATCH" dispatch DISPATCHED \
  "{\"trackingNo\":\"$TRACKING\",\"carrier\":\"DHL Express\"}")"
[ "$(json_field '["trackingNo"]' < "$DISPATCH_OUT")" = "$TRACKING" ] || {
  echo "FAIL: dispatch response lost the tracking number" >&2; exit 1
}

echo "-- operator failure path --"
action "$ORDER_FAIL" start-picking PICKING >/dev/null
FAIL_OUT="$(action "$ORDER_FAIL" fail DISPATCH_FAILED '{"reason":"Verification failure"}')"
[ "$(json_field '["failureReason"]' < "$FAIL_OUT")" = "Verification failure" ] || {
  echo "FAIL: failure reason not recorded" >&2; exit 1
}

echo "-- waiting for order-service to apply both events --"
for _ in $(seq 1 60); do
  A="$(order_status "$ORDER_DISPATCH")"
  B="$(order_status "$ORDER_FAIL")"
  { [ "$A" = "dispatched" ] || [ "$A" = "confirmed" ]; } \
    && [ "$B" = "dispatch_failed" ] && break
  sleep 1
done
{ [ "$A" = "dispatched" ] || [ "$A" = "confirmed" ]; } || {
  echo "FAIL: dispatch order status is '$A'" >&2; exit 1
}
[ "$B" = "dispatch_failed" ] || { echo "FAIL: failed order status is '$B'" >&2; exit 1; }
echo "   order statuses: $A / dispatch_failed"

echo "All fulfilment-queue live checks passed (gshop's Order processing screen"
echo "can list and drive real fulfilment tasks)."
