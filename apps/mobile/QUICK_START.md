# 🚀 Stunity Mobile App - Quick Start Guide

**Ready to run in 3 minutes!**

---

## Prerequisites ✅

- ✅ Node.js 18+ installed
- ✅ Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- ✅ Backend services running

---

## Step 1: Start Backend Services (Terminal 1)

```bash
cd "$(git rev-parse --show-toplevel)"

# Start all 12 services
./quick-start.sh

# Wait 30 seconds, then verify services are running
./check-services.sh

# You should see:
# ✅ Auth Service (3001) - Running
# ✅ Feed Service (3010) - Running
# ✅ Student Service (3003) - Running
```

---

## Step 2: Start Mobile App (Terminal 2)

```bash
cd apps/mobile

# Install dependencies (first time only)
npm install

# Start mobile app with tunnel
npx expo start --tunnel

# You'll see:
# ✅ Metro Bundler running
# 📱 QR code displayed
```

---

## Step 3: Open on Your Phone

### iOS (Expo Go)
1. Open **Camera** app
2. Scan the QR code
3. Tap "Open in Expo Go"

### Android (Expo Go)
1. Open **Expo Go** app
2. Tap "Scan QR code"
3. Scan the QR code

---

## Step 4: Login

### Test Accounts

**Admin/Teacher:**
```
Email: john.doe@testhighschool.edu
Password: SecurePass123!
```

**Parent:**
```
Phone: 012345678
Password: TestParent123!
```

---

## 🎯 Features to Test

### ✅ Authentication
- Login with email/password
- Remember me checkbox
- Biometric authentication (if device supports)
- Logout

### ✅ Navigation
- Bottom tabs: Feed, Learn, Messages, Clubs, Profile
- Sidebar menu
- Back navigation

### ✅ Feed Screen (UI Only - API Coming Next)
- Stories carousel
- Post cards with images
- Like/Comment/Share buttons
- Pull to refresh

### ✅ Profile Screen (UI Only)
- User profile with stats
- Performance highlights
- Edit profile button
- About/Activity tabs

### ✅ Messages (UI Only)
- Conversations list
- Active Now section
- Unread badges

---

## 🐛 Troubleshooting

### Problem: Can't connect to backend
**Solution:**
1. Check backend services: `./check-services.sh`
2. Restart services: `./restart-all-services.sh`
3. Update IP in `apps/mobile/src/config/env.ts` with your local IP

### Problem: QR code not working
**Solution:**
1. Use tunnel mode: `npx expo start --tunnel`
2. Or use LAN mode: `npx expo start --lan`

### Problem: App crashes on startup
**Solution:**
1. Clear cache: `npx expo start --clear`
2. Reinstall dependencies: `rm -rf node_modules && npm install`

### Problem: "Network request failed"
**Solution:**
1. Check if backend is running on correct port
2. Check firewall settings
3. Try restarting both backend and mobile app

---

## 📱 Development Tips

### Hot Reload
- Shake device → Tap "Reload"
- Or press `r` in terminal

### Developer Menu
- Shake device → Opens menu
- Toggle Debug Mode, Fast Refresh, etc.

### Debugging
- Shake device → "Debug Remote JS"
- Open Chrome DevTools

### Logs
- Terminal shows Metro Bundler logs
- Shake device → "Open JS Debugger"

---

## 🔄 Next Implementation Steps

### Week 1: Feed Integration ⏳
```bash
# Make sure Feed Service is running
curl http://localhost:3010/health

# Features to integrate:
# - Fetch posts from /posts endpoint
# - Create new posts
# - Like/Comment actions
# - Stories with expiry
# - Image upload
```

### Week 2: Profile Integration ⏳
```bash
# Features to integrate:
# - Fetch user profile
# - Display real stats
# - Edit profile
# - Upload avatar/cover
# - Follow/Unfollow
```

### Week 3: Messages Integration ⏳
```bash
# Start Messaging Service
# Features to integrate:
# - List conversations
# - Send/receive messages
# - Real-time updates
# - Read receipts
```

---

## 📚 Useful Commands

```bash
# Start with tunnel (best for mobile testing)
npx expo start --tunnel

# Start with LAN (faster, requires same network)
npx expo start --lan

# Start with localhost (for iOS simulator)
npx expo start

# Clear cache
npx expo start --clear

# Run on iOS simulator (Mac only)
npm run ios

# Run on Android emulator
npm run android

# Check for updates
npx expo-doctor

# Build for production (later)
eas build --platform ios
eas build --platform android
```

---

## 🎨 Design System

### Colors
- **Primary Orange:** `#FFA500`, `#FF8C00`, `#FF6B35`
- **Success Green:** `#10B981`
- **Info Blue:** `#3B82F6`
- **Warning Yellow:** `#EAB308`
- **Error Red:** `#EF4444`

### Components
- **Avatar:** 6 sizes, gradient borders
- **Button:** Primary, Secondary, Outline variants
- **Input:** With labels, icons, validation
- **Card:** With shadows, rounded corners
- **PostCard:** Instagram-inspired design
- **StoryCircle:** Gradient borders for unviewed

---

## 📊 Current Status

| Feature | UI | API | Status |
|---------|----|----|--------|
| Authentication | ✅ | ✅ | Complete |
| Feed | ✅ | ⏳ | Ready for integration |
| Profile | ✅ | ⏳ | Ready for integration |
| Messages | ✅ | ⏳ | Ready for integration |
| Learn | ✅ | ⏳ | Ready for integration |
| Clubs | ✅ | ⏳ | Ready for integration |
| Notifications | ✅ | ⏳ | Ready for integration |

**Legend:**
- ✅ Complete
- ⏳ Ready/In Progress
- ❌ Not Started

---

## 🎉 You're All Set!

The mobile app is now running with:
- ✅ Beautiful Instagram-inspired UI
- ✅ Working authentication
- ✅ Smooth animations
- ✅ Professional design system

**Next:** Start integrating Feed, Profile, and Messages APIs!

---

**Need Help?**
- Check `IMPLEMENTATION_STATUS.md` for detailed status
- See `README.md` for architecture overview
- Review backend API docs at `http://localhost:3001/api/info`

**Happy Coding! 🚀**
