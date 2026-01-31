#!/bin/bash

# Test Script: Register New School with Enhanced Onboarding
# This tests the complete multi-tenant registration flow

echo "🏫 Testing Enhanced School Registration..."
echo ""

# Test Data
SCHOOL_NAME="Sunrise High School"
SCHOOL_EMAIL="admin@sunrisehigh.edu.kh"
SCHOOL_PHONE="+855 12 345 678"
SCHOOL_ADDRESS="Phnom Penh, Cambodia"
ADMIN_FIRST="John"
ADMIN_LAST="Doe"
ADMIN_EMAIL="john.doe@sunrisehigh.edu.kh"
ADMIN_PASSWORD="SecurePass123!"
TRIAL_MONTHS=3
SCHOOL_TYPE="HIGH_SCHOOL"

echo "📝 School Details:"
echo "  Name: $SCHOOL_NAME"
echo "  Email: $SCHOOL_EMAIL"
echo "  Type: $SCHOOL_TYPE"
echo "  Trial: $TRIAL_MONTHS months"
echo ""

# Make registration request
echo "🚀 Sending registration request..."
RESPONSE=$(curl -s -X POST http://localhost:3002/schools/register \
  -H "Content-Type: application/json" \
  -d "{
    \"schoolName\": \"$SCHOOL_NAME\",
    \"email\": \"$SCHOOL_EMAIL\",
    \"phone\": \"$SCHOOL_PHONE\",
    \"address\": \"$SCHOOL_ADDRESS\",
    \"adminFirstName\": \"$ADMIN_FIRST\",
    \"adminLastName\": \"$ADMIN_LAST\",
    \"adminEmail\": \"$ADMIN_EMAIL\",
    \"adminPhone\": \"$SCHOOL_PHONE\",
    \"adminPassword\": \"$ADMIN_PASSWORD\",
    \"trialMonths\": $TRIAL_MONTHS,
    \"schoolType\": \"$SCHOOL_TYPE\"
  }")

echo ""
echo "📊 Response:"
echo "$RESPONSE" | jq '.'

# Extract school ID for follow-up tests
SCHOOL_ID=$(echo "$RESPONSE" | jq -r '.data.school.id')

if [ "$SCHOOL_ID" != "null" ] && [ -n "$SCHOOL_ID" ]; then
  echo ""
  echo "✅ Registration successful!"
  echo "   School ID: $SCHOOL_ID"
  echo ""
  
  # Test onboarding status endpoint
  echo "🔍 Checking onboarding status..."
  curl -s "http://localhost:3002/schools/$SCHOOL_ID/onboarding/status" | jq '.'
  
else
  echo ""
  echo "❌ Registration failed!"
  exit 1
fi

echo ""
echo "🎉 Test Complete!"
