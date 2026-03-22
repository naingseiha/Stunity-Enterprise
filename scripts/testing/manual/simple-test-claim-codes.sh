#!/bin/bash

# Simple Claim Code API Test
# Direct endpoint testing without dependencies

echo ""
echo "🧪 Simple Claim Code API Test"
echo "==============================="
echo ""

# Use a test school ID (replace with actual from your database)
SCHOOL_ID="cm7l1u9o80000h6bcgrpglwdi"

echo "Step 1: Generate bulk claim codes"
echo "----------------------------------"
GENERATE_RESPONSE=$(curl -s -X POST "http://localhost:3002/schools/$SCHOOL_ID/claim-codes/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TEACHER",
    "count": 5,
    "expiresInDays": 365
  }')

echo "$GENERATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$GENERATE_RESPONSE"
echo ""

# Extract a code for testing
CLAIM_CODE=$(echo "$GENERATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['codes'][0]['code'])" 2>/dev/null)

if [ -n "$CLAIM_CODE" ]; then
  echo "Generated code: $CLAIM_CODE"
  echo ""
  
  echo "Step 2: Validate the claim code"
  echo "--------------------------------"
  curl -s -X POST "http://localhost:3001/auth/claim-codes/validate" \
    -H "Content-Type: application/json" \
    -d "{\"code\": \"$CLAIM_CODE\"}" | python3 -m json.tool
  echo ""
  
  echo "Step 3: List claim codes"
  echo "------------------------"
  curl -s "http://localhost:3002/schools/$SCHOOL_ID/claim-codes?limit=5" | python3 -m json.tool 2>/dev/null | head -50
  echo ""
  
  echo "Step 4: Export CSV"
  echo "------------------"
  curl -s "http://localhost:3002/schools/$SCHOOL_ID/claim-codes/export?status=active" | head -10
  echo ""
  
  echo "✅ Test complete!"
else
  echo "❌ Failed to generate claim codes"
fi
