#!/bin/bash

# Stunity Enterprise - Start All Services
# This script starts all microservices and the web app

echo "🚀 Starting Stunity Enterprise Services..."
echo ""

# Kill any existing processes on these ports
echo "📌 Cleaning up existing processes..."
lsof -ti:3000,3001,3002,3003,3004,3005 | xargs kill -9 2>/dev/null
sleep 2

# Start services
echo "🔐 Starting Auth Service (port 3001)..."
cd services/auth-service && PORT=3001 npm run dev > /tmp/stunity-auth.log 2>&1 &

echo "🏫 Starting School Service (port 3002)..."
cd ../school-service && PORT=3002 npm run dev > /tmp/stunity-school.log 2>&1 &

echo "👨‍🎓 Starting Student Service (port 3003)..."
cd ../student-service && PORT=3003 npm run dev > /tmp/stunity-student.log 2>&1 &

echo "👨‍🏫 Starting Teacher Service (port 3004)..."
cd ../teacher-service && PORT=3004 npm run dev > /tmp/stunity-teacher.log 2>&1 &

echo "📚 Starting Class Service (port 3005)..."
cd ../class-service && PORT=3005 npm run dev > /tmp/stunity-class.log 2>&1 &

echo "🌐 Starting Web App (port 3000)..."
cd ../../apps/web && PORT=3000 npm run dev > /tmp/stunity-web.log 2>&1 &

echo ""
echo "⏳ Waiting for services to start..."
sleep 8

echo ""
echo "✅ All services started!"
echo ""
echo "📊 Service Status:"
lsof -i:3000,3001,3002,3003,3004,3005 | grep LISTEN || echo "⚠️  Some services may not be running yet. Check logs in /tmp/stunity-*.log"

echo ""
echo "🌍 Access Points:"
echo "   Web App:         http://localhost:3000"
echo "   Auth Service:    http://localhost:3001/health"
echo "   School Service:  http://localhost:3002/health"
echo "   Student Service: http://localhost:3003/health"
echo "   Teacher Service: http://localhost:3004/health"
echo "   Class Service:   http://localhost:3005/health"
echo ""
echo "📝 Logs are in /tmp/stunity-*.log"
echo ""
echo "🛑 To stop all services: ./stop-services.sh"
echo ""
