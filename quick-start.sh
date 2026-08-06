#!/bin/bash

echo "🚀 Quick Start - Stunity Services"
echo "=================================="
echo "  Tip: ./quick-start-lite.sh for feed/mobile dev (fewer Supabase connections)"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTS=(3000 3001 3010 3011 3013 3014 3018 3020 3021)
API_PORTS=(3001 3010 3011 3013 3014 3018 3020 3021)
ADB_BIN="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}/platform-tools/adb"

normalize_database_pool_url() {
  export PRISMA_CONNECTION_LIMIT="${PRISMA_CONNECTION_LIMIT:-3}"
  export PRISMA_POOL_TIMEOUT="${PRISMA_POOL_TIMEOUT:-10}"

  if [ -z "${DATABASE_URL:-}" ]; then
    return 0
  fi
  if [[ "$DATABASE_URL" == *"connection_limit="* ]]; then
    return 0
  fi
  if [[ "$DATABASE_URL" == *"?"* ]]; then
    export DATABASE_URL="${DATABASE_URL}&connection_limit=${PRISMA_CONNECTION_LIMIT}&pool_timeout=${PRISMA_POOL_TIMEOUT}"
  else
    export DATABASE_URL="${DATABASE_URL}?connection_limit=${PRISMA_CONNECTION_LIMIT}&pool_timeout=${PRISMA_POOL_TIMEOUT}"
  fi
}

load_root_env() {
  if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_DIR/.env"
    set +a
    echo "  📄 Loaded $PROJECT_DIR/.env"
  else
    echo "  ⚠️  No .env at repo root — copy .env.example → .env before starting services"
  fi

  # Dev-DB-by-default: if .env.development.local exists, prefer it unless the
  # operator has explicitly opted into the prod DB via STUNITY_ALLOW_PROD_DB=1.
  # The Sydney prod DB has ~700ms RTT from APAC dev machines; defaulting to dev
  # (Singapore) keeps the feed snappy and prevents accidental writes to prod.
  if [ -f "$PROJECT_DIR/.env.development.local" ] && [ "${STUNITY_ALLOW_PROD_DB:-0}" != "1" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROJECT_DIR/.env.development.local"
    set +a
    echo "  🧪 Loaded .env.development.local (dev Supabase — set STUNITY_ALLOW_PROD_DB=1 to use prod)"
  elif [ "${STUNITY_ALLOW_PROD_DB:-0}" = "1" ]; then
    echo "  ⚠️  STUNITY_ALLOW_PROD_DB=1 — using production .env values"
  fi

  normalize_database_pool_url

  # Local dev: avoid 14× keepalive pings holding Supabase pooler slots (override with DB_KEEPALIVE_INTERVAL_MS)
  export DISABLE_DB_KEEPALIVE="${DISABLE_DB_KEEPALIVE:-1}"
  export DISABLE_DB_STARTUP_WARMUP="${DISABLE_DB_STARTUP_WARMUP:-1}"

  # Align internal service auth with notification-service (streak-at-risk job, club push, etc.)
  export NOTIFICATION_SERVICE_AUTH_TOKEN="${NOTIFICATION_SERVICE_AUTH_TOKEN:-${JWT_SECRET:-stunity-notification-dev-service-token}}"

  # Canonical local service URLs for cross-service calls
  export AUTH_SERVICE_URL="${AUTH_SERVICE_URL:-http://localhost:3001}"
  # school/student/teacher/class/subject/grade/attendance/timetable/club were
  # consolidated into academic-api (Phase 0, see services/academic-api/src/index.ts) —
  # all point at its single port now, mirroring .env.production.
  export SCHOOL_SERVICE_URL="${SCHOOL_SERVICE_URL:-http://localhost:3021}"
  export STUDENT_SERVICE_URL="${STUDENT_SERVICE_URL:-http://localhost:3021}"
  export TEACHER_SERVICE_URL="${TEACHER_SERVICE_URL:-http://localhost:3021}"
  export CLASS_SERVICE_URL="${CLASS_SERVICE_URL:-http://localhost:3021}"
  export SUBJECT_SERVICE_URL="${SUBJECT_SERVICE_URL:-http://localhost:3021}"
  export GRADE_SERVICE_URL="${GRADE_SERVICE_URL:-http://localhost:3021}"
  export ATTENDANCE_SERVICE_URL="${ATTENDANCE_SERVICE_URL:-http://localhost:3021}"
  export TIMETABLE_SERVICE_URL="${TIMETABLE_SERVICE_URL:-http://localhost:3021}"
  export ACADEMIC_API_URL="${ACADEMIC_API_URL:-http://localhost:3021}"
  export FEED_SERVICE_URL="${FEED_SERVICE_URL:-http://localhost:3010}"
  export MESSAGING_SERVICE_URL="${MESSAGING_SERVICE_URL:-http://localhost:3011}"
  export CLUB_SERVICE_URL="${CLUB_SERVICE_URL:-http://localhost:3021/club}"
  export NOTIFICATION_SERVICE_URL="${NOTIFICATION_SERVICE_URL:-http://localhost:3013}"
  export ANALYTICS_SERVICE_URL="${ANALYTICS_SERVICE_URL:-http://localhost:3014}"
  export LEARN_SERVICE_URL="${LEARN_SERVICE_URL:-http://localhost:3018}"
  export AI_SERVICE_URL="${AI_SERVICE_URL:-http://localhost:3020}"
}

# Helper function to start service with tsx (skips type checking)
start_service() {
  local service_path=$1
  local port=$2
  local log_file=$3
  local name=$4

  echo "  ⚙️  Starting $name ($port)..."
  (
    cd "$PROJECT_DIR/$service_path" || exit 1
    load_root_env >/dev/null 2>&1
    export PORT="$port"
    nohup npx tsx src/index.ts >"/tmp/$log_file" 2>&1 < /dev/null &
  )
}

start_web() {
  echo "  ⚙️  Starting Web App (3000)..."
  (
    cd "$PROJECT_DIR/apps/web" || exit 1
    load_root_env >/dev/null 2>&1
    nohup npm run dev > /tmp/web.log 2>&1 < /dev/null &
  )
}

wait_for_port() {
  local port=$1
  local name=$2
  local timeout=${3:-45}
  local elapsed=0

  while [ "$elapsed" -lt "$timeout" ]; do
    if (echo > /dev/tcp/127.0.0.1/$port) >/dev/null 2>&1; then
      echo "  ✅ $name is accepting connections on $port"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "  ❌ $name did not open port $port within ${timeout}s - Check /tmp/*.log"
  return 1
}

wait_for_health() {
  local url=$1
  local name=$2
  local timeout=${3:-30}
  local elapsed=0

  while [ "$elapsed" -lt "$timeout" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "  ✅ $name health OK"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "  ⚠️  $name health check timed out ($url)"
  return 1
}

run_database_migrations() {
  if [ "${SKIP_DB_MIGRATE:-0}" = "1" ]; then
    echo "  ℹ️  Skipping database migrations (SKIP_DB_MIGRATE=1)"
    return 0
  fi

  local timeout_seconds=${MIGRATE_TIMEOUT_SECONDS:-25}
  local migration_log
  migration_log="$(mktemp -t stunity-prisma-migrate.XXXXXX.log)"

  (
    cd "$PROJECT_DIR/packages/database" || exit 1
    npx prisma migrate deploy
  ) >"$migration_log" 2>&1 &

  local migration_pid=$!
  local elapsed=0

  while kill -0 "$migration_pid" >/dev/null 2>&1; do
    if [ "$elapsed" -ge "$timeout_seconds" ]; then
      kill "$migration_pid" >/dev/null 2>&1 || true
      wait "$migration_pid" >/dev/null 2>&1 || true
      echo "  ⚠️  Database migrations skipped: Supabase migration connection timed out after ${timeout_seconds}s"
      echo "      Services will still start. Run later: cd packages/database && npx prisma migrate deploy"
      rm -f "$migration_log"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  wait "$migration_pid"
  local status=$?

  if [ "$status" -eq 0 ]; then
    echo "  ✅ Migrations applied"
    rm -f "$migration_log"
    return 0
  fi

  if grep -qE "P1001|Schema engine error|ECHECKOUTTIMEOUT|Can't reach database server" "$migration_log"; then
    echo "  ⚠️  Database migrations skipped: Supabase migration connection is unavailable right now"
    echo "      Services will still start. Run later: cd packages/database && npx prisma migrate deploy"
    rm -f "$migration_log"
    return 0
  fi

  echo "  ⚠️  prisma migrate deploy failed. Last output:"
  tail -n 12 "$migration_log" | sed 's/^/      /'
  rm -f "$migration_log"
  return 0
}

smoke_test_new_endpoints() {
  echo ""
  echo "🧪 Smoke-testing new gamification & quiz analytics endpoints..."

  if curl -fsS -X POST \
    "${NOTIFICATION_SERVICE_URL}/notifications/jobs/streak-at-risk" \
    -H "Content-Type: application/json" \
    -H "x-service-token: ${NOTIFICATION_SERVICE_AUTH_TOKEN}" \
    -d '{}' >/tmp/streak-job-smoke.json 2>/dev/null; then
    echo "  ✅ Notification streak-at-risk job: $(tr -d '\n' </tmp/streak-job-smoke.json | head -c 120)"
  else
    echo "  ⚠️  Notification streak-at-risk job failed — see /tmp/notification.log"
  fi

  if curl -fsS "${ANALYTICS_SERVICE_URL}/health" >/tmp/analytics-health.json 2>/dev/null; then
    echo "  ✅ Analytics service health OK"
  else
    echo "  ⚠️  Analytics health failed — see /tmp/analytics.log"
  fi

  if curl -fsS "${FEED_SERVICE_URL}/health" >/tmp/feed-health.json 2>/dev/null; then
    echo "  ✅ Feed service health OK (teacher quiz analytics + joined quizzes)"
  else
    echo "  ⚠️  Feed health failed — see /tmp/feed.log"
  fi
}

configure_android_reverse() {
  if [ ! -x "$ADB_BIN" ]; then
    if command -v adb >/dev/null 2>&1; then
      ADB_BIN="$(command -v adb)"
    else
      echo "  ℹ️  adb not found; skipping Android port forwarding"
      return 0
    fi
  fi

  if ! "$ADB_BIN" get-state >/dev/null 2>&1; then
    echo "  ℹ️  No running Android emulator/device; skipping Android port forwarding"
    return 0
  fi

  echo "  📱 Refreshing Android adb reverse tunnels..."
  for port in "${API_PORTS[@]}"; do
    "$ADB_BIN" reverse "tcp:${port}" "tcp:${port}" >/dev/null 2>&1 || true
  done

  if "$ADB_BIN" reverse --list 2>/dev/null | grep -q "tcp:3010"; then
    echo "  ✅ Android can reach local services through 127.0.0.1"
  else
    echo "  ⚠️  adb reverse did not report port 3010. Android emulator will need 10.0.2.2 fallback or a reload."
  fi
}

# Kill all existing processes
echo ""
echo "🛑 Stopping any running services..."
for port in "${PORTS[@]}"; do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    kill -9 $pid 2>/dev/null && echo "  Killed process on port $port"
  fi
done
sleep 2

load_root_env
echo "  🔗 DB pool: connection_limit=${PRISMA_CONNECTION_LIMIT}, keepalive=${DISABLE_DB_KEEPALIVE:-0}, startup_warmup=${DISABLE_DB_STARTUP_WARMUP:-0}"

# Apply migrations so Postgres matches prisma/schema.prisma (e.g. new Subject columns).
echo ""
echo "📦 Applying database migrations..."
run_database_migrations

configure_android_reverse

# Start services in correct order
echo ""
if [ "${QUICK_START_LITE:-0}" = "1" ]; then
  echo "🚀 Starting services (LITE — mobile/feed dev, fewer DB connections)..."
else
  echo "🚀 Starting services..."
fi

start_service "services/auth-service" 3001 "auth.log" "Auth Service"
wait_for_port 3001 "Auth Service" 60

if [ "${QUICK_START_LITE:-0}" != "1" ]; then
  # Consolidated school/student/teacher/class/subject/grade/attendance/timetable
  # (Phase 0 — see services/academic-api/src/index.ts). Club is also mounted
  # here under /club, so the standalone club-service start below is skipped.
  start_service "services/academic-api" 3021 "academic-api.log" "Academic API"
  wait_for_port 3021 "Academic API" 60
fi

start_service "services/feed-service" 3010 "feed.log" "Feed Service"
wait_for_port 3010 "Feed Service" 60
wait_for_health "${FEED_SERVICE_URL}/health" "Feed Service" 30

if [ "${SKIP_MESSAGING_SERVICE:-0}" != "1" ]; then
  start_service "services/messaging-service" 3011 "messaging.log" "Messaging Service"
  wait_for_port 3011 "Messaging Service" 45
else
  echo "  ℹ️  Messaging service skipped (SKIP_MESSAGING_SERVICE=1). Set SKIP_MESSAGING_SERVICE=0 to enable."
fi

start_service "services/notification-service" 3013 "notification.log" "Notification Service"
wait_for_port 3013 "Notification Service" 45
wait_for_health "${NOTIFICATION_SERVICE_URL}/health" "Notification Service" 30

if [ "${QUICK_START_LITE:-0}" != "1" ]; then
  start_service "services/analytics-service" 3014 "analytics.log" "Analytics Service"
  wait_for_port 3014 "Analytics Service" 60
  wait_for_health "${ANALYTICS_SERVICE_URL}/health" "Analytics Service" 30
fi

start_service "services/learn-service" 3018 "learn.log" "Learn Service"
wait_for_port 3018 "Learn Service" 60
wait_for_health "${LEARN_SERVICE_URL}/health" "Learn Service" 30

if [ "${QUICK_START_LITE:-0}" != "1" ]; then
  start_service "services/ai-service" 3020 "ai.log" "AI Service"
  wait_for_port 3020 "AI Service" 45
fi

start_web
wait_for_port 3000 "Web App" 60

configure_android_reverse

echo ""
echo "✅ Services starting..."
echo ""
echo "Checking status..."
sleep 3

# Check which services are running
for port in 3001 3010 3011 3013 3014 3018 3020 3021 3000; do
  if lsof -ti:$port > /dev/null 2>&1; then
    echo "  ✅ Port $port: Running"
  else
    echo "  ❌ Port $port: Failed - Check /tmp/*.log"
  fi
done

smoke_test_new_endpoints

echo ""
echo "🌐 Web App: http://localhost:3000"
echo "🔐 Auth Service: http://localhost:3001"
if [ "${QUICK_START_LITE:-0}" != "1" ]; then
  echo "🏫 Academic API: http://localhost:3021 (school/student/teacher/class/subject/grade/attendance/timetable/club)"
fi
echo "📱 Feed Service: http://localhost:3010"
if [ "${SKIP_MESSAGING_SERVICE:-0}" != "1" ]; then
  echo "💬 Messaging Service: http://localhost:3011"
fi
echo "🔔 Notification Service: http://localhost:3013"
if [ "${QUICK_START_LITE:-0}" != "1" ]; then
  echo "📊 Analytics Service: http://localhost:3014 (streaks, leaderboards, live quiz)"
fi
echo "📚 Learn Service: http://localhost:3018"
if [ "${QUICK_START_LITE:-0}" != "1" ]; then
  echo "🤖 AI Service: http://localhost:3020"
fi
echo ""
echo "🆕 Teacher Quiz Analytics (web): http://localhost:3000/en/teacher/quizzes/analytics"
echo "🆕 Streak-at-risk job (dev): POST ${NOTIFICATION_SERVICE_URL}/notifications/jobs/streak-at-risk"
echo "   Header: x-service-token: \$NOTIFICATION_SERVICE_AUTH_TOKEN (from .env JWT_SECRET)"
echo ""
echo "📝 Logs in: /tmp/*.log"
echo ""
echo "🔑 Shared dev login: admin@svaythom.edu.kh / SvaythomAdmin2026!"
echo "📘 Docs: docs/current/LEARNING_GAMIFICATION_AND_QUIZ_ANALYTICS_2026-05.md"
