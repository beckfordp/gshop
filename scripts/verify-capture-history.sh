#!/usr/bin/env bash
# Live verification for track capture-history_20261028 (US-19.5).
# Drives the real stack the way gshop's Order History sees it:
#   checkout -> PaymentAuthorized -> fulfilment simulate-next (dispatch) ->
#   payment-service capture -> PaymentCaptured / PaymentFailed ->
#   order-service status.
# Asserts order-service reports `confirmed` for an approving card and
# `payment_failed` for the capture-decline card (5555 5555 5555 4444), which
# orderClient.list() renders as "Confirmed" / "Payment failed".
# Uses a throwaway customer and removes order/payment/fulfilment rows, so
# demo history stays clean. Run from the repo root with the local cluster up.
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

post_json() {
  curl -sS -o "$3" -w '%{http_code}' -X POST "$1" \
    -H 'Content-Type: application/json' -d "$2"
}

json_field() {
  python3 -c "import json,sys; print(json.load(sys.stdin)$1)" < "$2"
}

stocked_sku() {
  curl -sf "$INVENTORY_URL/inventorys" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
stocked = [r for r in rows if r["quantityAvailable"] >= 1]
if not stocked:
    sys.exit("no inventory row has quantityAvailable >= 1")
print(stocked[0]["sku"])
'
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
  curl -sf "$ORDER_URL/orders?customerId=$CUSTOMER" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
match = [r for r in rows if r["id"] == sys.argv[1]]
print(match[0]["status"] if match else "")
' "$1"
}

create_order() {
  local card="$1"
  local status
  status="$(post_json "$PAYMENT_URL/payments/methods" \
    "{\"customerId\":\"$CUSTOMER\",\"cardNumber\":\"$card\",\"expiry\":\"12/30\",\"billingAddress\":$ADDRESS}" \
    "$TMP_DIR/pm.json")"
  [ "$status" = "201" ] || { echo "FAIL: payment method -> $status" >&2; cat "$TMP_DIR/pm.json" >&2; exit 1; }
  local pm sku
  pm="$(json_field '["id"]' "$TMP_DIR/pm.json")"
  sku="$(stocked_sku)"
  status="$(post_json "$ORDER_URL/orders" \
    "{\"customerId\":\"$CUSTOMER\",\"items\":[{\"sku\":\"$sku\",\"productName\":\"Verification Watch\",\"unitPriceCents\":100,\"quantity\":1}],\"shippingAddress\":$ADDRESS,\"paymentMethodId\":\"$pm\"}" \
    "$TMP_DIR/order.json")"
  [ "$status" = "201" ] || { echo "FAIL: POST /orders -> $status" >&2; cat "$TMP_DIR/order.json" >&2; exit 1; }
  [ "$(json_field '["status"]' "$TMP_DIR/order.json")" = "authorized" ] || {
    echo "FAIL: order was not authorized" >&2; cat "$TMP_DIR/order.json" >&2; exit 1
  }
  json_field '["id"]' "$TMP_DIR/order.json"
}

drive_to_dispatch() {
  local order_id="$1"
  for _ in $(seq 1 60); do
    [ -n "$(task_state "$order_id")" ] && break
    sleep 1
  done
  [ -n "$(task_state "$order_id")" ] || {
    echo "FAIL: fulfilment task never appeared for $order_id" >&2; exit 1
  }
  local expected got status
  for expected in PICKING PACKED DISPATCHED; do
    status="$(post_json "$FULFILMENT_URL/fulfilment-tasks/$order_id/simulate-next" \
      '{}' "$TMP_DIR/simulate.json")"
    [ "$status" = "200" ] || {
      echo "FAIL: simulate-next for $order_id -> $status" >&2
      cat "$TMP_DIR/simulate.json" >&2
      exit 1
    }
    got="$(json_field '["state"]' "$TMP_DIR/simulate.json")"
    [ "$got" = "$expected" ] || {
      echo "FAIL: expected $expected for $order_id, got $got" >&2; exit 1
    }
  done
}

wait_order_status() {
  local order_id="$1" expected="$2" got=""
  for _ in $(seq 1 60); do
    got="$(order_status "$order_id")"
    [ "$got" = "$expected" ] && return 0
    sleep 1
  done
  echo "FAIL: order $order_id never became '$expected' (is '$got')" >&2
  exit 1
}

echo "== gshop capture-history live verification =="
start_port_forward order-service 18080
start_port_forward payment-service 18081
start_port_forward inventory-service 18082
start_port_forward fulfilment-service 18085
wait_ready "$ORDER_URL" order-service
wait_ready "$PAYMENT_URL" payment-service
wait_ready "$INVENTORY_URL" inventory-service
wait_ready "$FULFILMENT_URL" fulfilment-service

ADDRESS='{"line1":"1 Verification Lane","city":"London","postalCode":"EC1A 1BB","country":"GB"}'
CUSTOMER="$(python3 -c 'import uuid; print(uuid.uuid4())')"

echo "-- capture success path: approved card -> confirmed --"
ORDER_OK="$(create_order 4242424242424242)"
ORDER_IDS+=("$ORDER_OK")
drive_to_dispatch "$ORDER_OK"
wait_order_status "$ORDER_OK" confirmed
echo "   order $ORDER_OK is confirmed"

echo "-- capture failure path: decline-at-capture card -> payment_failed --"
ORDER_DECLINED="$(create_order 5555555555554444)"
ORDER_IDS+=("$ORDER_DECLINED")
drive_to_dispatch "$ORDER_DECLINED"
wait_order_status "$ORDER_DECLINED" payment_failed
echo "   order $ORDER_DECLINED is payment_failed"

echo "All capture-history live checks passed (Order History renders"
echo "'Confirmed' and 'Payment failed')."
