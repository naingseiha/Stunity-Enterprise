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
    echo "Run this to fix: ./fix-architecture.sh"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

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

cd /Users/naingseiha/Documents/Stunity-Enterprise

# Start auth service
echo "  ⚙️  Starting Auth Service (3001)..."
if [[ "$ARCH" == "arm64" ]]; then
  cd services/auth-service && arch -arm64 npm run dev > /tmp/auth.log 2>&1 &
else
  cd services/auth-service && npm run dev > /tmp/auth.log 2>&1 &
fi
sleep 3

# Start school service  
echo "  ⚙️  Starting School Service (3002)..."
cd /Users/naingseiha/Documents/Stunity-Enterprise/services/school-service && npm run dev > /tmp/school.log 2>&1 &
sleep 3

# Start student service
echo "  ⚙️  Starting Student Service (3003)..."
cd /Users/naingseiha/Documents/Stunity-Enterprise/services/student-service && npm run dev > /tmp/student.log 2>&1 &
sleep 2

# Start teacher service
echo "  ⚙️  Starting Teacher Service (3004)..."
cd /Users/naingseiha/Documents/Stunity-Enterprise/services/teacher-service && npm run dev > /tmp/teacher.log 2>&1 &
sleep 2

# Start class service
echo "  ⚙️  Starting Class Service (3005)..."
cd /Users/naingseiha/Documents/Stunity-Enterprise/services/class-service && npm run dev > /tmp/class.log 2>&1 &
sleep 2

# Start subject service
echo "  ⚙️  Starting Subject Service (3006)..."
cd /Users/naingseiha/Documents/Stunity-Enterprise/services/subject-service && npm run dev > /tmp/subject.log 2>&1 &
sleep 2

# Start grade service
echo "  ⚙️  Starting Grade Service (3007)..."
cd /Users/naingseiha/Documents/Stunity-Enterprise/services/grade-service && npm run dev > /tmp/grade.log 2>&1 &
sleep 2

# Start attendance service
echo "  ⚙️  Starting Attendance Service (3008)..."
cd /Users/naingseiha/Documents/Stunity-Enterprise/services/attendance-service && npm run dev > /tmp/attendance.log 2>&1 &
sleep 2

# Start timetable service
echo "  ⚙️  Starting Timetable Service (3009)..."
cd /Users/naingseiha/Documents/Stunity-Enterprise/services/timetable-service && npm run dev > /tmp/timetable.log 2>&1 &
sleep 2

# Start feed service
echo "  ⚙️  Starting Feed Service (3010)..."
cd /Users/naingseiha/Documents/Stunity-Enterprise/services/feed-service && npm run dev > /tmp/feed.log 2>&1 &
sleep 2

# Start web app
echo "  ⚙️  Starting Web App (3000)..."
cd /Users/naingseiha/Documents/Stunity-Enterprise/apps/web && npm run dev > /tmp/web.log 2>&1 &
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
