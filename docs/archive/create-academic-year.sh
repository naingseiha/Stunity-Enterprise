#!/bin/bash

echo "🎓 Create Academic Year for Stunity Enterprise"
echo "=============================================="
echo ""

# Get token and user info
read -p "Enter your JWT token (from localStorage): " TOKEN
read -p "Enter your School ID: " SCHOOL_ID
read -p "Academic Year Name (e.g., 2025-2026): " YEAR_NAME
read -p "Start Date (YYYY-MM-DD, e.g., 2025-10-01): " START_DATE
read -p "End Date (YYYY-MM-DD, e.g., 2026-09-30): " END_DATE

echo ""
echo "Creating academic year..."
echo ""

curl -X POST http://localhost:3002/schools/$SCHOOL_ID/academic-years \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"$YEAR_NAME\",
    \"startDate\": \"${START_DATE}T00:00:00.000Z\",
    \"endDate\": \"${END_DATE}T23:59:59.999Z\",
    \"setAsCurrent\": true
  }" | jq '.'

echo ""
echo "✅ Done! Refresh your browser to see the new academic year."
