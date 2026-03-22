#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
TMP_DIR="${TMPDIR:-/tmp}"

README_PATH="$ROOT_DIR/README.md"
LOGIN_JSON="$(mktemp "$TMP_DIR/admin-messaging-login.XXXXXX.json")"
CONVERSATIONS_JSON="$(mktemp "$TMP_DIR/admin-messaging-conversations.XXXXXX.json")"
UNREAD_JSON="$(mktemp "$TMP_DIR/admin-messaging-unread.XXXXXX.json")"
PARENTS_JSON="$(mktemp "$TMP_DIR/admin-messaging-parents.XXXXXX.json")"

cleanup() {
  rm -f "$LOGIN_JSON" "$CONVERSATIONS_JSON" "$UNREAD_JSON" "$PARENTS_JSON"
}

trap cleanup EXIT

EMAIL="$(sed -n '38s/.*`\([^`]*\)`.*/\1/p' "$README_PATH")"
PASSWORD="$(sed -n '39s/.*`\([^`]*\)`.*/\1/p' "$README_PATH")"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "Failed to parse shared admin credentials from $README_PATH" >&2
  exit 1
fi

echo "Admin messaging smoke wrapper"
echo "Root: $ROOT_DIR"
echo "Email: $EMAIL"

LOGIN_PAYLOAD="$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" '{email:$email,password:$password}')"
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  --data-binary "$LOGIN_PAYLOAD" > "$LOGIN_JSON"

TOKEN="$(jq -r '.data.tokens.accessToken // empty' "$LOGIN_JSON")"
if [[ -z "$TOKEN" ]]; then
  echo "Login failed:" >&2
  cat "$LOGIN_JSON" >&2
  exit 1
fi

curl -s http://localhost:3011/health > /dev/null
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3011/conversations > "$CONVERSATIONS_JSON"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3011/unread-count > "$UNREAD_JSON"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3011/parents > "$PARENTS_JSON"

LOGIN_JSON_PATH="$LOGIN_JSON" \
CONVERSATIONS_JSON_PATH="$CONVERSATIONS_JSON" \
UNREAD_JSON_PATH="$UNREAD_JSON" \
PARENTS_JSON_PATH="$PARENTS_JSON" \
AUTH_URL="http://localhost:3001" \
MESSAGING_URL="http://localhost:3011" \
node "$ROOT_DIR/scripts/testing/manual/admin-messaging-smoke.js"
