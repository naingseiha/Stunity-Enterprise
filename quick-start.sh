#!/bin/bash

echo "🚀 Quick Start - Stunity Services"
echo "=================================="

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3018 3020)
API_PORTS=(3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3018 3020)
ADB_BIN="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}/platform-tools/adb"

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

  # Align internal service auth with notification-service (streak-at-risk job, club push, etc.)
  export NOTIFICATION_SERVICE_AUTH_TOKEN="${NOTIFICATION_SERVICE_AUTH_TOKEN:-${JWT_SECRET:-stunity-notification-dev-service-token}}"

  # Canonical local service URLs for cross-service calls
  export AUTH_SERVICE_URL="${AUTH_SERVICE_URL:-http://localhost:3001}"
  export SCHOOL_SERVICE_URL="${SCHOOL_SERVICE_URL:-http://localhost:3002}"
  export STUDENT_SERVICE_URL="${STUDENT_SERVICE_URL:-http://localhost:3003}"
  export TEACHER_SERVICE_URL="${TEACHER_SERVICE_URL:-http://localhost:3004}"
  export CLASS_SERVICE_URL="${CLASS_SERVICE_URL:-http://localhost:3005}"
  export SUBJECT_SERVICE_URL="${SUBJECT_SERVICE_URL:-http://localhost:3006}"
  export GRADE_SERVICE_URL="${GRADE_SERVICE_URL:-http://localhost:3007}"
  export ATTENDANCE_SERVICE_URL="${ATTENDANCE_SERVICE_URL:-http://localhost:3008}"
  export TIMETABLE_SERVICE_URL="${TIMETABLE_SERVICE_URL:-http://localhost:3009}"
  export FEED_SERVICE_URL="${FEED_SERVICE_URL:-http://localhost:3010}"
  export MESSAGING_SERVICE_URL="${MESSAGING_SERVICE_URL:-http://localhost:3011}"
  export CLUB_SERVICE_URL="${CLUB_SERVICE_URL:-http://localhost:3012}"
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

# Apply migrations so Postgres matches prisma/schema.prisma (e.g. new Subject columns).
echo ""
echo "📦 Applying database migrations..."
run_database_migrations

configure_android_reverse

# Start services in correct order
echo ""
echo "🚀 Starting services..."

start_service "services/auth-service" 3001 "auth.log" "Auth Service"
wait_for_port 3001 "Auth Service" 60

start_service "services/school-service" 3002 "school.log" "School Service"
wait_for_port 3002 "School Service" 45

start_service "services/student-service" 3003 "student.log" "Student Service"
wait_for_port 3003 "Student Service" 45

start_service "services/teacher-service" 3004 "teacher.log" "Teacher Service"
wait_for_port 3004 "Teacher Service" 45

start_service "services/class-service" 3005 "class.log" "Class Service"
wait_for_port 3005 "Class Service" 45

start_service "services/subject-service" 3006 "subject.log" "Subject Service"
wait_for_port 3006 "Subject Service" 45

start_service "services/grade-service" 3007 "grade.log" "Grade Service"
wait_for_port 3007 "Grade Service" 45

start_service "services/attendance-service" 3008 "attendance.log" "Attendance Service"
wait_for_port 3008 "Attendance Service" 45

start_service "services/timetable-service" 3009 "timetable.log" "Timetable Service"
wait_for_port 3009 "Timetable Service" 45

start_service "services/feed-service" 3010 "feed.log" "Feed Service"
wait_for_port 3010 "Feed Service" 60
wait_for_health "${FEED_SERVICE_URL}/health" "Feed Service" 30

start_service "services/messaging-service" 3011 "messaging.log" "Messaging Service"
wait_for_port 3011 "Messaging Service" 45

start_service "services/club-service" 3012 "club.log" "Club Service"
wait_for_port 3012 "Club Service" 45

start_service "services/notification-service" 3013 "notification.log" "Notification Service"
wait_for_port 3013 "Notification Service" 45
wait_for_health "${NOTIFICATION_SERVICE_URL}/health" "Notification Service" 30

start_service "services/analytics-service" 3014 "analytics.log" "Analytics Service"
wait_for_port 3014 "Analytics Service" 60
wait_for_health "${ANALYTICS_SERVICE_URL}/health" "Analytics Service" 30

start_service "services/learn-service" 3018 "learn.log" "Learn Service"
wait_for_port 3018 "Learn Service" 60
wait_for_health "${LEARN_SERVICE_URL}/health" "Learn Service" 30

start_service "services/ai-service" 3020 "ai.log" "AI Service"
wait_for_port 3020 "AI Service" 45

start_web
wait_for_port 3000 "Web App" 60

configure_android_reverse

echo ""
echo "✅ Services starting..."
echo ""
echo "Checking status..."
sleep 3

# Check which services are running
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3018 3020 3000; do
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
echo "📱 Feed Service: http://localhost:3010"
echo "💬 Messaging Service: http://localhost:3011"
echo "🎓 Club Service: http://localhost:3012"
echo "🔔 Notification Service: http://localhost:3013"
echo "📊 Analytics Service: http://localhost:3014 (streaks, leaderboards, live quiz)"
echo "📚 Learn Service: http://localhost:3018"
echo "🤖 AI Service: http://localhost:3020"
echo ""
echo "🆕 Teacher Quiz Analytics (web): http://localhost:3000/en/teacher/quizzes/analytics"
echo "🆕 Streak-at-risk job (dev): POST ${NOTIFICATION_SERVICE_URL}/notifications/jobs/streak-at-risk"
echo "   Header: x-service-token: \$NOTIFICATION_SERVICE_AUTH_TOKEN (from .env JWT_SECRET)"
echo ""
echo "📝 Logs in: /tmp/*.log"
echo ""
echo "🔑 Shared dev login: admin@svaythom.edu.kh / SvaythomAdmin2026!"
echo "📘 Docs: docs/current/LEARNING_GAMIFICATION_AND_QUIZ_ANALYTICS_2026-05.md"
