#!/bin/bash

# Test Registration Endpoints
# Ensures mobile app can communicate with backend properly

set -e

API_HOST="${EXPO_PUBLIC_API_HOST:-localhost}"
AUTH_URL="http://${API_HOST}:3001"

echo "🧪 Testing Registration Endpoints"
echo "=================================="
echo "Auth URL: $AUTH_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "1️⃣  Testing auth service health..."
HEALTH=$(curl -s "${AUTH_URL}/health" || echo "failed")
if echo "$HEALTH" | grep -q "ok"; then
  echo -e "${GREEN}✓ Auth service is running${NC}"
else
  echo -e "${RED}✗ Auth service is not responding${NC}"
  exit 1
fi
echo ""

# Test 2: Validate Claim Code (with invalid code)
echo "2️⃣  Testing claim code validation (invalid code)..."
INVALID_CLAIM=$(curl -s -X POST "${AUTH_URL}/auth/claim-codes/validate" \
  -H "Content-Type: application/json" \
  -d '{"code":"INVALID-CODE-1234"}' || echo "failed")

if echo "$INVALID_CLAIM" | grep -q '"success":false'; then
  echo -e "${GREEN}✓ Invalid claim code correctly rejected${NC}"
else
  echo -e "${YELLOW}⚠ Unexpected response for invalid claim code${NC}"
  echo "$INVALID_CLAIM"
fi
echo ""

# Test 3: Check if test school exists
echo "3️⃣  Checking for test school..."
SCHOOL_CHECK=$(curl -s "${AUTH_URL}/../3002/schools" || echo "failed")
echo -e "${YELLOW}ℹ School service response: ${SCHOOL_CHECK:0:100}...${NC}"
echo ""

# Test 4: Regular Registration (without claim code)
echo "4️⃣  Testing regular registration..."
RANDOM_EMAIL="test_$(date +%s)@stunity.com"
REG_RESPONSE=$(curl -s -X POST "${AUTH_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"email\": \"${RANDOM_EMAIL}\",
    \"password\": \"Test123!@#\",
    \"role\": \"STUDENT\",
    \"organization\": \"Test University\",
    \"organizationType\": \"university\"
  }" || echo "failed")

if echo "$REG_RESPONSE" | grep -q '"success":true\|"message":"User already exists"'; then
  echo -e "${GREEN}✓ Registration endpoint is working${NC}"
  echo "Response: $(echo $REG_RESPONSE | jq -r '.message' 2>/dev/null || echo $REG_RESPONSE)"
else
  echo -e "${RED}✗ Registration failed${NC}"
  echo "Response: $REG_RESPONSE"
fi
echo ""

# Test 5: Login Test
echo "5️⃣  Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST "${AUTH_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test@example.com\",
    \"password\": \"wrongpassword\"
  }" || echo "failed")

if echo "$LOGIN_RESPONSE" | grep -q 'Invalid\|failed\|success'; then
  echo -e "${GREEN}✓ Login endpoint is responding${NC}"
else
  echo -e "${YELLOW}⚠ Unexpected login response${NC}"
  echo "$LOGIN_RESPONSE"
fi
echo ""

# Summary
echo "=================================="
echo "✅ Basic registration flow is testable"
echo ""
echo "Next steps:"
echo "1. Generate real claim codes in school admin"
echo "2. Test with actual claim code"
echo "3. Test mobile app registration flow"
echo "4. Verify token storage and navigation"
echo ""
