#!/bin/bash

echo "🚀 Starting Stunity Enterprise Services..."
echo ""

PROJECT_ROOT="/Users/naingseiha/Documents/Stunity-Enterprise"

# Start Auth Service
echo "Starting auth-service on port 3001..."
cd "$PROJECT_ROOT/services/auth-service"
nohup npm run dev > /tmp/auth-service.log 2>&1 &
AUTH_PID=$!
echo "  → PID: $AUTH_PID"
sleep 2

# Start School Service  
echo "Starting school-service on port 3002..."
cd "$PROJECT_ROOT/services/school-service"
nohup npm run dev > /tmp/school-service.log 2>&1 &
SCHOOL_PID=$!
echo "  → PID: $SCHOOL_PID"
sleep 2

# Start Student Service
echo "Starting student-service on port 3003..."
cd "$PROJECT_ROOT/services/student-service"
nohup npm run dev > /tmp/student-service.log 2>&1 &
STUDENT_PID=$!
echo "  → PID: $STUDENT_PID"
sleep 2

# Start Teacher Service
echo "Starting teacher-service on port 3004..."
cd "$PROJECT_ROOT/services/teacher-service"
nohup npm run dev > /tmp/teacher-service.log 2>&1 &
TEACHER_PID=$!
echo "  → PID: $TEACHER_PID"
sleep 2

# Start Class Service
echo "Starting class-service on port 3005..."
cd "$PROJECT_ROOT/services/class-service"
nohup npm run dev > /tmp/class-service.log 2>&1 &
CLASS_PID=$!
echo "  → PID: $CLASS_PID"

echo ""
echo "⏳ Waiting 10 seconds for services to start..."
sleep 10

echo ""
echo "📊 Service Status:"
echo "─────────────────────────────────────"

for port in 3001 3002 3003 3004 3005; do
    status=$(curl -s http://localhost:$port/health 2>/dev/null | jq -r '.service // .success // "unknown"' 2>/dev/null)
    if [ "$status" != "unknown" ] && [ ! -z "$status" ]; then
        echo "✅ Port $port: $status"
    else
        echo "❌ Port $port: Not responding yet (check logs)"
    fi
done

echo ""
echo "📝 Logs location: /tmp/*-service.log"
echo "📝 To view logs: tail -f /tmp/auth-service.log"
echo ""
echo "To stop all services, run: ./stop-all-services.sh"

