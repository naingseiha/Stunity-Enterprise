#!/usr/bin/env bash
set -euo pipefail

AUTH_URL="${AUTH_URL:-http://localhost:3001}"
CLUB_URL="${CLUB_URL:-http://localhost:3012}"
NOTIF_URL="${NOTIF_URL:-http://localhost:3013}"

SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-superadmin@stunity.com}"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-StunityAdmin2026!}"
PARTICIPANT_EMAIL="${PARTICIPANT_EMAIL:-admin@svaythom.edu.kh}"
PARTICIPANT_PASSWORD="${PARTICIPANT_PASSWORD:-SvaythomAdmin2026!}"

API_BODY=""
API_STATUS=""
SUPER_TOKEN=""
APPROVAL_CLUB_ID=""
INVITE_CLUB_ID=""

fail() {
  echo "❌ $1" >&2
  if [ -n "${2-}" ]; then
    echo "Context:" >&2
    echo "$2" >&2
  fi
  exit 1
}

cleanup() {
  if [ -n "$SUPER_TOKEN" ]; then
    if [ -n "$APPROVAL_CLUB_ID" ]; then
      curl -sS -X DELETE "$CLUB_URL/clubs/$APPROVAL_CLUB_ID" \
        -H "Authorization: Bearer $SUPER_TOKEN" >/dev/null || true
    fi
    if [ -n "$INVITE_CLUB_ID" ]; then
      curl -sS -X DELETE "$CLUB_URL/clubs/$INVITE_CLUB_ID" \
        -H "Authorization: Bearer $SUPER_TOKEN" >/dev/null || true
    fi
  fi
}
trap cleanup EXIT

call_api() {
  local method="$1"
  local url="$2"
  local token="${3-}"
  local data="${4-}"

  local resp
  if [ -n "$token" ] && [ -n "$data" ]; then
    resp=$(curl -sS -w "\n%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      --data "$data")
  elif [ -n "$token" ]; then
    resp=$(curl -sS -w "\n%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $token")
  elif [ -n "$data" ]; then
    resp=$(curl -sS -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      --data "$data")
  else
    resp=$(curl -sS -w "\n%{http_code}" -X "$method" "$url")
  fi

  API_BODY="${resp%$'\n'*}"
  API_STATUS="${resp##*$'\n'}"
}

expect_status() {
  local expected="$1"
  local label="$2"
  if [ "$API_STATUS" != "$expected" ]; then
    fail "$label expected HTTP $expected but got $API_STATUS" "$API_BODY"
  fi
}

expect_success_true() {
  local label="$1"
  local success
  success=$(echo "$API_BODY" | jq -r '.success // empty' 2>/dev/null || true)
  if [ "$success" != "true" ]; then
    fail "$label expected success=true" "$API_BODY"
  fi
}

for url in "$AUTH_URL/health" "$CLUB_URL/health" "$NOTIF_URL/health"; do
  if ! curl -sf "$url" >/dev/null; then
    fail "Service health check failed: $url"
  fi
done

STAMP=$(date +%s)

# 0) Verify internal send endpoint is protected
call_api POST "$NOTIF_URL/notifications/send" "" '{"userId":"x","title":"x","body":"x"}'
expect_status 401 "Service auth guard on /notifications/send"

# 1) Login super admin
call_api POST "$AUTH_URL/auth/login" "" "{\"email\":\"$SUPER_ADMIN_EMAIL\",\"password\":\"$SUPER_ADMIN_PASSWORD\"}"
expect_status 200 "Super admin login"
expect_success_true "Super admin login"
SUPER_TOKEN=$(echo "$API_BODY" | jq -r '.data.tokens.accessToken // empty')
[ -n "$SUPER_TOKEN" ] || fail "Missing super admin token" "$API_BODY"

# 2) Login participant
call_api POST "$AUTH_URL/auth/login" "" "{\"email\":\"$PARTICIPANT_EMAIL\",\"password\":\"$PARTICIPANT_PASSWORD\"}"
expect_status 200 "Participant login"
expect_success_true "Participant login"
PARTICIPANT_TOKEN=$(echo "$API_BODY" | jq -r '.data.tokens.accessToken // empty')
PARTICIPANT_ID=$(echo "$API_BODY" | jq -r '.data.user.id // empty')
[ -n "$PARTICIPANT_TOKEN" ] && [ -n "$PARTICIPANT_ID" ] || fail "Missing participant token/id" "$API_BODY"

# 3) Approval flow: request -> approve -> leave -> request -> reject
APPROVAL_CLUB_NAME="QA Approval Club ${STAMP}"
call_api POST "$CLUB_URL/clubs" "$SUPER_TOKEN" "{\"name\":\"$APPROVAL_CLUB_NAME\",\"description\":\"QA approval-required club\",\"type\":\"STRUCTURED_CLASS\",\"mode\":\"APPROVAL_REQUIRED\"}"
expect_status 201 "Create approval-required club"
expect_success_true "Create approval-required club"
APPROVAL_CLUB_ID=$(echo "$API_BODY" | jq -r '.club.id // empty')
[ -n "$APPROVAL_CLUB_ID" ] || fail "Missing approval club id" "$API_BODY"

call_api POST "$CLUB_URL/clubs/$APPROVAL_CLUB_ID/request-join" "$PARTICIPANT_TOKEN"
expect_status 202 "Participant request join (1)"
expect_success_true "Participant request join (1)"

call_api POST "$CLUB_URL/clubs/$APPROVAL_CLUB_ID/join-requests/$PARTICIPANT_ID/approve" "$SUPER_TOKEN"
expect_status 200 "Approve participant join"
expect_success_true "Approve participant join"

call_api POST "$CLUB_URL/clubs/$APPROVAL_CLUB_ID/leave" "$PARTICIPANT_TOKEN"
expect_status 200 "Participant leave after approval"
expect_success_true "Participant leave after approval"

call_api POST "$CLUB_URL/clubs/$APPROVAL_CLUB_ID/request-join" "$PARTICIPANT_TOKEN"
expect_status 202 "Participant request join (2)"
expect_success_true "Participant request join (2)"

call_api DELETE "$CLUB_URL/clubs/$APPROVAL_CLUB_ID/join-requests/$PARTICIPANT_ID/reject" "$SUPER_TOKEN"
expect_status 200 "Reject participant join"
expect_success_true "Reject participant join"

# 4) Invite flow: invite -> accept -> leave -> invite -> decline
INVITE_CLUB_NAME="QA Invite Club ${STAMP}"
call_api POST "$CLUB_URL/clubs" "$SUPER_TOKEN" "{\"name\":\"$INVITE_CLUB_NAME\",\"description\":\"QA invite-only club\",\"type\":\"PROJECT_GROUP\",\"mode\":\"INVITE_ONLY\"}"
expect_status 201 "Create invite-only club"
expect_success_true "Create invite-only club"
INVITE_CLUB_ID=$(echo "$API_BODY" | jq -r '.club.id // empty')
[ -n "$INVITE_CLUB_ID" ] || fail "Missing invite club id" "$API_BODY"

call_api POST "$CLUB_URL/clubs/$INVITE_CLUB_ID/invite" "$SUPER_TOKEN" "{\"userId\":\"$PARTICIPANT_ID\"}"
expect_status 200 "Invite participant (1)"
expect_success_true "Invite participant (1)"

call_api GET "$CLUB_URL/clubs/invites/my" "$PARTICIPANT_TOKEN"
expect_status 200 "Participant get invites (1)"
expect_success_true "Participant get invites (1)"
HAS_INVITE_1=$(echo "$API_BODY" | jq -r --arg cid "$INVITE_CLUB_ID" 'any(.invites[]?; .clubId == $cid)')
HAS_UPDATED_AT=$(echo "$API_BODY" | jq -r --arg cid "$INVITE_CLUB_ID" 'any(.invites[]?; .clubId == $cid and (.club.updatedAt != null))')
[ "$HAS_INVITE_1" = "true" ] || fail "Participant missing first invite" "$API_BODY"
[ "$HAS_UPDATED_AT" = "true" ] || fail "Invite payload missing club.updatedAt" "$API_BODY"

call_api POST "$CLUB_URL/clubs/$INVITE_CLUB_ID/accept-invite" "$PARTICIPANT_TOKEN"
expect_status 200 "Participant accept invite"
expect_success_true "Participant accept invite"

call_api POST "$CLUB_URL/clubs/$INVITE_CLUB_ID/leave" "$PARTICIPANT_TOKEN"
expect_status 200 "Participant leave after accept"
expect_success_true "Participant leave after accept"

call_api POST "$CLUB_URL/clubs/$INVITE_CLUB_ID/invite" "$SUPER_TOKEN" "{\"userId\":\"$PARTICIPANT_ID\"}"
expect_status 200 "Invite participant (2)"
expect_success_true "Invite participant (2)"

call_api POST "$CLUB_URL/clubs/$INVITE_CLUB_ID/decline-invite" "$PARTICIPANT_TOKEN"
expect_status 200 "Participant decline invite"
expect_success_true "Participant decline invite"

# 5) Notification assertions
call_api GET "$NOTIF_URL/notifications" "$PARTICIPANT_TOKEN"
expect_status 200 "Fetch participant notifications"
expect_success_true "Fetch participant notifications"
HAS_APPROVED=$(echo "$API_BODY" | jq -r --arg cid "$APPROVAL_CLUB_ID" 'any(.data[]?; .title == "Join request approved" and (.data.link // "" | contains("/clubs/" + $cid)))')
HAS_DECLINED=$(echo "$API_BODY" | jq -r --arg cid "$APPROVAL_CLUB_ID" 'any(.data[]?; .title == "Join request declined" and (.data.link // "" | contains("/clubs/" + $cid)))')
HAS_INVITE_LINK=$(echo "$API_BODY" | jq -r 'any(.data[]?; .title == "New club invitation" and .data.link == "/clubs/invites")')
[ "$HAS_APPROVED" = "true" ] || fail "Participant missing approved notification" "$API_BODY"
[ "$HAS_DECLINED" = "true" ] || fail "Participant missing declined notification" "$API_BODY"
[ "$HAS_INVITE_LINK" = "true" ] || fail "Participant missing /clubs/invites link" "$API_BODY"

call_api GET "$NOTIF_URL/notifications" "$SUPER_TOKEN"
expect_status 200 "Fetch inviter notifications"
expect_success_true "Fetch inviter notifications"
HAS_ACCEPTED=$(echo "$API_BODY" | jq -r --arg cid "$INVITE_CLUB_ID" 'any(.data[]?; .title == "Club invitation accepted" and (.data.link // "" | contains("/clubs/" + $cid)))')
HAS_DECLINED_INVITE=$(echo "$API_BODY" | jq -r --arg cid "$INVITE_CLUB_ID" 'any(.data[]?; .title == "Club invitation declined" and (.data.link // "" | contains("/clubs/" + $cid)))')
[ "$HAS_ACCEPTED" = "true" ] || fail "Inviter missing accepted notification" "$API_BODY"
[ "$HAS_DECLINED_INVITE" = "true" ] || fail "Inviter missing declined notification" "$API_BODY"

echo "✅ Club+notification integration test passed"
echo "{ \"approvalClubId\":\"$APPROVAL_CLUB_ID\", \"inviteClubId\":\"$INVITE_CLUB_ID\", \"participant\":\"$PARTICIPANT_EMAIL\" }"

