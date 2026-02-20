# 📜 Feed Scroll Issue - Debug Guide

## ✅ What We've Fixed

1. **Removed duplicate headers** from FeedPage component
2. **Simplified layout structure** using React Fragment
3. **Proper sticky positioning** for header and filters
4. **Correct parent container padding** (pb-20 for bottom nav clearance)

## 🏗️ Current Layout Structure

```tsx
// src/app/feed/page.tsx
<div className="min-h-screen bg-gray-50">          ← Should allow natural scrolling
  <FeedHeader />                                    ← Sticky at top (z-30)
  <div className="max-w-2xl mx-auto px-4 pb-20">  ← Container with bottom padding
    <FeedPage />                                    ← Content
  </div>
  <MobileBottomNav />                              ← Fixed at bottom (z-40)
</div>

// src/components/feed/FeedPage.tsx
<>                                                  ← React Fragment (no wrapper)
  <div className="sticky top-14 ...">              ← Filter bar
    {/* Filters */}
  </div>
  
  <div className="py-4 space-y-4">                ← Content container
    <CreatePost />
    {posts.map(...)}                               ← Posts list
  </div>
</>
```

## 🔍 Debugging Steps

### Step 1: Hard Refresh (CRITICAL!)

**Most scroll issues are caused by cached CSS/JS!**

**Mac:**
```
Cmd + Shift + R
```

**Windows:**
```
Ctrl + Shift + R
```

**Or in Chrome/Edge:**
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

---

### Step 2: Test Basic HTML Scroll

Open this file in your browser:
```
/tmp/scroll-test.html
```

**If this scrolls:**
✅ Your browser scrolling works → React/CSS issue

**If this doesn't scroll:**
❌ Browser or system issue → Check:
- Browser zoom level (should be 100%)
- System scroll settings
- Try different browser

---

### Step 3: Browser Console Check

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Look for:
   - ❌ JavaScript errors (red text)
   - ⚠️ Warnings about CSS
   - 🔴 Network errors (failed to load resources)

**Common errors that break scroll:**
- `TypeError: Cannot read property...`
- `CSS is not defined`
- `Failed to load resource: net::ERR_...`

---

### Step 4: Inspect Element Styles

1. Right-click on the feed page
2. Select "Inspect" or "Inspect Element"
3. Find the main container `<div class="min-h-screen bg-gray-50">`
4. In the Styles panel (right side), check for:
   - ❌ `overflow: hidden` (BAD - blocks scroll)
   - ❌ `max-height: 100vh` (BAD - constrains height)
   - ❌ `height: 100vh` (BAD - fixed height)
   - ✅ `overflow-y: auto` (GOOD - allows scroll)
   - ✅ `min-height: 100vh` (GOOD - grows with content)

**Screenshot what you see!**

---

### Step 5: Check Scroll Behavior

Try ALL these methods:

1. **Mouse wheel:**
   - Scroll up/down
   - Does page move?

2. **Trackpad:**
   - Two-finger swipe up/down
   - Does page move?

3. **Scrollbar (if visible):**
   - Click and drag
   - Does page move?

4. **Keyboard:**
   - Press Page Down / Space
   - Press Arrow Down
   - Does page move?

5. **Touch (on mobile):**
   - Swipe up
   - Does page move?

---

### Step 6: Check Post Count

Look at the feed page:

**How many posts do you see?**
- Just 1 post? → Content might be loading but hidden
- Multiple posts? → They're there but container not scrolling

**Is there a "Load More" spinner at the bottom?**
- Yes → Infinite scroll is working
- No → Check if API is returning posts

---

## 🐛 Common Issues & Fixes

### Issue 1: "I see posts but can't scroll"

**Fix A: Body overflow locked**
```css
/* Add to globals.css if missing */
body {
  overflow-y: auto !important;
}
```

**Fix B: Parent container has fixed height**
```tsx
// Check if any parent div has className with:
className="h-screen"  // BAD - use min-h-screen instead
className="max-h-screen"  // BAD - remove this
```

**Fix C: Touch scrolling disabled (iOS)**
```css
/* Add to globals.css */
* {
  -webkit-overflow-scrolling: touch;
}
```

---

### Issue 2: "Page scrolls but posts don't load"

**This is an API issue, not a scroll issue!**

Check console for:
```
Failed to fetch posts
Network error
401 Unauthorized
```

**Fix:** Restart API server
```bash
cd api
npm run dev
```

---

### Issue 3: "Only see one post"

**Check if more posts exist:**
```bash
# In terminal
psql YOUR_DATABASE_URL
SELECT COUNT(*) FROM "Post";
```

**If count > 1:** Posts exist, not loading properly
**If count = 1:** Create more posts to test scroll

---

###  Issue 4: "Scroll works on desktop but not mobile"

**Mobile-specific fixes:**

1. **Viewport meta tag** (should already be in layout.tsx):
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

2. **iOS safe area** (should already be set):
```css
padding-bottom: env(safe-area-inset-bottom);
```

3. **PWA vs Browser:**
   - Try in Safari browser first
   - Then try installed PWA
   - Behavior might differ

---

## 📊 Please Provide This Info

To help you further, I need:

### 1. Environment Details
- [ ] Browser: _____________ (Chrome/Safari/Firefox/Edge)
- [ ] Device: ______________ (Desktop Mac/Windows/iPhone/Android)
- [ ] PWA or Browser: ______
- [ ] Browser zoom: ________ (should be 100%)

### 2. Behavior
- [ ] Can see multiple posts: Yes / No
- [ ] Scrollbar visible: Yes / No
- [ ] Mouse wheel works: Yes / No
- [ ] Trackpad swipe works: Yes / No
- [ ] Keyboard scroll works: Yes / No

### 3. Testing Results
- [ ] `/tmp/scroll-test.html` scrolls: Yes / No
- [ ] Hard refresh completed: Yes / No
- [ ] Console has errors: Yes / No

### 4. Screenshots
Please send:
- [ ] Full page screenshot
- [ ] DevTools Console tab (F12)
- [ ] DevTools Elements tab showing the `min-h-screen` div styles

---

## 🔧 Emergency Fix: Force Scrolling

If nothing else works, try this **temporary fix**:

### Option A: Add to FeedPage

```tsx
// src/components/feed/FeedPage.tsx
return (
  <div style={{ 
    overflowY: 'auto', 
    height: 'calc(100vh - 120px)',
    WebkitOverflowScrolling: 'touch' 
  }}>
    {/* existing content */}
  </div>
);
```

### Option B: Add global CSS override

```css
/* src/app/globals.css - at the end */
[class*="min-h-screen"] {
  overflow-y: auto !important;
  height: auto !important;
}
```

---

## 📞 Next Steps

1. **Do the hard refresh** (Cmd+Shift+R)
2. **Test /tmp/scroll-test.html**
3. **Check browser console for errors**
4. **Send me the info from the checklist above**

With that info, I can give you a targeted fix! 🎯
