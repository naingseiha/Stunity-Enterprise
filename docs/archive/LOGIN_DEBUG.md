# 🔍 Login Debugging Guide

**Issue:** Login fails with 401 even though API works

---

## ✅ What's Working

1. ✅ Auth service is running (port 3001)
2. ✅ User exists in database
3. ✅ Direct API call works with curl
4. ✅ Credentials are correct

---

## 🔍 The Problem

**Frontend login fails with 401 Unauthorized**

But direct curl to API works fine:
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@testhighschool.edu","password":"SecurePass123!"}'
```

This returns success!

---

## 🎯 Solutions to Try

### Solution 1: Hard Refresh Browser

1. **Open browser** at http://localhost:3000
2. **Hard reload:**
   - Mac: Cmd + Shift + R
   - Windows: Ctrl + Shift + F5
3. **Clear all data:**
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Clear site data"
4. **Try login again**

### Solution 2: Try Incognito/Private Window

1. Open browser in incognito mode
2. Go to http://localhost:3000
3. Try login
4. This bypasses all cache

### Solution 3: Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Try to login
4. Look for the actual error message
5. Check the Network tab for the request/response

### Solution 4: Use Different Email Format

The seeded user is:
```
Email: john.doe@testhighschool.edu
Password: SecurePass123!
```

**But wait!** Let me verify the exact email...

---

## 📝 Test Login Manually

Open browser console (F12) and run:

```javascript
// Test 1: Check if services are accessible
fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(d => console.log('Auth service:', d));

// Test 2: Try login
fetch('http://localhost:3001/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john.doe@testhighschool.edu',
    password: 'SecurePass123!'
  })
})
.then(r => r.json())
.then(d => console.log('Login result:', d));
```

---

## 🔑 Verified Credentials

I just verified in the database:
- ✅ Email: john.doe@testhighschool.edu
- ✅ Password: SecurePass123!
- ✅ School: Test High School
- ✅ School ID: school-test-high-001

---

## 🐛 Common Issues

### Issue 1: CORS
Check browser console for CORS errors.

### Issue 2: Environment Variables Not Loaded
The web app needs to see NEXT_PUBLIC_AUTH_SERVICE_URL

### Issue 3: Cache
Old JavaScript code is cached in browser

### Issue 4: Wrong Port
Web app might be calling wrong auth service port

---

## ✅ Quick Fix

**Just cleared .next cache and restarted web app!**

Try login again at: http://localhost:3000

1. Go to login page
2. Enter:
   - Email: john.doe@testhighschool.edu  
   - Password: SecurePass123!
3. Click Login

**Should work now!**

---

## 📊 If Still Failing

Run this to check all services:

```bash
for port in 3001 3002 3003 3004 3005 3000; do
  curl -s http://localhost:$port/health 2>/dev/null | head -1 || echo "Port $port: Not responding"
done
```

---

## 🎯 Last Resort

Re-seed the database to ensure user exists:

```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise/packages/database
npm run seed
```

Then restart all services:

```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise
./quick-start.sh
```

---

**Try login again - web app was just restarted with clean cache!** 🚀
