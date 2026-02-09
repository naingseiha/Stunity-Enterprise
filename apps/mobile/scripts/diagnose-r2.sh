#!/bin/bash

# R2 Image Loading Diagnostic Script
# Run this to check if everything is configured correctly

echo "🔍 R2 Image Loading Diagnostics"
echo "================================"
echo ""

# Check backend R2 configuration
echo "1️⃣ Checking Backend R2 Configuration..."
cd ../../
if grep -q "R2_PUBLIC_URL" .env 2>/dev/null; then
  R2_URL=$(grep "R2_PUBLIC_URL" .env | cut -d'=' -f2)
  echo "   ✅ R2_PUBLIC_URL found: $R2_URL"
else
  echo "   ⚠️  R2_PUBLIC_URL not found in .env"
fi

if grep -q "R2_ACCOUNT_ID" .env 2>/dev/null; then
  echo "   ✅ R2_ACCOUNT_ID configured"
else
  echo "   ❌ R2_ACCOUNT_ID missing"
fi
echo ""

# Check mobile app IP configuration
echo "2️⃣ Checking Mobile App Network Configuration..."
if [ -f "apps/mobile/.env.local" ]; then
  API_HOST=$(grep "EXPO_PUBLIC_API_HOST" apps/mobile/.env.local | grep -v "^#" | head -1 | cut -d'=' -f2)
  echo "   ✅ API Host: $API_HOST"
else
  echo "   ⚠️  .env.local not found - using default (localhost)"
  API_HOST="localhost"
fi
echo ""

# Check if backend is running
echo "3️⃣ Checking if Backend is Running..."
if curl -s -o /dev/null -w "%{http_code}" "http://${API_HOST}:3010/health" | grep -q "200"; then
  echo "   ✅ Feed service is running on port 3010"
else
  echo "   ❌ Feed service not responding"
  echo "   → Start it with: cd services/feed-service && npm run dev"
fi
echo ""

# Test media proxy endpoint
echo "4️⃣ Testing Media Proxy Endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" "http://${API_HOST}:3010/media/test.jpg" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "302" ]; then
  echo "   ✅ Media proxy is working (302 redirect)"
elif [ "$HTTP_CODE" = "503" ]; then
  echo "   ⚠️  Media proxy works but R2 not fully configured (503)"
else
  echo "   ❌ Media proxy not responding correctly (HTTP $HTTP_CODE)"
fi
echo ""

# Check mobile dependencies
echo "5️⃣ Checking Mobile App Dependencies..."
if [ -f "apps/mobile/src/utils/mediaUtils.ts" ]; then
  echo "   ✅ mediaUtils.ts exists"
else
  echo "   ❌ mediaUtils.ts not found"
fi

if grep -q "normalizeMediaUrls" "apps/mobile/src/components/common/ImageCarousel.tsx" 2>/dev/null; then
  echo "   ✅ ImageCarousel uses normalizeMediaUrls"
else
  echo "   ❌ ImageCarousel not updated"
fi
echo ""

# Summary
echo "📊 Summary"
echo "=========="
echo ""
echo "✅ What to do next:"
echo ""
echo "1. Make sure backend is running:"
echo "   cd services/feed-service && npm run dev"
echo ""
echo "2. Restart Expo dev server:"
echo "   cd apps/mobile && npm start -- --clear"
echo ""
echo "3. Test on your device:"
echo "   - View existing posts (should work)"
echo "   - Create new post with image"
echo "   - Check Metro console for:"
echo "     📸 [ImageCarousel] Normalized URLs:"
echo ""
echo "4. If images still don't load:"
echo "   - Check Metro console for errors"
echo "   - Verify R2_PUBLIC_URL in .env"
echo "   - Test: curl -I http://${API_HOST}:3010/media/posts/test.jpg"
echo ""
echo "📚 Full documentation: apps/mobile/R2_IMAGE_FIX.md"
echo ""
