#!/bin/bash

# Stunity Enterprise - Start All Services
# Run this script to start all microservices

echo "🚀 Starting Stunity Enterprise Services..."
echo ""

# Function to start a service
start_service() {
    local service_name=$1
    local port=$2
    local service_dir="services/$service_name"
    
    echo "Starting $service_name on port $port..."
    cd "$service_dir"
    npm run dev > "/tmp/$service_name.log" 2>&1 &
    echo "$!" > "/tmp/$service_name.pid"
    cd - > /dev/null
}

# Start all services
start_service "auth-service" 3001
sleep 2
start_service "school-service" 3002
sleep 2
start_service "student-service" 3003
sleep 2
start_service "teacher-service" 3004
sleep 2
start_service "class-service" 3005

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "Checking service health..."
for port in 3001 3002 3003 3004 3005; do
    status=$(curl -s http://localhost:$port/health 2>/dev/null | jq -r '.service // .success // "unknown"' 2>/dev/null)
    if [ "$status" != "unknown" ] && [ ! -z "$status" ]; then
        echo "✅ Port $port: $status"
    else
        echo "❌ Port $port: Not responding"
    fi
done

echo ""
echo "📝 Service logs are in /tmp/*.log"
echo "📝 Service PIDs are in /tmp/*.pid"
echo ""
echo "To stop services, run: ./stop-services.sh"
