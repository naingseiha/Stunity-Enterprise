#!/bin/bash

# ========================================
# Stop All Stunity Services
# ========================================

echo "🛑 Stopping all Stunity services..."
echo ""

# Define service ports
# school/student/teacher/class/subject/grade/attendance/timetable/club were
# consolidated into academic-api (Phase 0) — one port covers all of them now.
PORTS=(3000 3001 3010 3011 3013 3014 3018 3020 3021)
SERVICE_NAMES=("Web" "Auth" "Feed" "Messaging" "Notification" "Analytics" "Learn" "AI" "Academic API")

stopped_count=0
free_count=0

# Kill processes on each port
for i in "${!PORTS[@]}"; do
  port="${PORTS[$i]}"
  service="${SERVICE_NAMES[$i]}"
  
  pid=$(lsof -ti:$port 2>/dev/null)
  
  if [ ! -z "$pid" ]; then
    echo "🔴 Stopping $service Service (Port $port, PID: $pid)..."
    kill -9 $pid 2>/dev/null || true
    sleep 0.5
    
    # Verify it's stopped
    if lsof -ti:$port >/dev/null 2>&1; then
      echo "   ⚠️  Warning: Failed to stop PID $pid"
    else
      echo "   ✅ $service Service stopped"
      ((stopped_count++))
    fi
  else
    echo "✓ Port $port is already free ($service Service)"
    ((free_count++))
  fi
done

echo ""
echo "========================================="
echo "📊 Summary:"
echo "   Stopped: $stopped_count services"
echo "   Already free: $free_count ports"
echo "========================================="
echo ""
echo "✅ All services stopped!"
echo "You can now start services with: ./start-all-services.sh"
