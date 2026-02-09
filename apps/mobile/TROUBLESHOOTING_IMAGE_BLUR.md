# 🔍 Troubleshooting: Images Showing as Gray Blur

## 🎯 Problem
New posts show only a gray blur (blurhash placeholder) instead of actual images.
Old posts display images correctly.

## 🔬 Root Causes

### Cause 1: Backend Not Running ⚠️ **MOST COMMON**
**Symptom:** All new posts show blur, old posts work (cached or different URL format)

**Why:** The mobile app needs the backend's media proxy to access R2 images.
Without the backend, normalized URLs like `http://YOUR_IP:3010/media/posts/123.jpg` 
will fail to load.

**Fix:**
```bash
# Terminal 1: Start Backend
cd services/feed-service
npm run dev

# Terminal 2: Restart Expo (in another terminal)
cd apps/mobile  
npm start -- --clear
```

### Cause 2: Wrong Network Configuration
**Symptom:** Works on WiFi A, fails on WiFi B

**Why:** Your `.env.local` has an IP address that only works on one network.

**Fix:**
```bash
cd apps/mobile

# Find your current IP
bash scripts/detect-ip.sh

# Update .env.local with the correct IP
echo "EXPO_PUBLIC_API_HOST=YOUR_NEW_IP" > .env.local

# Restart Expo
npm start -- --clear
```

### Cause 3: R2 Configuration Issue
**Symptom:** All images (old and new) fail to load

**Why:** Backend can't access CloudFlare R2 or R2_PUBLIC_URL not set.

**Fix:**
```bash
# Check R2 configuration
grep R2_ ../../.env

# Should see:
# R2_PUBLIC_URL=https://pub-xxx.r2.dev
# R2_ACCOUNT_ID=...
# R2_ACCESS_KEY_ID=...
```

### Cause 4: RNImage.getSize() Fails on Redirected URLs
**Symptom:** Images show blur in auto mode only

**Why:** React Native's `Image.getSize()` sometimes fails on 302 redirects
from the media proxy.

**Fix:** The app already has fallback logic, but you can test by temporarily
using fixed aspect ratio instead of auto mode:

```typescript
// In PostCard.tsx - temporary test
<ImageCarousel 
  images={post.mediaUrls}
  mode="landscape"  // or "portrait" or "square"
/>
```

## 📊 Diagnostic Steps

### Step 1: Check Metro Console Logs
Look for these logs when viewing a post with images:

```
✅ Good Signs:
📥 [FeedStore] Sample post mediaUrls: ["https://pub-xxx.r2.dev/posts/123.jpg"]
✅ [ImageCarousel] Image loaded successfully: ...

❌ Bad Signs:
❌ [ImageCarousel] Failed to load image: http://192.168.18.129:3010/media/posts/123.jpg
⚠️  [ImageCarousel] Failed to get image size: ...
```

### Step 2: Run Diagnostic Script
```bash
cd apps/mobile
bash scripts/diagnose-r2.sh
```

Look for:
- ✅ Backend service running
- ✅ Media proxy responding  
- ✅ R2 configured

### Step 3: Test Media Proxy Manually
```bash
# Replace with your IP from .env.local
curl -I http://192.168.18.129:3010/media/posts/test.jpg

# Expected: HTTP/1.1 302 Found
# Location: https://pub-xxx.r2.dev/posts/test.jpg

# Bad: Connection refused (backend not running)
# Bad: HTTP/1.1 503 (R2 not configured)
```

### Step 4: Check Actual URLs in Database
```sql
-- Connect to your database and check what's stored
SELECT id, "mediaUrls", "createdAt" 
FROM "Post" 
WHERE "mediaUrls" IS NOT NULL 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

Compare:
- **Old posts**: `["https://pub-xxx.r2.dev/posts/123.jpg"]` ← Full URLs
- **New posts**: `["posts/123.jpg"]` ← Relative keys (need proxy)

## 🔧 Quick Fixes

### Fix 1: Force Restart Everything
```bash
# Stop everything
pkill -f "expo\|feed-service"

# Start backend
cd services/feed-service
npm run dev &

# Start Expo (wait 5 seconds for backend)
sleep 5
cd ../../apps/mobile
npm start -- --clear
```

### Fix 2: Clear All Caches
```bash
cd apps/mobile

# Clear Expo cache
rm -rf node_modules/.cache

# Clear Metro cache
rm -rf /tmp/metro-*
rm -rf /tmp/haste-*

# Restart
npm start -- --clear
```

### Fix 3: Verify Network Setup
```bash
# Your device and computer MUST be on same network
# Check computer IP
ipconfig getifaddr en0    # macOS WiFi
# or
ip addr show              # Linux

# Update .env.local with that IP
echo "EXPO_PUBLIC_API_HOST=YOUR_IP_HERE" > apps/mobile/.env.local
```

## 🎯 Expected Behavior After Fix

### In Metro Console:
```
📸 [ImageCarousel] Normalized URLs:
  0: posts/1736399744226-abc123.jpg → http://192.168.18.129:3010/media/posts/1736399744226-abc123.jpg

📐 [ImageCarousel] Fetching dimensions for: http://192.168.18.129:3010/media/posts/...
✅ [ImageCarousel] Got dimensions: 1200x800
✅ [ImageCarousel] Image 0 loaded: http://192.168.18.129:3010/media/posts/...
```

### In App:
- ✅ Old posts: Images load immediately
- ✅ New posts: Brief gray blur (< 1 second) → Image appears
- ✅ All posts: Can swipe through multiple images smoothly

## 🚨 Still Having Issues?

### Create a Test Post
1. Go to create post screen
2. Add ONE simple image (not multiple)
3. Post it
4. Watch Metro console logs
5. Copy any error messages

### Check Image URLs Directly
```bash
# Get a post's media URL from Metro logs
# Try accessing it in browser:
http://192.168.18.129:3010/media/posts/1736399744226-abc123.jpg

# Should redirect to:
https://pub-772730709ea64ee7824db864842e5bc0.r2.dev/posts/1736399744226-abc123.jpg

# If browser shows image → Backend works, issue is in mobile app
# If browser fails → Backend/R2 configuration issue
```

### Enable More Verbose Logging
Edit `services/feed-service/src/index.ts` and add logging to media proxy:

```typescript
app.get('/media/*', async (req: Request, res: Response) => {
  const key = req.params[0];
  console.log('📦 [Media Proxy] Request for:', key);
  
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
  console.log('🔗 [Media Proxy] Redirecting to:', `${R2_PUBLIC_URL}/${key}`);
  
  if (R2_PUBLIC_URL) {
    return res.redirect(`${R2_PUBLIC_URL}/${key}`);
  }
  // ...
});
```

## 📚 Related Documentation

- Full R2 fix guide: `R2_IMAGE_FIX.md`
- Network setup: `NETWORK_SETUP.md`  
- Diagnostic tool: `bash scripts/diagnose-r2.sh`

## 💡 Prevention

To avoid this issue in the future:

1. **Always run backend** when testing mobile app
2. **Update .env.local** when switching WiFi networks
3. **Check Metro console** if images don't load immediately
4. **Keep diagnostic script handy** for quick troubleshooting

## ✅ Success Checklist

- [ ] Backend is running (port 3010)
- [ ] .env.local has correct IP for current network
- [ ] Metro console shows image load success logs
- [ ] Test post creation with image works
- [ ] Can view both old and new posts
- [ ] Can swipe through multiple images
- [ ] Diagnostic script shows all green checkmarks

---

**Remember:** The gray blur is just the placeholder while loading. If it stays
gray, it means the image failed to load. Check Metro console for the real error!
