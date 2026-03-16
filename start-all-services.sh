#!/bin/bash

# ========================================
# Start All Stunity Services (Clean Version)
# ========================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Stunity Enterprise Services${NC}"
echo ""

# Check for port conflicts
echo "🔍 Checking for port conflicts..."
PORTS_IN_USE=0
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3020; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    pid=$(lsof -ti:$port)
    echo -e "${YELLOW}⚠️  Port $port is already in use (PID: $pid)${NC}"
    PORTS_IN_USE=1
  fi
done

if [ $PORTS_IN_USE -eq 1 ]; then
  echo ""
  echo -e "${RED}❌ Some ports are already in use!${NC}"
  echo ""
  echo "Options:"
  echo "  1. Stop all: ./stop-all-services.sh"
  echo "  2. Then start: ./start-all-services.sh"
  echo "  OR"
  echo "  3. Restart: ./restart-all-services.sh"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ All ports are free!${NC}"
echo ""

# Start services
BASE="/Users/naingseiha/Documents/projects/Stunity-Enterprise"

start_service() {
    local name=$1
    local path=$2
    local port=$3
    
    echo -e "${YELLOW}Starting $name on port $port...${NC}"
    cd "$path"
    npm run dev > /tmp/stunity-$name.log 2>&1 &
    sleep 2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✅ $name started${NC}"
    else
        echo -e "${RED}❌ $name failed (check /tmp/stunity-$name.log)${NC}"
    fi
    echo ""
}

start_service "auth" "$BASE/services/auth-service" 3001
start_service "school" "$BASE/services/school-service" 3002
start_service "student" "$BASE/services/student-service" 3003
start_service "teacher" "$BASE/services/teacher-service" 3004
start_service "class" "$BASE/services/class-service" 3005
start_service "subject" "$BASE/services/subject-service" 3006
start_service "grade" "$BASE/services/grade-service" 3007
start_service "attendance" "$BASE/services/attendance-service" 3008
start_service "timetable" "$BASE/services/timetable-service" 3009
start_service "feed" "$BASE/services/feed-service" 3010
start_service "messaging" "$BASE/services/messaging-service" 3011
start_service "club" "$BASE/services/club-service" 3012
start_service "notification" "$BASE/services/notification-service" 3013
start_service "analytics" "$BASE/services/analytics-service" 3014
start_service "ai" "$BASE/services/ai-service" 3020
start_service "web" "$BASE/apps/web" 3000

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📝 Access:"
echo "   🌐 Web: http://localhost:3000"
echo "   🔐 Auth: http://localhost:3001"
echo "   🏫 School: http://localhost:3002"
echo "   👨‍🎓 Student: http://localhost:3003"
echo "   👨‍🏫 Teacher: http://localhost:3004"
echo "   📚 Class: http://localhost:3005"
echo "   🎓 Subject: http://localhost:3006"
echo "   📊 Grade: http://localhost:3007"
echo "   📋 Attendance: http://localhost:3008"
echo "   🕐 Timetable: http://localhost:3009"
echo "   📱 Feed: http://localhost:3010"
echo "   💬 Messaging: http://localhost:3011"
echo "   🎯 Club: http://localhost:3012"
echo "   🔔 Notification: http://localhost:3013"
echo "   📊 Analytics: http://localhost:3014"
echo "   🤖 AI: http://localhost:3020"
echo ""
echo "📋 Logs: /tmp/stunity-*.log"
echo "🛑 Stop: ./stop-all-services.sh"
echo "🔄 Restart: ./restart-all-services.sh"
echo "🔍 Check: ./check-services.sh"
