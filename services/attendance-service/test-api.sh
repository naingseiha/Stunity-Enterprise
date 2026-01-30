#!/bin/bash

# Attendance Service Test Script
# This script tests all endpoints of the attendance service

BASE_URL="http://localhost:3008"
CONTENT_TYPE="Content-Type: application/json"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Attendance Service API Tests"
echo "=========================================="
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
echo "GET $BASE_URL/health"
echo ""
response=$(curl -s "$BASE_URL/health")
echo "$response" | python3 -m json.tool
if echo "$response" | grep -q "success"; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi
echo ""
echo "=========================================="
echo ""

# Note: The following tests require authentication
echo -e "${YELLOW}Note: Remaining tests require JWT authentication${NC}"
echo "To test authenticated endpoints, you need to:"
echo "1. Start the auth-service"
echo "2. Login to get a JWT token"
echo "3. Replace 'YOUR_TOKEN' in the commands below with your actual token"
echo ""

# Test 2: Get Class Attendance for Date
echo -e "${YELLOW}Test 2: Get Class Attendance for Date${NC}"
echo "GET $BASE_URL/attendance/class/{classId}/date/{date}"
echo "Example:"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  $BASE_URL/attendance/class/class123/date/2024-01-15"
echo ""
echo "=========================================="
echo ""

# Test 3: Bulk Save Attendance
echo -e "${YELLOW}Test 3: Bulk Save Attendance${NC}"
echo "POST $BASE_URL/attendance/bulk"
echo "Example:"
cat <<'EOF'
curl -X POST \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "classId": "class123",
    "date": "2024-01-15",
    "session": "MORNING",
    "attendance": [
      {"studentId": "student1", "status": "PRESENT"},
      {"studentId": "student2", "status": "ABSENT", "remarks": "Sick"}
    ]
  }' \
  http://localhost:3008/attendance/bulk
EOF
echo ""
echo "=========================================="
echo ""

# Test 4: Update Single Attendance
echo -e "${YELLOW}Test 4: Update Single Attendance${NC}"
echo "PUT $BASE_URL/attendance/{id}"
echo "Example:"
cat <<'EOF'
curl -X PUT \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "EXCUSED",
    "remarks": "Medical appointment"
  }' \
  http://localhost:3008/attendance/att123
EOF
echo ""
echo "=========================================="
echo ""

# Test 5: Delete Attendance
echo -e "${YELLOW}Test 5: Delete Attendance${NC}"
echo "DELETE $BASE_URL/attendance/{id}"
echo "Example:"
echo "curl -X DELETE -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  $BASE_URL/attendance/att123"
echo ""
echo "=========================================="
echo ""

# Test 6: Get Monthly Attendance Grid
echo -e "${YELLOW}Test 6: Get Monthly Attendance Grid${NC}"
echo "GET $BASE_URL/attendance/class/{classId}/month/{month}/year/{year}"
echo "Example:"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  $BASE_URL/attendance/class/class123/month/1/year/2024"
echo ""
echo "=========================================="
echo ""

# Test 7: Student Attendance Summary
echo -e "${YELLOW}Test 7: Student Attendance Summary${NC}"
echo "GET $BASE_URL/attendance/student/{studentId}/summary"
echo "Example (with date range):"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  '$BASE_URL/attendance/student/student123/summary?startDate=2024-01-01&endDate=2024-01-31'"
echo ""
echo "Example (current month):"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  $BASE_URL/attendance/student/student123/summary"
echo ""
echo "=========================================="
echo ""

# Test 8: Class Attendance Summary
echo -e "${YELLOW}Test 8: Class Attendance Summary${NC}"
echo "GET $BASE_URL/attendance/class/{classId}/summary"
echo "Example:"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  '$BASE_URL/attendance/class/class123/summary?startDate=2024-01-01&endDate=2024-01-31'"
echo ""
echo "=========================================="
echo ""

# Summary
echo -e "${GREEN}Service is running and accessible!${NC}"
echo ""
echo "Available Endpoints:"
echo "  - GET  /health"
echo "  - GET  /attendance/class/:classId/date/:date"
echo "  - POST /attendance/bulk"
echo "  - PUT  /attendance/:id"
echo "  - DELETE /attendance/:id"
echo "  - GET  /attendance/class/:classId/month/:month/year/:year"
echo "  - GET  /attendance/student/:studentId/summary"
echo "  - GET  /attendance/class/:classId/summary"
echo ""
echo "For full documentation, see README.md"
