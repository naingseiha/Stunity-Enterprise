#!/bin/bash

echo "🚀 Quick Start - Stunity Services"
echo "=================================="

PROJECT_DIR="/Users/naingseiha/Documents/projects/Stunity-Enterprise"
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3018 3020)
API_PORTS=(3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3018 3020)
ADB_BIN="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}/platform-tools/adb"

# Helper function to start service with tsx (skips type checking)
# Uses a subshell to avoid cd side-effects
start_service() {
    local service_path=$1
    local port=$2
    local log_file=$3
    local name=$4
    
    echo "  ⚙️  Starting $name ($port)..."
    (cd "$PROJECT_DIR/$service_path" && npx tsx src/index.ts > /tmp/$log_file 2>&1) &
}

start_web() {
    echo "  ⚙️  Starting Web App (3000)..."
    (cd "$PROJECT_DIR/apps/web" && npm run dev > /tmp/web.log 2>&1) &
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

start_service "services/messaging-service" 3011 "messaging.log" "Messaging Service"
wait_for_port 3011 "Messaging Service" 45

start_service "services/club-service" 3012 "club.log" "Club Service"
wait_for_port 3012 "Club Service" 45

start_service "services/notification-service" 3013 "notification.log" "Notification Service"
wait_for_port 3013 "Notification Service" 45

start_service "services/analytics-service" 3014 "analytics.log" "Analytics Service"
wait_for_port 3014 "Analytics Service" 60

start_service "services/learn-service" 3018 "learn.log" "Learn Service"
wait_for_port 3018 "Learn Service" 60

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

echo ""
echo "🌐 Web App: http://localhost:3000"
echo "🔐 Auth Service: http://localhost:3001"
echo "📱 Feed Service: http://localhost:3010"
echo "💬 Messaging Service: http://localhost:3011"
echo "🎓 Club Service: http://localhost:3012"
echo "🔔 Notification Service: http://localhost:3013"
echo "📊 Analytics Service: http://localhost:3014"
echo "📚 Learn Service: http://localhost:3018"
echo "🤖 AI Service: http://localhost:3020"
echo "📝 Logs in: /tmp/*.log"
echo ""
echo "🔑 Shared dev login: admin@svaythom.edu.kh / SvaythomAdmin2026!"
echo "📘 Docs: see README.md and docs/CURRENT_SITUATION.md for current reality"
