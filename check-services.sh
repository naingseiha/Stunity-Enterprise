#!/bin/bash

# ========================================
# Check Port Status for All Stunity Services
# ========================================

echo "🔍 Checking Stunity service ports..."
echo ""

# Define service ports
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3018 3020)
SERVICE_NAMES=("Web App" "Auth Service" "School Service" "Student Service" "Teacher Service" "Class Service" "Subject Service" "Grade Service" "Attendance Service" "Timetable Service" "Feed Service" "Messaging Service" "Club Service" "Notification Service" "Analytics Service" "Learn Service" "AI Service")

running_count=0
free_count=0

echo "Port  | Service          | Status   | PID"
echo "------|------------------|----------|--------"

for i in "${!PORTS[@]}"; do
  port="${PORTS[$i]}"
  service="${SERVICE_NAMES[$i]}"
  
  pid=$(lsof -ti:$port 2>/dev/null)
  
  if [ ! -z "$pid" ]; then
    printf "%-6s| %-16s | 🟢 Running | %-8s\n" "$port" "$service" "$pid"
    ((running_count++))
  else
    printf "%-6s| %-16s | ⚪ Free    | %-8s\n" "$port" "$service" "-"
    ((free_count++))
  fi
done

echo ""
echo "========================================="
echo "📊 Summary:"
echo "   🟢 Running: $running_count services"
echo "   ⚪ Free: $free_count ports"
echo "========================================="
echo ""

if [ $running_count -gt 0 ]; then
  echo "💡 To stop all services: ./stop-all-services.sh"
  echo "💡 To kill specific port: kill -9 \$(lsof -ti:<PORT>)"
else
  echo "✅ All ports are free! Ready to start services."
  echo "💡 To start all: ./start-all-services.sh"
fi
