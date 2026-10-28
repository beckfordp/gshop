#!/usr/bin/env bash
# Live verification for track auth-real-wiring_20261028 (US-16.5).
# Checks the build/lint/tests, then drives user-service's real auth contracts
# exactly as gshop's userClient does and confirms the welcome email is sent.
# The final UI click-through is manual (dev server at :5173).
set -euo pipefail

NAMESPACE="${NAMESPACE:-gluon-local}"
USER_URL="${USER_URL:-http://localhost:18083}"
PIDS=()
TMP_DIR="$(mktemp -d)"
cleanup() {
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  done
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "== gshop real-auth verification =="
echo "-- npm run build --"; npm run build >/dev/null
echo "-- npm run lint --"; npm run lint >/dev/null
echo "-- npm test --"; CI=true npm test 2>&1 | tail -2

kubectl -n "$NAMESPACE" port-forward svc/user-service 18083:8080 >/dev/null 2>&1 &
PIDS+=("$!")
for _ in $(seq 1 30); do
  curl -sf "$USER_URL/health/ready" >/dev/null 2>&1 && break
  sleep 1
done
curl -sf "$USER_URL/health/ready" >/dev/null || {
  echo "FAIL: user-service never became ready" >&2
  exit 1
}

EMAIL="gshop-verify-$(python3 -c 'import uuid; print(uuid.uuid4())')@example.com"
PASSWORD="correct horse battery"
STATUS="$(curl -sS -o "$TMP_DIR/signup.json" -w '%{http_code}' -X POST \
  "$USER_URL/auth/signup" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
[ "$STATUS" = "201" ] || { echo "FAIL: signup -> $STATUS" >&2; cat "$TMP_DIR/signup.json" >&2; exit 1; }
USER_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["userId"])' < "$TMP_DIR/signup.json")"
echo "   signup 201 ($USER_ID)"

STATUS="$(curl -sS -o "$TMP_DIR/login.json" -w '%{http_code}' -X POST \
  "$USER_URL/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
[ "$STATUS" = "200" ] || { echo "FAIL: login -> $STATUS" >&2; cat "$TMP_DIR/login.json" >&2; exit 1; }
LOGIN_USER_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["userId"])' < "$TMP_DIR/login.json")"
[ "$LOGIN_USER_ID" = "$USER_ID" ] || { echo "FAIL: login userId mismatch" >&2; exit 1; }
echo "   login 200, userId matches"

for _ in $(seq 1 30); do
  if kubectl logs -n "$NAMESPACE" deploy/notification-service --since=20m 2>/dev/null | grep -q "to=$EMAIL"; then
    echo "   welcome email logged"
    FOUND=1; break
  fi
  sleep 1
done
[ "${FOUND:-0}" = "1" ] || { echo "FAIL: no welcome email logged for $EMAIL" >&2; exit 1; }

kubectl exec -n "$NAMESPACE" deploy/user-postgres -- psql -U user -d user -q -c \
  "delete from outbox_events where aggregate_id = '$USER_ID'; delete from user_account where id = '$USER_ID'" >/dev/null

echo "All gshop real-auth checks passed."
echo "Manual: open http://localhost:5173 — sign up, sign out, sign in, checkout."
