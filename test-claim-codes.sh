#!/bin/bash

# Claim Code System Integration Test
# Tests the complete claim code workflow end-to-end

set -e  # Exit on error

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   🧪 Claim Code System Integration Test         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API URLs
AUTH_URL="http://localhost:3001"
SCHOOL_URL="http://localhost:3002"
STUDENT_URL="http://localhost:3003"

# Test data
SCHOOL_ID=""
STUDENT_ID=""
CLAIM_CODE=""
USER_TOKEN=""

echo -e "${BLUE}📝 Test Prerequisites:${NC}"
echo "   - Auth Service running on port 3001"
echo "   - School Service running on port 3002"
echo "   - Student Service running on port 3003"
echo "   - Database migrated with claim code tables"
echo ""

# Function to print test result
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ PASS:${NC} $2"
  else
    echo -e "${RED}❌ FAIL:${NC} $2"
    echo -e "${RED}   Error: $3${NC}"
    exit 1
  fi
}

# ============================================================================
# STEP 1: Health Checks
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 1: Service Health Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check auth service
HEALTH=$(curl -s "$AUTH_URL/health" | jq -r '.status' 2>/dev/null)
if [ "$HEALTH" = "ok" ]; then
  test_result 0 "Auth Service health check"
else
  test_result 1 "Auth Service health check" "Service not responding"
fi

# Check school service
HEALTH=$(curl -s "$SCHOOL_URL/health" | jq -r '.status' 2>/dev/null)
if [ "$HEALTH" = "ok" ]; then
  test_result 0 "School Service health check"
else
  test_result 1 "School Service health check" "Service not responding"
fi

# Check student service
HEALTH=$(curl -s "$STUDENT_URL/health" | jq -r '.status' 2>/dev/null)
if [ "$HEALTH" = "ok" ]; then
  test_result 0 "Student Service health check"
else
  test_result 1 "Student Service health check" "Service not responding"
fi

echo ""

# ============================================================================
# STEP 2: Get Test School ID
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 2: Get Test School${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get first school from database
SCHOOL_DATA=$(curl -s "$SCHOOL_URL/schools?limit=1" | jq -r '.data.schools[0]' 2>/dev/null)
SCHOOL_ID=$(echo "$SCHOOL_DATA" | jq -r '.id' 2>/dev/null)

if [ "$SCHOOL_ID" != "null" ] && [ -n "$SCHOOL_ID" ]; then
  SCHOOL_NAME=$(echo "$SCHOOL_DATA" | jq -r '.name' 2>/dev/null)
  echo -e "   Using School: ${YELLOW}$SCHOOL_NAME${NC}"
  echo -e "   School ID: ${YELLOW}$SCHOOL_ID${NC}"
  test_result 0 "Retrieved test school"
else
  test_result 1 "Retrieved test school" "No schools found in database"
fi

echo ""

# ============================================================================
# STEP 3: Create Test Student with ID Generation
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 3: Create Test Student (ID Generation)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create student
CREATE_RESPONSE=$(curl -s -X POST "$STUDENT_URL/students" \
  -H "Content-Type: application/json" \
  -d "{
    \"schoolId\": \"$SCHOOL_ID\",
    \"firstName\": \"Sophea\",
    \"lastName\": \"Chan\",
    \"khmerName\": \"សុភា ចាន់\",
    \"dateOfBirth\": \"2008-05-15\",
    \"gender\": \"FEMALE\",
    \"email\": \"sophea.chan.test@example.com\"
  }")

STUDENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.student.id' 2>/dev/null)
GENERATED_STUDENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.student.studentId' 2>/dev/null)

if [ "$STUDENT_ID" != "null" ] && [ -n "$STUDENT_ID" ]; then
  echo -e "   Student ID (Database): ${YELLOW}$STUDENT_ID${NC}"
  echo -e "   Student ID (Generated): ${YELLOW}$GENERATED_STUDENT_ID${NC}"
  test_result 0 "Created test student with generated ID"
else
  ERROR_MSG=$(echo "$CREATE_RESPONSE" | jq -r '.error' 2>/dev/null)
  test_result 1 "Created test student" "$ERROR_MSG"
fi

echo ""

# ============================================================================
# STEP 4: Generate Claim Code
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 4: Generate Claim Code${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Generate claim code for student
GENERATE_RESPONSE=$(curl -s -X POST "$SCHOOL_URL/schools/$SCHOOL_ID/claim-codes/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"STUDENT\",
    \"studentIds\": [\"$STUDENT_ID\"],
    \"expiresInDays\": 365
  }")

CLAIM_CODE=$(echo "$GENERATE_RESPONSE" | jq -r '.data.codes[0].code' 2>/dev/null)

if [ "$CLAIM_CODE" != "null" ] && [ -n "$CLAIM_CODE" ]; then
  echo -e "   Generated Code: ${YELLOW}$CLAIM_CODE${NC}"
  echo -e "   Type: STUDENT"
  echo -e "   Expires: 365 days"
  test_result 0 "Generated claim code for student"
else
  ERROR_MSG=$(echo "$GENERATE_RESPONSE" | jq -r '.error' 2>/dev/null)
  test_result 1 "Generated claim code" "$ERROR_MSG"
fi

echo ""

# ============================================================================
# STEP 5: Validate Claim Code
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 5: Validate Claim Code${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Validate claim code
VALIDATE_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/claim-codes/validate" \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": \"$CLAIM_CODE\"
  }")

VALID=$(echo "$VALIDATE_RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$VALID" = "true" ]; then
  RETURNED_SCHOOL=$(echo "$VALIDATE_RESPONSE" | jq -r '.data.school.name' 2>/dev/null)
  RETURNED_STUDENT=$(echo "$VALIDATE_RESPONSE" | jq -r '.data.student.firstName' 2>/dev/null)
  echo -e "   School: ${YELLOW}$RETURNED_SCHOOL${NC}"
  echo -e "   Student: ${YELLOW}$RETURNED_STUDENT Chan${NC}"
  echo -e "   Requires Verification: $(echo "$VALIDATE_RESPONSE" | jq -r '.data.requiresVerification' 2>/dev/null)"
  test_result 0 "Validated claim code"
else
  ERROR_MSG=$(echo "$VALIDATE_RESPONSE" | jq -r '.error' 2>/dev/null)
  test_result 1 "Validated claim code" "$ERROR_MSG"
fi

echo ""

# ============================================================================
# STEP 6: Register with Claim Code
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 6: Register New Account with Claim Code${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Register new user with claim code
REGISTER_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/register/with-claim-code" \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": \"$CLAIM_CODE\",
    \"email\": \"sophea.test.$(date +%s)@example.com\",
    \"password\": \"SecurePass123!\",
    \"firstName\": \"Sophea\",
    \"lastName\": \"Chan\",
    \"phone\": \"+855123456789\"
  }")

SUCCESS=$(echo "$REGISTER_RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$SUCCESS" = "true" ]; then
  USER_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token' 2>/dev/null)
  USER_EMAIL=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.email' 2>/dev/null)
  ACCOUNT_TYPE=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.accountType' 2>/dev/null)
  echo -e "   Email: ${YELLOW}$USER_EMAIL${NC}"
  echo -e "   Account Type: ${YELLOW}$ACCOUNT_TYPE${NC}"
  echo -e "   Role: $(echo "$REGISTER_RESPONSE" | jq -r '.data.user.role' 2>/dev/null)"
  echo -e "   Token: ${YELLOW}${USER_TOKEN:0:30}...${NC}"
  test_result 0 "Registered account with claim code"
else
  ERROR_MSG=$(echo "$REGISTER_RESPONSE" | jq -r '.error' 2>/dev/null)
  test_result 1 "Registered account with claim code" "$ERROR_MSG"
fi

echo ""

# ============================================================================
# STEP 7: List Claim Codes
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 7: List Claim Codes${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# List claim codes
LIST_RESPONSE=$(curl -s "$SCHOOL_URL/schools/$SCHOOL_ID/claim-codes?type=STUDENT&limit=5")

TOTAL=$(echo "$LIST_RESPONSE" | jq -r '.data.pagination.total' 2>/dev/null)

if [ "$TOTAL" != "null" ] && [ "$TOTAL" -gt 0 ]; then
  echo -e "   Total Codes: ${YELLOW}$TOTAL${NC}"
  echo -e "   Recent Codes:"
  echo "$LIST_RESPONSE" | jq -r '.data.codes[] | "      - \(.code) (\(.type)) - \(if .claimedAt then "Claimed" else "Active" end)"' | head -5
  test_result 0 "Listed claim codes"
else
  test_result 1 "Listed claim codes" "No codes found"
fi

echo ""

# ============================================================================
# STEP 8: Generate Bulk Codes
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 8: Generate Bulk Generic Codes${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Generate 10 generic teacher codes
BULK_RESPONSE=$(curl -s -X POST "$SCHOOL_URL/schools/$SCHOOL_ID/claim-codes/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"TEACHER\",
    \"count\": 10,
    \"expiresInDays\": 180
  }")

BULK_COUNT=$(echo "$BULK_RESPONSE" | jq -r '.data.count' 2>/dev/null)

if [ "$BULK_COUNT" = "10" ]; then
  echo -e "   Generated: ${YELLOW}10 TEACHER codes${NC}"
  echo -e "   Sample codes:"
  echo "$BULK_RESPONSE" | jq -r '.data.codes[0:3][].code' | sed 's/^/      - /'
  test_result 0 "Generated bulk claim codes"
else
  ERROR_MSG=$(echo "$BULK_RESPONSE" | jq -r '.error' 2>/dev/null)
  test_result 1 "Generated bulk claim codes" "$ERROR_MSG"
fi

echo ""

# ============================================================================
# STEP 9: Export Claim Codes
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 9: Export Claim Codes as CSV${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Export CSV
CSV_CONTENT=$(curl -s "$SCHOOL_URL/schools/$SCHOOL_ID/claim-codes/export?status=active")

if echo "$CSV_CONTENT" | grep -q "Code,Type"; then
  LINE_COUNT=$(echo "$CSV_CONTENT" | wc -l | tr -d ' ')
  echo -e "   CSV Lines: ${YELLOW}$LINE_COUNT${NC}"
  echo -e "   Preview:"
  echo "$CSV_CONTENT" | head -4 | sed 's/^/      /'
  test_result 0 "Exported claim codes as CSV"
else
  test_result 1 "Exported claim codes as CSV" "Invalid CSV format"
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All Tests Passed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Summary:"
echo "  ✅ All services healthy"
echo "  ✅ Student created with generated ID"
echo "  ✅ Claim code generated successfully"
echo "  ✅ Claim code validated correctly"
echo "  ✅ Account registered with claim code"
echo "  ✅ Claim codes listed with pagination"
echo "  ✅ Bulk codes generated"
echo "  ✅ CSV export working"
echo ""
echo -e "${BLUE}📊 Test Artifacts:${NC}"
echo "  Student ID: $STUDENT_ID"
echo "  Generated Student ID: $GENERATED_STUDENT_ID"
echo "  Claim Code: $CLAIM_CODE"
echo "  User Token: ${USER_TOKEN:0:30}..."
echo ""
echo -e "${GREEN}🎉 Integration test complete!${NC}"
echo ""
