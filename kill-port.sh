#!/bin/bash

# ========================================
# Kill Process on Specific Port
# Usage: ./kill-port.sh <PORT>
# Example: ./kill-port.sh 3001
# ========================================

if [ -z "$1" ]; then
  echo "❌ Error: Port number required"
  echo ""
  echo "Usage: ./kill-port.sh <PORT>"
  echo "Example: ./kill-port.sh 3001"
  echo ""
  exit 1
fi

PORT=$1

echo "🔍 Checking port $PORT..."

pid=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$pid" ]; then
  echo "✅ Port $PORT is already free"
  exit 0
fi

echo "🔴 Found process on port $PORT (PID: $pid)"
echo "Killing process..."

kill -9 $pid 2>/dev/null

sleep 0.5

# Verify it's stopped
if lsof -ti:$PORT >/dev/null 2>&1; then
  echo "❌ Failed to kill process $pid"
  exit 1
else
  echo "✅ Successfully killed process on port $PORT"
  exit 0
fi
