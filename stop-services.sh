#!/bin/bash

# Stunity Enterprise - Stop All Services

echo "🛑 Stopping all Stunity Enterprise services..."

lsof -ti:3000,3001,3002,3003,3004,3005 | xargs kill -9 2>/dev/null

sleep 2

echo "✅ All services stopped!"
echo ""
echo "📝 Logs preserved in /tmp/stunity-*.log"
echo ""
