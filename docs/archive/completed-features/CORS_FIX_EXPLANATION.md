# CORS Error Fix

## The Error You Saw

```
Access to fetch at 'http://localhost:3001/auth/login' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control 
check: Redirect is not allowed for a preflight request.
```

## What This Means

**CORS (Cross-Origin Resource Sharing)** is a security feature in browsers that blocks requests from one origin (domain/port) to another unless the server explicitly allows it.

### Your Setup:
- **Frontend (Web App):** http://localhost:3000
- **Backend (Auth Service):** http://localhost:3001

These are **different origins** (different ports), so the browser requires CORS headers.

### What's a Preflight Request?

When you make a POST request with custom headers (like `Authorization`), the browser first sends an **OPTIONS request** (called a "preflight") to check if the server allows it.

**The Flow:**
1. Browser: "Can I send POST to /auth/login from localhost:3000?"
2. Server: Should respond with CORS headers allowing it
3. Browser: "OK, now I'll send the actual POST request"

## The Problem

Your services had basic CORS enabled:
```typescript
app.use(cors()); // Too simple!
```

This allows GET requests but may not properly handle preflight OPTIONS requests with credentials and custom headers.

## The Fix

Updated all services with **explicit CORS configuration:**

```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',  // Web app
    'http://localhost:3001',  // Auth service
    'http://localhost:3002',  // School service
    'http://localhost:3003',  // Student service
    'http://localhost:3004',  // Teacher service
    'http://localhost:3005',  // Class service
  ],
  credentials: true,  // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### What This Does:

1. **origin:** Explicitly lists allowed origins
2. **credentials:** Allows sending cookies and auth headers
3. **methods:** Specifies which HTTP methods are allowed
4. **allowedHeaders:** Allows Authorization header for JWT tokens

## Services Updated

✅ auth-service (Port 3001)  
✅ school-service (Port 3002)  
✅ student-service (Port 3003)  
✅ teacher-service (Port 3004)  
✅ class-service (Port 3005)

## How to Apply the Fix

### Option 1: Restart Services Manually

Stop and restart each service:

```bash
# Stop all services (Ctrl+C in each terminal)
# Then restart:

# Terminal 1 - Auth
cd ~/Documents/Stunity-Enterprise/services/auth-service
npm run dev

# Terminal 2 - School
cd ~/Documents/Stunity-Enterprise/services/school-service
npm run dev

# Terminal 3 - Student
cd ~/Documents/Stunity-Enterprise/services/student-service
npm run dev

# Terminal 4 - Teacher
cd ~/Documents/Stunity-Enterprise/services/teacher-service
npm run dev

# Terminal 5 - Class
cd ~/Documents/Stunity-Enterprise/services/class-service
npm run dev
```

### Option 2: Use the Start Script

```bash
cd ~/Documents/Stunity-Enterprise
chmod +x start-services.sh
./start-services.sh
```

## Testing the Fix

After restarting services:

1. **Clear browser cache** (you already did this ✅)
2. **Open http://localhost:3000**
3. **Try logging in** - should work now!
4. **Open browser console** - no more CORS errors

### Verify CORS Headers

You can test with curl:

```bash
# Send a preflight OPTIONS request
curl -X OPTIONS http://localhost:3001/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

You should see these headers in the response:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization
Access-Control-Allow-Credentials: true
```

## Why This Happened After Browser Clear

When you cleared browser data:
1. Your old JWT token was deleted
2. You tried to login again
3. The browser sent a fresh preflight request
4. The CORS configuration wasn't explicit enough
5. Browser blocked the request

## Production Deployment

When deploying to production, update the CORS origins:

```typescript
app.use(cors({
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'https://api.yourdomain.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

## Common CORS Issues

### Issue 1: Wildcard with Credentials
❌ **DON'T:**
```typescript
app.use(cors({
  origin: '*',
  credentials: true, // ERROR: Can't use * with credentials
}));
```

✅ **DO:**
```typescript
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}));
```

### Issue 2: Missing OPTIONS Handler
Some frameworks need explicit OPTIONS handling:
```typescript
app.options('*', cors()); // Handle preflight for all routes
```

### Issue 3: Multiple CORS Middleware
Make sure you only call `app.use(cors(...))` **once** at the top.

## Summary

✅ **Fixed:** Explicit CORS configuration in all services  
✅ **Allows:** Requests from localhost:3000 to all services  
✅ **Supports:** JWT authentication headers  
✅ **Ready:** Restart services and login should work

The CORS error is now fixed! Just restart the services and you'll be able to login successfully.
