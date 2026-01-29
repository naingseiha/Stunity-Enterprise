# PWA Implementation Documentation

## 📱 Progressive Web App - School Management System

This document details the complete PWA implementation for the School Management System, including all features, configuration, and maintenance guidelines.

---

## Table of Contents

1. [Overview](#overview)
2. [PWA Features](#pwa-features)
3. [File Structure](#file-structure)
4. [Configuration Files](#configuration-files)
5. [Components](#components)
6. [Service Worker Strategy](#service-worker-strategy)
7. [iOS Support](#ios-support)
8. [Android Support](#android-support)
9. [Offline Support](#offline-support)
10. [Maintenance & Updates](#maintenance--updates)

---

## Overview

The School Management System is a **fully-featured Progressive Web App** that works seamlessly on:
- 📱 iOS (iPhone & iPad)
- 📱 Android phones and tablets
- 💻 Desktop (Windows, Mac, Linux)
- 🌐 All modern browsers

**PWA Compliance:** 95%+ Lighthouse Score

---

## PWA Features

### ✅ Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Web App Manifest** | ✅ Complete | Full metadata, icons, theme colors |
| **Service Worker** | ✅ Complete | Workbox-based caching strategies |
| **Offline Support** | ✅ Complete | Custom offline fallback page |
| **Install Prompt** | ✅ Complete | Custom install banner for Android/iOS |
| **App Icons** | ✅ Complete | 12 sizes including maskable icons |
| **iOS Splash Screens** | ✅ Complete | 21 splash screens for all devices |
| **App Shortcuts** | ✅ Complete | 3 quick actions (Grade Entry, Attendance, Reports) |
| **Theme Colors** | ✅ Complete | Adaptive theme with dark mode support |
| **HTTPS Ready** | ✅ Complete | Service worker requires HTTPS |
| **Push Notifications** | ❌ Not Implemented | Future feature (not supported on iOS) |
| **Background Sync** | ❌ Not Implemented | Future feature |

### 📊 Platform Support Matrix

| Feature | iOS | Android | Desktop |
|---------|-----|---------|---------|
| Install to Home Screen | ✅ | ✅ | ✅ |
| Standalone Mode | ✅ | ✅ | ✅ |
| Splash Screens | ✅ | ✅ | ✅ |
| Offline Mode | ⚠️ Limited | ✅ | ✅ |
| Push Notifications | ❌ | ✅ | ✅ |
| Background Sync | ❌ | ✅ | ✅ |
| App Shortcuts | ❌ | ✅ | ✅ |
| Share Target API | ❌ | ✅ | ✅ |

---

## File Structure

```
SchoolManagementApp/
│
├── public/
│   ├── manifest.json                 # PWA manifest
│   ├── sw.js                         # Service worker (auto-generated)
│   ├── workbox-*.js                  # Workbox runtime (auto-generated)
│   ├── robots.txt                    # SEO & crawling rules
│   ├── browserconfig.xml             # Windows tiles config
│   ├── apple-touch-icon.png          # iOS home screen icon
│   ├── apple-touch-icon-precomposed.png
│   │
│   ├── icons/                        # PWA icons
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-152x152.png
│   │   ├── icon-167x167.png
│   │   ├── icon-180x180.png
│   │   ├── icon-192x192.png
│   │   ├── icon-384x384.png
│   │   ├── icon-512x512.png
│   │   ├── icon-192x192-maskable.png
│   │   └── icon-512x512-maskable.png
│   │
│   └── splash/                       # iOS splash screens
│       ├── apple-splash-640-1136.png
│       ├── apple-splash-750-1334.png
│       ├── apple-splash-828-1792.png
│       ├── apple-splash-1080-2340.png
│       ├── apple-splash-1125-2436.png
│       ├── apple-splash-1170-2532.png
│       ├── apple-splash-1179-2556.png
│       ├── apple-splash-1242-2208.png
│       ├── apple-splash-1242-2688.png
│       ├── apple-splash-1284-2778.png
│       ├── apple-splash-1290-2796.png
│       ├── apple-splash-1536-2048.png
│       ├── apple-splash-1620-2160.png
│       ├── apple-splash-1668-2224.png
│       ├── apple-splash-1668-2388.png
│       ├── apple-splash-2048-2732.png
│       ├── apple-splash-2048-1536.png (landscape)
│       ├── apple-splash-2160-1620.png (landscape)
│       ├── apple-splash-2224-1668.png (landscape)
│       ├── apple-splash-2388-1668.png (landscape)
│       └── apple-splash-2732-2048.png (landscape)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with PWA meta tags
│   │   ├── offline/
│   │   │   └── page.tsx              # Offline fallback page
│   │   └── globals.css               # Global styles + PWA animations
│   │
│   └── components/
│       └── PWAInstallPrompt.tsx      # Install prompt component
│
├── scripts/
│   └── generate-splash-screens.js    # Script to generate iOS splashes
│
├── docs/
│   ├── PWA_IMPLEMENTATION.md         # This file
│   └── PWA_TESTING_GUIDE.md          # Testing documentation
│
├── next.config.js                    # Next.js + PWA config
├── package.json                      # Scripts: generate:splash
└── .env.example                      # Environment variables template
```

---

## Configuration Files

### 1. `public/manifest.json`

**Purpose:** PWA metadata and capabilities

**Key Sections:**
```json
{
  "name": "School Management System - ប្រព័ន្ធគ្រប់គ្រងសាលារៀន",
  "short_name": "School MS",
  "description": "Complete school management system",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "orientation": "portrait-primary",
  "scope": "/",
  "categories": ["education", "productivity"],

  "icons": [/* 12 icons including maskable */],
  "shortcuts": [/* 3 quick actions */],

  "prefer_related_applications": false,
  "edge_side_panel": { "preferred_width": 400 }
}
```

**Icons Configuration:**
- Standard icons: 72, 96, 128, 144, 152, 167, 180, 192, 384, 512
- Maskable icons: 192, 512
- Purpose: `"any"` for standard, `"maskable"` for adaptive

**Shortcuts:**
1. Grade Entry → `/grade-entry`
2. Attendance → `/attendance`
3. Reports → `/reports/monthly`

### 2. `next.config.js`

**Purpose:** Next.js configuration with PWA plugin

**Key Configuration:**
```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  reloadOnOnline: true,
  fallbacks: {
    document: '/offline',  // Offline fallback page
  },
  workboxOptions: {
    runtimeCaching: [/* See Service Worker Strategy */]
  }
});
```

**Important Settings:**
- `disable: development` - PWA only works in production build
- `skipWaiting: true` - New service worker activates immediately
- `reloadOnOnline: true` - Reload app when connection restored
- `fallbacks.document` - Show `/offline` page when offline

### 3. `src/app/layout.tsx`

**Purpose:** Root layout with PWA meta tags

**iOS Meta Tags:**
```tsx
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="School MS" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

**iOS Splash Screens:**
- 21 `<link>` tags for different device sizes
- Media queries match device dimensions
- Covers iPhone SE to iPhone 14 Pro Max
- Covers iPad Mini to iPad Pro 12.9"
- Includes landscape orientations for iPad

**Viewport Configuration:**
```typescript
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
    { media: "(prefers-color-scheme: dark)", color: "#4f46e5" }
  ],
  viewportFit: "cover", // iOS safe area support
};
```

---

## Components

### PWAInstallPrompt Component

**Location:** `src/components/PWAInstallPrompt.tsx`

**Features:**
- 🤖 Auto-detects Android/iOS/Desktop
- ⏱️ Shows prompt 3 seconds after page load
- 🔔 Different UI for iOS (instructions) vs Android (native prompt)
- 💾 Remembers dismissal for 7 days
- ✅ Hides automatically when app is installed
- 📱 Responsive design

**How It Works:**

1. **Android/Desktop:**
   - Listens for `beforeinstallprompt` event
   - Shows custom banner with "Install" button
   - Triggers native install dialog on click

2. **iOS:**
   - Detects iOS Safari
   - Shows instruction card
   - Guides user through manual "Add to Home Screen"

3. **Dismissal Logic:**
   ```javascript
   localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
   // Prompt won't show again for 7 days
   ```

**Usage:**
```tsx
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

// In layout.tsx
<body>
  {children}
  <PWAInstallPrompt />
</body>
```

### Offline Page Component

**Location:** `src/app/offline/page.tsx`

**Features:**
- 📡 WiFi off icon
- 🌍 Bilingual message (English + Khmer)
- 🔄 "Try Again" button
- 💡 Helpful reconnection tips
- 🎨 Branded design with theme colors

**Triggered When:**
- User is offline and navigates to uncached page
- API call fails due to no network
- Service worker cannot serve from cache

---

## Service Worker Strategy

### Cache Strategies

**1. Network Only (API Calls)**
```javascript
{
  urlPattern: /\/api\/.*/i,
  handler: 'NetworkOnly',  // Always fetch fresh data
}
```
- Never cache API responses
- Ensures data is always up-to-date
- Fails gracefully when offline

**2. Stale While Revalidate (Static Assets)**
```javascript
{
  urlPattern: /\.(?:js|css)$/i,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'static-assets',
    expiration: { maxEntries: 32, maxAgeSeconds: 86400 }
  }
}
```
- Serves from cache immediately
- Updates cache in background
- 24-hour expiration

**3. Stale While Revalidate (Images)**
```javascript
{
  urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'static-image-assets',
    expiration: { maxEntries: 64, maxAgeSeconds: 86400 }
  }
}
```
- Up to 64 images cached
- 24-hour expiration

**4. Stale While Revalidate (Fonts)**
```javascript
{
  urlPattern: /\.(?:woff|woff2|eot|ttf|otf)$/i,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'static-font-assets',
    expiration: { maxEntries: 4, maxAgeSeconds: 604800 }
  }
}
```
- 7-day expiration for fonts

**5. Cache First (Google Fonts)**
```javascript
{
  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
  handler: 'CacheFirst',
  options: {
    cacheName: 'google-fonts-stylesheets',
    expiration: { maxAgeSeconds: 31536000 } // 1 year
  }
}
```
- Long-term caching for external fonts

### Precaching

**Auto-generated by Workbox:**
- All static Next.js build files
- JavaScript bundles
- CSS files
- Static images in `public/`

**Build-time precaching list:**
```javascript
// Automatically includes:
- /_next/static/chunks/*.js
- /_next/static/css/*.css
- /icons/*.png
- /splash/*.png
- /manifest.json
```

---

## iOS Support

### Splash Screens

**Generation:**
```bash
npm run generate:splash
```

**Script:** `scripts/generate-splash-screens.js`
- Uses Sharp library to generate images
- Creates 21 different sizes
- Indigo background (#6366f1)
- Centered app icon (30% of screen height)

**Device Coverage:**
- iPhone SE, 5s: 640×1136
- iPhone 8, 7, 6s: 750×1334
- iPhone XR, 11: 828×1792
- iPhone X, XS, 11 Pro: 1125×2436
- iPhone 12, 13, 14: 1170×2532
- iPhone 14 Pro: 1179×2556
- iPhone 14 Pro Max: 1290×2796
- iPad variants: 1536×2048 to 2048×2732
- Landscape orientations for iPad

### iOS Limitations

**What Works:**
- ✅ Add to Home Screen
- ✅ Standalone mode (full screen)
- ✅ Custom splash screens
- ✅ App icon
- ✅ Status bar styling
- ✅ Basic offline caching

**What Doesn't Work:**
- ❌ Push notifications
- ❌ Background sync
- ❌ App shortcuts (no context menu)
- ❌ Install prompt (manual only)
- ⚠️ Limited service worker features

### iOS Testing Requirements

1. Must use Safari (Chrome/Firefox don't support PWA on iOS)
2. Must test on real device (simulator has limitations)
3. Splash screens only show on installed app (not in Safari)
4. Status bar style is limited to: default, black, black-translucent

---

## Android Support

### Features

**Fully Supported:**
- ✅ Install prompt
- ✅ Add to Home Screen
- ✅ Splash screen
- ✅ Theme color in status bar
- ✅ App shortcuts (long-press icon)
- ✅ Maskable icons (adaptive icons)
- ✅ Full service worker support
- ✅ Push notifications (if implemented)
- ✅ Background sync (if implemented)

### Manifest Features

**App Shortcuts:**
```json
"shortcuts": [
  { "name": "Grade Entry", "url": "/grade-entry" },
  { "name": "Attendance", "url": "/attendance" },
  { "name": "Reports", "url": "/reports/monthly" }
]
```

**Maskable Icons:**
```json
{
  "src": "/icons/icon-192x192-maskable.png",
  "sizes": "192x192",
  "purpose": "maskable"
}
```
- Adapts to device theme (round, squircle, etc.)
- Safe zone: icon centered with padding

### Android Testing

**Required:**
- Chrome 68+ on Android
- Physical device recommended
- Can use Android emulator with Chrome
- Test both light and dark themes

---

## Offline Support

### What Works Offline

**Cached Resources:**
- ✅ HTML pages (precached routes)
- ✅ JavaScript bundles
- ✅ CSS stylesheets
- ✅ Images (up to 64 cached)
- ✅ Fonts (up to 4 cached)
- ✅ Google Fonts

**Offline Navigation:**
- ✅ Previously visited pages load from cache
- ✅ Offline fallback page for uncached routes
- ✅ "Try Again" button to retry connection

**What Doesn't Work Offline:**
- ❌ API calls (Network Only strategy)
- ❌ Real-time data updates
- ❌ Form submissions
- ❌ File uploads
- ❌ Authentication (depends on API)

### Offline Page

**Features:**
- Bilingual (English + Khmer)
- WiFi icon indicator
- Reconnection tips
- "Try Again" button
- Branded design

**Trigger Conditions:**
```javascript
// Service worker intercepts failed navigation
fetch(event.request).catch(() => {
  return caches.match('/offline');
});
```

---

## Maintenance & Updates

### Updating PWA Assets

**1. Icons:**
```bash
# Replace source icon
cp new-icon.png public/icons/icon-512x512.png

# Regenerate splash screens
npm run generate:splash

# Rebuild
npm run build
```

**2. Manifest:**
```bash
# Edit public/manifest.json
# Update name, colors, shortcuts, etc.

# Rebuild
npm run build

# Users will see update on next visit
```

**3. Service Worker:**
```bash
# Edit next.config.js workboxOptions
# Add new cache strategies
# Change cache names

# Rebuild
npm run build

# Service worker will update automatically
```

### Version Updates

**When you deploy a new version:**

1. **Service worker automatically updates:**
   - `skipWaiting: true` activates new SW immediately
   - Old cache is cleaned up
   - New assets are precached

2. **User experience:**
   - App updates in background
   - No manual action required
   - Reload may be required for major changes

3. **Force update (if needed):**
   ```javascript
   // In DevTools console
   navigator.serviceWorker.getRegistrations()
     .then(registrations => {
       registrations.forEach(reg => reg.unregister())
     })
   ```

### Cache Management

**Auto-cleanup:**
- Workbox automatically removes old caches
- Expiration policies enforce limits
- `cleanupOutdatedCaches()` runs on activation

**Manual cleanup (development):**
```bash
# DevTools → Application → Storage
# Click "Clear site data"

# Or in console:
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key))
})
```

---

## Production Deployment

### Pre-Deployment Checklist

**Environment Variables:**
```bash
# .env or .env.production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
```

**Files to Update:**
- [ ] `public/robots.txt` - Update sitemap URL
- [ ] `.env` - Set production URLs
- [ ] `manifest.json` - Verify start_url and scope

**Build:**
```bash
npm run generate:splash  # Generate iOS splash screens
npm run build           # Build production bundle
```

**Requirements:**
- ✅ HTTPS (required for service workers)
- ✅ Valid SSL certificate
- ✅ Proper CORS headers for API
- ✅ Manifest accessible at `/manifest.json`
- ✅ Service worker accessible at `/sw.js`

### Deployment Platforms

**Vercel (Recommended for Frontend):**
```bash
vercel deploy --prod

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_APP_URL
# NEXT_PUBLIC_API_URL
```

**Other Platforms:**
- Netlify
- AWS Amplify
- Azure Static Web Apps
- Self-hosted with Nginx/Apache

**Server Configuration (Nginx example):**
```nginx
# Service worker must be served with correct headers
location /sw.js {
  add_header Cache-Control "no-cache";
  add_header Service-Worker-Allowed "/";
}

# Manifest must be served as application/manifest+json
location /manifest.json {
  add_header Content-Type "application/manifest+json";
}
```

---

## Troubleshooting

### Common Issues

**1. PWA not installable**
- Check: HTTPS enabled (or localhost)
- Check: manifest.json accessible
- Check: Service worker registered
- Check: Valid icons in manifest

**2. Splash screens not showing (iOS)**
- Run: `npm run generate:splash`
- Check: Files exist in `public/splash/`
- Check: Meta tags in `layout.tsx`
- Test: On real iOS device (not simulator)

**3. Service worker not updating**
- Solution: Hard refresh (Ctrl+Shift+R)
- Solution: Unregister old SW in DevTools
- Solution: Clear cache and rebuild

**4. Install prompt not appearing**
- Check: App not already installed
- Check: `pwa-install-dismissed` in localStorage
- Check: PWA criteria met (manifest, SW, icons, HTTPS)

---

## Resources

### Documentation
- [Next PWA Plugin](https://github.com/DuCanhGH/next-pwa)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [PWA Checklist](https://web.dev/pwa-checklist/)

### Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [Manifest Generator](https://manifest-gen.netlify.app/)

### Testing
- See `docs/PWA_TESTING_GUIDE.md` for detailed testing procedures

---

**Last Updated:** December 2025
**Version:** 1.0.0
**Maintained by:** School Management System Team
