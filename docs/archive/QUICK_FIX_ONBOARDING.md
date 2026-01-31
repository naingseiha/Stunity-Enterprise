# 🔧 Quick Fix: Testing Onboarding Without Authentication

Since authentication integration isn't complete yet, here's how to test:

## Option 1: Use Browser Console (Quickest)

1. Open browser console (F12)
2. Run this command:
```javascript
localStorage.setItem('schoolId', 'cml11211o00006xsh61xi30o7');
```
3. Refresh the page
4. The onboarding wizard should load! ✅

## Option 2: Use URL Parameter (Better)

Navigate to:
```
http://localhost:3000/en/onboarding?schoolId=cml11211o00006xsh61xi30o7
```

I can update the code to read schoolId from URL params.

## Option 3: Update Code to Read from URL

Let me update the onboarding page to accept schoolId from URL...
