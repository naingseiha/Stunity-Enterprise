#!/bin/bash

echo "Testing login with different methods..."
echo ""

echo "1. Testing with correct credentials:"
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@testhighschool.edu","password":"SecurePass123!"}' \
  2>&1 | jq -r '.success, .message' 2>/dev/null || echo "Login failed"

echo ""
echo "2. Testing with wrong password:"
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@testhighschool.edu","password":"WrongPassword"}' \
  2>&1 | jq -r '.success, .message' 2>/dev/null || echo "Expected failure"

echo ""
echo "3. Checking if auth service is accessible:"
curl -s http://localhost:3001/health | jq '.' 2>/dev/null || echo "Health check failed"

