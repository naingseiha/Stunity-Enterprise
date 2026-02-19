#!/bin/bash

# Clear All Mobile App Caches and Restart

echo "🧹 Clearing all caches..."

cd /Users/naingseiha/Documents/Stunity-Enterprise/apps/mobile

# 1. Clear Metro bundler cache
echo "📦 Clearing Metro bundler cache..."
rm -rf .expo
rm -rf node_modules/.cache

# 2. Clear watchman cache (if installed)
echo "👁️  Clearing Watchman cache..."
if command -v watchman &> /dev/null; then
    watchman watch-del-all
fi

# 3. Clear Expo cache
echo "🔷 Clearing Expo cache..."
npx expo start -c --clear 2>/dev/null &
sleep 2
pkill -f "expo start" 2>/dev/null

# 4. Clear React Native cache
echo "⚛️  Clearing React Native cache..."
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

echo ""
echo "✅ All caches cleared!"
echo ""
echo "🚀 Starting fresh instance..."
echo "   Run: npm start -- --clear"
echo ""
