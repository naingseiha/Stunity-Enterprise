#!/bin/bash

# Clean Restart Script for Stunity Enterprise
# Fixes "ENFILE: file table overflow" errors

echo "🧹 Cleaning up and restarting services..."
echo ""

# Step 1: Increase file descriptor limit
echo "1️⃣ Increasing system file descriptor limit..."
ulimit -n 65536
echo "   ✅ Limit set to $(ulimit -n)"
echo ""

# Step 2: Stop all running services
echo "2️⃣ Stopping all services..."
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3012 3014; do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    kill -9 $pid 2>/dev/null
    echo "   ✅ Stopped service on port $port"
  fi
done
echo ""

# Step 3: Clean Metro cache
echo "3️⃣ Cleaning Metro cache..."
cd apps/mobile
rm -rf node_modules/.cache .expo /tmp/metro-* 2>/dev/null
echo "   ✅ Metro cache cleared"
echo ""

# Step 4: Start backend services
echo "4️⃣ Starting backend services..."
cd ../..
./quick-start.sh > /tmp/services-startup.log 2>&1 &
echo "   ⏳ Services starting in background..."
echo "   📝 Logs: /tmp/services-startup.log"
sleep 15
echo ""

# Step 5: Verify services
echo "5️⃣ Checking service status..."
running=0
failed=0
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3012 3014; do
  if lsof -ti:$port > /dev/null 2>&1; then
    running=$((running + 1))
  else
    failed=$((failed + 1))
  fi
done
echo "   ✅ $running services running"
if [ $failed -gt 0 ]; then
  echo "   ⚠️  $failed services failed to start"
fi
echo ""

# Step 6: Ready message
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ✅ READY TO START EXPO                              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Now run:"
echo "  cd apps/mobile"
echo "  npx expo start --clear"
echo ""
echo "Then in mobile app:"
echo "  1. Log out and log back in"
echo "  2. Create and take a quiz"
echo "  3. See XP animations! 🎉"
