#!/bin/bash

echo "🚀 Quick Start - Stunity Services"
echo "=================================="

# Check for architecture mismatch on Apple Silicon
ARCH=$(uname -m)
NODE_ARCH=$(node -p "process.arch")

if [[ "$ARCH" == "arm64" && "$NODE_ARCH" == "x64" ]]; then
    echo ""
    echo "⚠️  WARNING: Architecture Mismatch Detected!"
    echo "Your M1/M2 Mac is running Node.js in Rosetta (x64) mode."
    echo "This will cause esbuild errors in services."
    echo ""
    echo "Run this to fix permanently: ./fix-architecture.sh"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Helper function to start service with correct architecture
start_service() {
    local service_path=$1
    local port=$2
    local log_file=$3
    local name=$4
    
    echo "  ⚙️  Starting $name ($port)..."
    cd /Users/naingseiha/Documents/Stunity-Enterprise/$service_path
    
    if [[ "$ARCH" == "arm64" ]]; then
        arch -arm64 npm run dev > /tmp/$log_file 2>&1 &
    else
        npm run dev > /tmp/$log_file 2>&1 &
    fi
}

# Kill all existing processes
echo ""
echo "🛑 Stopping any running services..."
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010; do
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
sleep 3

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

start_service "apps/web" 3000 "web.log" "Web App"
sleep 5

echo ""
echo "✅ Services starting..."
echo ""
echo "Checking status..."
sleep 3

# Check which services are running
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3000; do
  if lsof -ti:$port > /dev/null 2>&1; then
    echo "  ✅ Port $port: Running"
  else
    echo "  ❌ Port $port: Failed - Check /tmp/*.log"
  fi
done

echo ""
echo "🌐 Web App: http://localhost:3000"
echo "📱 Feed Service: http://localhost:3010"
echo "📝 Logs in: /tmp/*.log"
echo ""
echo "🔑 Login: john.doe@testhighschool.edu / SecurePass123!"
