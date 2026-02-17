# 📱 Claim Code Mobile Registration - Test Guide

**Created:** February 11, 2026  
**Status:** Ready for Testing

---

## 🎯 Test Objective

Verify the complete claim code workflow from generation to mobile registration.

---

## ✅ Prerequisites Completed

### 1. School Created ✅
- **School Name:** Stunity Test Academy
- **School ID:** `cmlhqqxnd000a1meq450e9da4`
- **School Type:** HIGH_SCHOOL
- **Email:** school@stunity.test
- **Admin:** schooladmin@stunity.test / Admin123!
- **Trial:** 3 months (FREE_TRIAL_3M)
- **Status:** Active

### 2. Claim Code Generated ✅
- **Code:** `STNT-JAXM-RJ9P`
- **Type:** STUDENT
- **Expires:** March 13, 2026 (30 days)
- **Status:** Active, Unclaimed

### 3. Student Data in Claim Code
```json
{
  "firstName": "MobileTest",
  "lastName": "User",
  "email": "mobiletest@example.com",
  "phone": "+1234567890",
  "grade": "10",
  "studentId": "MOBILE001"
}
```

---

## 📱 Testing Steps

### Step 1: Open Mobile App

1. Make sure mobile app is running:
   ```bash
   cd apps/mobile
   npm start
   ```

2. Press `i` for iOS simulator or `a` for Android emulator

3. Verify network connection:
   - Check `.env.local` has correct IP: `192.168.18.73`
   - Verify services running: `./health-check.sh`

---

### Step 2: Navigate to Registration

1. Open the app (should show Login screen)
2. Tap **"Create Account"** or **"Sign Up"** button
3. Should see **4-step registration** form

---

### Step 3: Fill Registration Form

#### **Step 1: Personal Information**
- **First Name:** MobileTest
- **Last Name:** User
- Tap **"Continue"**

#### **Step 2: Organization**
- Toggle **"I have a school claim code"** checkbox
- **Enter Claim Code:** `STNT-JAXM-RJ9P`
- Tap **"Validate Code"** button
- Wait for validation...

**Expected Success Card:**
```
✅ Claim Code Valid!

School: Stunity Test Academy
Type: HIGH_SCHOOL
Student Name: MobileTest User
Grade: 10
Student ID: MOBILE001

[Continue] button enabled
```

- Tap **"Continue"** to next step

#### **Step 3: Role Selection**
- **Role should be auto-selected:** Student
- (Because claim code type is STUDENT)
- Tap **"Continue"**

#### **Step 4: Account Credentials**
- **Email:** mobiletest@example.com (should match claim code data)
- **Password:** Test123!
- **Confirm Password:** Test123!
- Check **"I accept Terms & Conditions"**
- Check **"I accept Privacy Policy"**
- Check **"I understand FERPA/GDPR compliance"**
- Tap **"Create Account"**

---

### Step 4: Verify Registration Success

**Expected:**
1. Loading spinner shows
2. API calls visible in console:
   ```
   🚀 [API] POST /auth/claim-codes/validate
   ✅ [API] POST /auth/claim-codes/validate - 200
   🚀 [API] POST /auth/register/with-claim-code
   ✅ [API] POST /auth/register/with-claim-code - 200
   🚀 [API] POST /auth/login
   ✅ [API] POST /auth/login - 200
   ```
3. Success alert:
   ```
   Account Created
   
   Welcome to Stunity Test Academy! Your account has been linked successfully.
   
   [Get Started]
   ```
4. Auto-login happens
5. Navigates to **Feed Screen**

---

### Step 5: Verify Account Linked

**Check in Mobile App:**
1. Navigate to **Profile** tab
2. Should show:
   - Name: MobileTest User
   - Email: mobiletest@example.com
   - Role: Student
   - School: Stunity Test Academy

**Check in Backend:**
```bash
# Verify claim code is now claimed
curl -s "http://localhost:3002/schools/cmlhqqxnd000a1meq450e9da4/claim-codes" \
  | jq '.data | map(select(.code == "STNT-JAXM-RJ9P"))'
```

**Expected Response:**
```json
{
  "code": "STNT-JAXM-RJ9P",
  "claimedAt": "2026-02-11T08:XX:XX.000Z",
  "claimedByUserId": "USER_ID",
  "isActive": false
}
```

---

## 🧪 Alternative Test Scenarios

### Test 2: Invalid Claim Code
1. Start registration
2. Enter claim code: `STNT-FAKE-CODE`
3. Tap "Validate Code"
4. **Expected:** Error message "Invalid or expired claim code"

### Test 3: Expired Claim Code
1. Use old claim code (expired)
2. **Expected:** Error message "This claim code has expired"

### Test 4: Already Claimed Code
1. Try using `STNT-JAXM-RJ9P` again
2. **Expected:** Error message "This claim code has already been used"

### Test 5: Registration Without Claim Code
1. Start registration
2. **DON'T** toggle "I have claim code"
3. Fill organization manually
4. Select role manually
5. Complete registration
6. **Expected:** Success, normal user account (not linked to school)

---

## 📊 Success Criteria

### ✅ Claim Code Validation
- [ ] Code validates successfully
- [ ] Shows school information
- [ ] Shows student data (name, grade, ID)
- [ ] Auto-fills organization field
- [ ] Auto-selects role

### ✅ Registration Flow
- [ ] All 4 steps work smoothly
- [ ] Form validation working
- [ ] Network calls successful
- [ ] No errors in console
- [ ] Smooth transitions

### ✅ Auto-Login
- [ ] After registration, auto-login happens
- [ ] Token stored in AsyncStorage
- [ ] User state updated
- [ ] Navigation to Feed

### ✅ Data Persistence
- [ ] Claim code marked as claimed
- [ ] User created in database
- [ ] School linkage established
- [ ] Role assigned correctly

---

## 🐛 Known Issues to Watch For

### Issue 1: Network Timeout
**Symptom:** `ECONNABORTED` error  
**Solution:**
1. Check `.env.local` has correct IP
2. Restart Expo: Press `r` in terminal
3. Verify backend services running

### Issue 2: Claim Code Not Found
**Symptom:** "School not found" error  
**Cause:** School ID mismatch  
**Solution:** Regenerate claim code with correct school ID

### Issue 3: Validation Stuck
**Symptom:** Loading spinner doesn't stop  
**Solution:**
1. Check Auth service (port 3001) is running
2. Check School service (port 3002) is running
3. Restart services if needed

---

## 🔧 Troubleshooting Commands

```bash
# Check service health
./health-check.sh

# Restart all services
./restart-all-services.sh

# Check school service logs
pm2 logs school-service

# Check if claim code exists
curl "http://localhost:3002/schools/cmlhqqxnd000a1meq450e9da4/claim-codes" | jq '.'

# Validate claim code manually
curl -X POST http://localhost:3001/auth/claim-codes/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "STNT-JAXM-RJ9P"}' | jq '.'
```

---

## 📝 Test Results

### Test Run 1: [DATE/TIME]
- [ ] Claim code validation: ✅ / ❌
- [ ] Registration completion: ✅ / ❌
- [ ] Auto-login: ✅ / ❌
- [ ] Data verification: ✅ / ❌

**Notes:**
_[Record any issues or observations]_

---

## 🎯 Next Steps After Successful Test

1. ✅ Verify claim code system works end-to-end
2. 🔄 Move to **Feed Integration** (Phase B)
   - Connect feedStore to backend
   - Implement post creation
   - Add media upload
   - Test interactions

---

## 📧 Claim Code Details

**For Reference:**

| Field | Value |
|-------|-------|
| **Claim Code** | `STNT-JAXM-RJ9P` |
| **School** | Stunity Test Academy |
| **School ID** | cmlhqqxnd000a1meq450e9da4 |
| **Type** | STUDENT |
| **Expires** | March 13, 2026 |
| **First Name** | MobileTest |
| **Last Name** | User |
| **Email** | mobiletest@example.com |
| **Grade** | 10 |
| **Student ID** | MOBILE001 |

---

**Status:** 🟢 Ready for Testing  
**Estimated Time:** 5-10 minutes  
**Risk:** Low (all systems operational)
