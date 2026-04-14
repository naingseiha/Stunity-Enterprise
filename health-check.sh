#!/bin/bash

# Stunity Enterprise - Health Check
# Quickly verify all services are running

echo "🏥 Stunity Services Health Check"
echo "=================================="
echo ""

PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3018 3020)
NAMES=("Web" "Auth" "School" "Student" "Teacher" "Class" "Subject" "Grade" "Attendance" "Timetable" "Feed" "Messaging" "Club" "Notification" "Analytics" "Learn" "AI")

RUNNING=0
FAILED=0

for i in "${!PORTS[@]}"; do
    PORT="${PORTS[$i]}"
    NAME="${NAMES[$i]}"
    
    if lsof -ti:$PORT > /dev/null 2>&1; then
        echo "  ✅ $NAME Service (Port $PORT): Running"
        ((RUNNING++))
    else
        echo "  ❌ $NAME Service (Port $PORT): Not Running"
        ((FAILED++))
    fi
done

echo ""
echo "=================================="
echo "Summary: $RUNNING running, $FAILED stopped"
echo "=================================="

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All services are healthy!"
    echo ""
    echo "🌐 Web App: http://localhost:3000"
    echo "📱 Feed Service: http://localhost:3010"
    exit 0
else
    echo ""
    echo "⚠️  Some services are not running."
    echo "Run ./quick-start.sh to start all services"
    exit 1
fi
