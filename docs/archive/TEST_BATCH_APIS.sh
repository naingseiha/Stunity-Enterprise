#!/bin/bash

echo "🧪 Testing Batch API Endpoints"
echo "================================"
echo ""

SCHOOL_ID="cml11211o00006xsh61xi30o7"
ACADEMIC_YEAR_ID=$(curl -s http://localhost:3002/schools/${SCHOOL_ID}/onboarding/status | jq -r '.data.academicYear.id')

echo "School ID: $SCHOOL_ID"
echo "Academic Year ID: $ACADEMIC_YEAR_ID"
echo ""

# Test 1: Teachers Batch
echo "1️⃣  Testing POST /teachers/batch..."
curl -s -X POST http://localhost:3005/teachers/batch \
  -H "Content-Type: application/json" \
  -d "{
    \"schoolId\": \"$SCHOOL_ID\",
    \"teachers\": [
      {
        \"firstName\": \"Sophal\",
        \"lastName\": \"Chan\",
        \"email\": \"sophal.chan@test.edu.kh\",
        \"phone\": \"+855 12 111 222\",
        \"gender\": \"M\",
        \"dateOfBirth\": \"1985-05-15\",
        \"address\": \"Phnom Penh\"
      },
      {
        \"firstName\": \"Sreyleak\",
        \"lastName\": \"Kem\",
        \"email\": \"sreyleak.kem@test.edu.kh\",
        \"phone\": \"+855 12 333 444\",
        \"gender\": \"F\",
        \"dateOfBirth\": \"1990-08-22\",
        \"address\": \"Phnom Penh\"
      }
    ]
  }" | jq '.'

echo ""
echo "2️⃣  Testing POST /classes/batch..."
curl -s -X POST http://localhost:3003/classes/batch \
  -H "Content-Type: application/json" \
  -d "{
    \"schoolId\": \"$SCHOOL_ID\",
    \"academicYearId\": \"$ACADEMIC_YEAR_ID\",
    \"classes\": [
      {
        \"name\": \"Grade 10A\",
        \"nameKh\": \"ថ្នាក់ទី 10A\",
        \"grade\": \"10\",
        \"section\": \"A\",
        \"capacity\": 40
      },
      {
        \"name\": \"Grade 10B\",
        \"nameKh\": \"ថ្នាក់ទី 10B\",
        \"grade\": \"10\",
        \"section\": \"B\",
        \"capacity\": 40
      }
    ]
  }" | jq '.'

echo ""
echo "3️⃣  Testing POST /students/batch..."
curl -s -X POST http://localhost:3004/students/batch \
  -H "Content-Type: application/json" \
  -d "{
    \"schoolId\": \"$SCHOOL_ID\",
    \"students\": [
      {
        \"firstName\": \"Dara\",
        \"lastName\": \"Sok\",
        \"gender\": \"M\",
        \"dateOfBirth\": \"2008-05-15\",
        \"grade\": \"10\",
        \"parentPhone\": \"+855 12 555 666\"
      },
      {
        \"firstName\": \"Sophea\",
        \"lastName\": \"Chea\",
        \"gender\": \"F\",
        \"dateOfBirth\": \"2007-08-22\",
        \"grade\": \"11\",
        \"parentPhone\": \"+855 12 777 888\"
      }
    ]
  }" | jq '.'

echo ""
echo "✅ All batch endpoints tested!"
