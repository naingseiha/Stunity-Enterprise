# Testing Guide - Stunity Enterprise v2.0

**Last Updated:** January 29, 2026  
**Status:** Backend Services Ready for Testing

---

## 📋 Table of Contents

1. [Backend API Testing](#backend-api-testing)
2. [Frontend Testing](#frontend-testing)
3. [Integration Testing](#integration-testing)
4. [Test Data](#test-data)
5. [Common Issues](#common-issues)

---

## 🔧 Backend API Testing

### Prerequisites

**1. Start All Services:**

```bash
# Terminal 1 - Auth Service
cd ~/Documents/Stunity-Enterprise/services/auth-service
npm run dev

# Terminal 2 - School Service
cd ~/Documents/Stunity-Enterprise/services/school-service
npm run dev

# Terminal 3 - Web App (when ready)
cd ~/Documents/Stunity-Enterprise/apps/web
npm run dev
```

**2. Verify Services Running:**
```bash
curl http://localhost:3001/health  # Auth service
curl http://localhost:3002/health  # School service
```

---

### Test 1: School Registration

**Register a New School (1-month trial):**

```bash
curl -X POST http://localhost:3002/schools/register \
  -H "Content-Type: application/json" \
  -d '{
    "schoolName": "Demo High School",
    "email": "admin@demohighschool.edu",
    "phone": "+1234567890",
    "address": "123 Education St, Demo City",
    "adminFirstName": "Admin",
    "adminLastName": "User",
    "adminEmail": "admin.user@demohighschool.edu",
    "adminPhone": "+1234567891",
    "adminPassword": "DemoPass123!",
    "trialMonths": 1
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "School registered successfully",
  "data": {
    "school": {
      "id": "...",
      "name": "Demo High School",
      "slug": "demo-high-school",
      "email": "admin@demohighschool.edu",
      "subscriptionTier": "FREE_TRIAL_1M",
      "subscriptionEnd": "2026-03-01T...",
      "isTrial": true
    },
    "admin": {
      "id": "...",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin.user@demohighschool.edu"
    },
    "academicYear": {
      "id": "...",
      "name": "2026-2027"
    }
  }
}
```

**What to Test:**
- ✅ School created with correct tier
- ✅ Admin user created
- ✅ Academic year created
- ✅ Trial end date calculated correctly (30 days)
- ✅ Slug is unique and URL-friendly

---

### Test 2: Duplicate Email Prevention

```bash
# Try to register with same school email
curl -X POST http://localhost:3002/schools/register \
  -H "Content-Type: application/json" \
  -d '{
    "schoolName": "Another School",
    "email": "admin@demohighschool.edu",
    "adminFirstName": "Test",
    "adminLastName": "User",
    "adminEmail": "test@test.com",
    "adminPassword": "Pass123!",
    "trialMonths": 1
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "School email already registered"
}
```

---

### Test 3: Login with Admin User

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.user@demohighschool.edu",
    "password": "DemoPass123!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "admin.user@demohighschool.edu",
      "firstName": "Admin",
      "lastName": "User",
      "role": "ADMIN",
      "schoolId": "..."
    },
    "school": {
      "id": "...",
      "name": "Demo High School",
      "slug": "demo-high-school",
      "subscriptionTier": "FREE_TRIAL_1M",
      "subscriptionEnd": "2026-03-01T...",
      "isTrial": true,
      "isActive": true
    },
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "eyJhbGci...",
      "expiresIn": "7d"
    },
    "trialDaysRemaining": 30
  }
}
```

**What to Test:**
- ✅ Correct user returned
- ✅ School context included
- ✅ JWT tokens generated
- ✅ Trial days calculated
- ✅ All fields populated

**Save the accessToken for next tests!**

---

### Test 4: Verify JWT Token

```bash
# Replace TOKEN with accessToken from login response
TOKEN="eyJhbGci..."

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/auth/verify
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin.user@demohighschool.edu",
      "firstName": "Admin",
      "lastName": "User",
      "role": "ADMIN",
      "schoolId": "..."
    },
    "school": {
      "id": "...",
      "name": "Demo High School",
      "slug": "demo-high-school",
      "subscriptionTier": "FREE_TRIAL_1M",
      "subscriptionEnd": "2026-03-01T...",
      "isTrial": true,
      "isActive": true
    }
  }
}
```

---

### Test 5: Get School Details

```bash
# Replace SCHOOL_ID with the school ID from registration
SCHOOL_ID="..."

curl http://localhost:3002/schools/$SCHOOL_ID
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Demo High School",
    "slug": "demo-high-school",
    "email": "admin@demohighschool.edu",
    "phone": "+1234567890",
    "address": "123 Education St, Demo City",
    "subscriptionTier": "FREE_TRIAL_1M",
    "subscriptionStart": "2026-01-29T...",
    "subscriptionEnd": "2026-03-01T...",
    "isActive": true,
    "isTrial": true,
    "maxStudents": 100,
    "maxTeachers": 10,
    "maxStorage": "1073741824",
    "currentStudents": 0,
    "currentTeachers": 0,
    "currentStorage": "0",
    "academicYears": [
      {
        "id": "...",
        "name": "2026-2027",
        "isCurrent": true
      }
    ],
    "_count": {
      "users": 1,
      "academicYears": 1
    }
  }
}
```

---

### Test 6: Invalid Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.user@demohighschool.edu",
    "password": "WrongPassword"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

### Test 7: Expired/Invalid Token

```bash
curl -H "Authorization: Bearer invalid_token_here" \
  http://localhost:3001/auth/verify
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid token"
}
```

---

## 🌐 Frontend Testing

### Once Web App is Built

**1. Landing Page (http://localhost:3000/en)**
- ✅ Hero section displays
- ✅ CTA buttons work
- ✅ Features cards show
- ✅ Language switcher works
- ✅ Switches to /km URL when clicking Khmer

**2. Login Page (http://localhost:3000/en/login)**
- ✅ Form inputs render
- ✅ Email validation works
- ✅ Password input toggles visibility
- ✅ Error messages display in correct language
- ✅ Successful login redirects to dashboard
- ✅ JWT tokens saved to localStorage

**3. Dashboard (http://localhost:3000/en/dashboard)**
- ✅ Protected route (redirects if not logged in)
- ✅ User name displays correctly
- ✅ School info shows
- ✅ Trial countdown accurate
- ✅ Logout button works
- ✅ Language switcher persists login state

---

## 🔗 Integration Testing

### Complete Flow Test

**1. Register New School:**
```bash
curl -X POST http://localhost:3002/schools/register \
  -H "Content-Type: application/json" \
  -d '{
    "schoolName": "Integration Test School",
    "email": "test@integrationschool.edu",
    "phone": "+1111111111",
    "adminFirstName": "Integration",
    "adminLastName": "Test",
    "adminEmail": "admin@integrationschool.edu",
    "adminPassword": "IntegrationPass123!",
    "trialMonths": 3
  }' | jq '.'
```

**2. Login with Admin:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@integrationschool.edu",
    "password": "IntegrationPass123!"
  }' | jq '.data.tokens.accessToken'
```

**3. Verify Token:**
```bash
TOKEN="..." # From step 2
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/auth/verify | jq '.'
```

**4. Check School Details:**
```bash
SCHOOL_ID="..." # From step 1
curl http://localhost:3002/schools/$SCHOOL_ID | jq '.'
```

**✅ All 4 steps should succeed without errors**

---

## 📊 Test Data

### Existing Test Schools

**1. Test High School (1-month trial)**
- Email: admin@testhighschool.edu
- Admin: john.doe@testhighschool.edu / SecurePass123!
- Slug: test-high-school
- Trial: ~30 days

**2. Riverside Academy (3-month trial)**
- Email: admin@riversideacademy.edu
- Admin: jane.smith@riversideacademy.edu / SuperSecure456!
- Slug: riverside-academy
- Trial: ~90 days

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot connect to database"

**Solution:**
```bash
# Check database connection
cd ~/Documents/Stunity-Enterprise/packages/database
cat .env | grep DATABASE_URL

# Test connection
npx prisma db pull
```

### Issue 2: "Module not found"

**Solution:**
```bash
# Regenerate Prisma Client
cd ~/Documents/Stunity-Enterprise/packages/database
npx prisma generate

# Or from root
cd ~/Documents/Stunity-Enterprise
node_modules/.bin/prisma generate --schema=packages/database/prisma/schema.prisma
```

### Issue 3: "Port already in use"

**Solution:**
```bash
# Find and kill process
lsof -ti:3001 | xargs kill  # Auth service
lsof -ti:3002 | xargs kill  # School service
lsof -ti:3000 | xargs kill  # Web app
```

### Issue 4: "CORS error in browser"

**Solution:**
Ensure CORS is enabled in both services (already done):
```typescript
app.use(cors());
```

### Issue 5: "BigInt serialization error"

**Solution:**
Already fixed with:
```typescript
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
```

---

## 📝 Testing Checklist

### Backend API Tests
- [ ] School registration (1-month trial)
- [ ] School registration (3-month trial)
- [ ] Duplicate email prevention
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Token verification
- [ ] Token expiration handling
- [ ] Get school details
- [ ] Trial days calculation
- [ ] Subscription tier enforcement

### Frontend Tests (When Built)
- [ ] Landing page loads
- [ ] Language switcher works
- [ ] Login form validation
- [ ] Login success flow
- [ ] Dashboard protected route
- [ ] Dashboard displays correct data
- [ ] Logout functionality
- [ ] Token persistence
- [ ] Responsive design (mobile/tablet/desktop)

### Integration Tests
- [ ] Register → Login → Dashboard flow
- [ ] Language switching persists state
- [ ] JWT tokens work across services
- [ ] School context maintained
- [ ] Trial countdown accurate

---

## 🚀 Postman Collection

**Import this JSON into Postman:**

```json
{
  "info": {
    "name": "Stunity Enterprise v2.0",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "School Service",
      "item": [
        {
          "name": "Register School",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"schoolName\": \"Demo School\",\n  \"email\": \"demo@school.edu\",\n  \"phone\": \"+1234567890\",\n  \"adminFirstName\": \"Admin\",\n  \"adminLastName\": \"User\",\n  \"adminEmail\": \"admin@school.edu\",\n  \"adminPassword\": \"Pass123!\",\n  \"trialMonths\": 1\n}"
            },
            "url": {"raw": "http://localhost:3002/schools/register"}
          }
        },
        {
          "name": "Get School",
          "request": {
            "method": "GET",
            "url": {"raw": "http://localhost:3002/schools/{{schoolId}}"}
          }
        }
      ]
    },
    {
      "name": "Auth Service",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@school.edu\",\n  \"password\": \"Pass123!\"\n}"
            },
            "url": {"raw": "http://localhost:3001/auth/login"}
          }
        },
        {
          "name": "Verify Token",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{accessToken}}"}],
            "url": {"raw": "http://localhost:3001/auth/verify"}
          }
        }
      ]
    }
  ]
}
```

---

## ⚡ Quick Test Script

**Save as `test-api.sh` and run with `bash test-api.sh`:**

```bash
#!/bin/bash

echo "🧪 Testing Stunity Enterprise v2.0 APIs"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Health Checks
echo "1️⃣  Testing Health Checks..."
AUTH_HEALTH=$(curl -s http://localhost:3001/health | jq -r '.status')
SCHOOL_HEALTH=$(curl -s http://localhost:3002/health | jq -r '.status')

if [ "$AUTH_HEALTH" = "ok" ] && [ "$SCHOOL_HEALTH" = "ok" ]; then
  echo -e "${GREEN}✅ All services healthy${NC}"
else
  echo -e "${RED}❌ Some services are down${NC}"
  exit 1
fi

echo ""

# Test 2: School Registration
echo "2️⃣  Testing School Registration..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3002/schools/register \
  -H "Content-Type: application/json" \
  -d '{
    "schoolName": "Test Script School",
    "email": "testscript@school.edu",
    "adminFirstName": "Test",
    "adminLastName": "Script",
    "adminEmail": "test@testscript.edu",
    "adminPassword": "TestScript123!",
    "trialMonths": 1
  }')

SUCCESS=$(echo $REGISTER_RESPONSE | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ School registered successfully${NC}"
  SCHOOL_ID=$(echo $REGISTER_RESPONSE | jq -r '.data.school.id')
  ADMIN_EMAIL=$(echo $REGISTER_RESPONSE | jq -r '.data.admin.email')
else
  echo -e "${RED}❌ Registration failed${NC}"
  echo $REGISTER_RESPONSE | jq '.'
  exit 1
fi

echo ""

# Test 3: Login
echo "3️⃣  Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"TestScript123!\"
  }")

LOGIN_SUCCESS=$(echo $LOGIN_RESPONSE | jq -r '.success')
if [ "$LOGIN_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ Login successful${NC}"
  ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.tokens.accessToken')
else
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

echo ""

# Test 4: Verify Token
echo "4️⃣  Testing Token Verification..."
VERIFY_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:3001/auth/verify)

VERIFY_SUCCESS=$(echo $VERIFY_RESPONSE | jq -r '.success')
if [ "$VERIFY_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ Token verified${NC}"
else
  echo -e "${RED}❌ Token verification failed${NC}"
  exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}🎉 All tests passed!${NC}"
```

---

**Ready to test!** 🚀
