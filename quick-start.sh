#!/bin/bash

echo "🚀 Quick Start - Stunity Services"
echo "=================================="

PROJECT_DIR="/Users/naingseiha/Documents/Stunity-Enterprise"

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

# Kill all existing processes
echo ""
echo "🛑 Stopping any running services..."
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014; do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    kill -9 $pid 2>/dev/null && echo "  Killed process on port $port"
  fi
done
sleep 2

# Start services in correct order
echo ""
echo "🚀 Starting services..."

start_service "services/auth-service" 3001 "auth.log" "Auth Service"
sleep 3

start_service "services/school-service" 3002 "school.log" "School Service"
sleep 2

start_service "services/student-service" 3003 "student.log" "Student Service"
sleep 2

start_service "services/teacher-service" 3004 "teacher.log" "Teacher Service"
sleep 2

start_service "services/class-service" 3005 "class.log" "Class Service"
sleep 2

start_service "services/subject-service" 3006 "subject.log" "Subject Service"
sleep 2

start_service "services/grade-service" 3007 "grade.log" "Grade Service"
sleep 2

start_service "services/attendance-service" 3008 "attendance.log" "Attendance Service"
sleep 2

start_service "services/timetable-service" 3009 "timetable.log" "Timetable Service"
sleep 2

start_service "services/feed-service" 3010 "feed.log" "Feed Service"
sleep 2

start_service "services/messaging-service" 3011 "messaging.log" "Messaging Service"
sleep 2

start_service "services/club-service" 3012 "club.log" "Club Service"
sleep 2

start_service "services/notification-service" 3013 "notification.log" "Notification Service"
sleep 2

start_service "services/analytics-service" 3014 "analytics.log" "Analytics Service"
sleep 2

start_web
sleep 5

echo ""
echo "✅ Services starting..."
echo ""
echo "Checking status..."
sleep 3

# Check which services are running
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3000; do
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
echo "📝 Logs in: /tmp/*.log"
echo ""
echo "🔑 Login: john.doe@testhighschool.edu / SecurePass123!"
