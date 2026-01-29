#!/bin/bash

# Stunity Enterprise - Service Startup Script
# This script stops any existing services and provides instructions

echo "🚀 Stunity Enterprise - Service Startup Helper"
echo "=============================================="
echo ""

# Function to check and kill process on port
kill_port() {
  local port=$1
  local service=$2
  local pid=$(lsof -ti:$port 2>/dev/null)
  
  if [ -n "$pid" ]; then
    echo "⚠️  Port $port already in use (PID: $pid) - killing process..."
    kill -9 $pid 2>/dev/null
    sleep 1
    echo "✅ Port $port freed for $service"
  else
    echo "✓ Port $port is available for $service"
  fi
}

# Check and free all ports
echo "📋 Checking ports..."
kill_port 3001 "auth-service"
kill_port 3002 "school-service"
kill_port 3003 "student-service"
kill_port 3004 "teacher-service"
kill_port 3005 "class-service"

echo ""
echo "=============================================="
echo "✅ All ports are now available!"
echo ""
echo "🚀 Start your services in separate terminals:"
echo ""
echo "Terminal 1 (Auth):"
echo "  cd ~/Documents/Stunity-Enterprise/services/auth-service && npm run dev"
echo ""
echo "Terminal 2 (School):"
echo "  cd ~/Documents/Stunity-Enterprise/services/school-service && npm run dev"
echo ""
echo "Terminal 3 (Student) - NOW WITH CACHING! ⚡"
echo "  cd ~/Documents/Stunity-Enterprise/services/student-service && npm run dev"
echo ""
echo "Terminal 4 (Teacher):"
echo "  cd ~/Documents/Stunity-Enterprise/services/teacher-service && npm run dev"
echo ""
echo "Terminal 5 (Class):"
echo "  cd ~/Documents/Stunity-Enterprise/services/class-service && npm run dev"
echo ""
echo "Terminal 6 (Web App):"
echo "  cd ~/Documents/Stunity-Enterprise/apps/web && npm run dev"
echo ""
echo "=============================================="
echo "📝 After all services start, open: http://localhost:3000"
echo ""
