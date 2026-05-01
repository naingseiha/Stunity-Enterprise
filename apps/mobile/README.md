# Stunity Mobile App

Enterprise-grade React Native mobile application for the Stunity e-learning social platform.

## 📱 Features

- **Social Feed** - Posts, Stories, Likes, Comments, Shares
- **Learn Hub** - Courses, Lessons, Learning Paths, Progress Tracking
- **Messaging** - Real-time DMs, Group Chats, File Sharing
- **Profile** - Education, Experience, Skills, Followers/Following
- **Notifications** - Push notifications, In-app notifications
- **Offline Mode** - Cached content, Offline-first architecture

## 🆕 Recent Updates (March 10, 2026)

- **Startup + Feed reliability improved**
  - Faster login-to-feed transition with feed prewarm after auth
  - First-page feed fetch hardened for free-tier cold starts
  - Fallback behavior added to avoid intermittent blank feed states
- **Splash experience polished**
  - Native splash now uses `Stunity.png` at larger size
  - JS splash transition uses only the Stunity wordmark with a short smooth animation
  - White flash between native splash and first screen removed
- **Android SDK bootstrap stabilized**
  - Added `scripts/ensure-android-sdk.sh` and `scripts/run-android.sh`
  - `npm run android` now auto-restores `android/local.properties` after `expo prebuild --clean`

## 🏗️ Architecture

```
apps/mobile/
├── src/
│   ├── api/                 # API client with interceptors
│   │   └── client.ts        # Axios instance, auth, retry logic
│   │
│   ├── assets/              # Static assets
│   │   ├── fonts/           # Custom fonts
│   │   ├── images/          # App icons, splash screen
│   │   ├── icons/           # Custom SVG icons
│   │   └── animations/      # Lottie animations
│   │
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Button, Input, Avatar, Card, Loading
│   │   ├── feed/            # PostCard, StoryCircle, Comments
│   │   ├── learn/           # CourseCard, LessonItem, Progress
│   │   ├── profile/         # ProfileHeader, StatsCard
│   │   ├── messages/        # MessageBubble, ConversationItem
│   │   ├── notifications/   # NotificationItem, Badge
│   │   └── auth/            # LoginForm, RegisterForm
│   │
│   ├── config/              # App configuration
│   │   ├── env.ts           # Environment variables (dev/staging/prod)
│   │   └── theme.ts         # Colors, Typography, Spacing, Shadows
│   │
│   ├── constants/           # Static values
│   │   └── index.ts         # Screen names, endpoints, patterns
│   │
│   ├── contexts/            # React Context providers
│   │   └── ThemeContext.tsx # Dark/Light mode
│   │
│   ├── hooks/               # Custom React hooks
│   │   └── index.ts         # useDebounce, useKeyboard, useNetwork
│   │
│   ├── navigation/          # React Navigation setup
│   │   ├── types.ts         # Type definitions
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   │
│   ├── screens/             # Screen components
│   │   ├── auth/            # Welcome, Login, Register
│   │   ├── feed/            # Feed, PostDetail, CreatePost
│   │   ├── learn/           # Learn, CourseDetail, LessonViewer
│   │   ├── profile/         # Profile, EditProfile, Connections
│   │   ├── messages/        # Conversations, Chat
│   │   ├── notifications/   # NotificationsList
│   │   ├── settings/        # Settings, Privacy, Appearance
│   │   └── onboarding/      # Onboarding slides
│   │
│   ├── services/            # Business logic services
│   │   └── token.ts         # Secure token management
│   │
│   ├── stores/              # Zustand state management
│   │   ├── authStore.ts     # Authentication state
│   │   └── feedStore.ts     # Feed, posts, stories state
│   │
│   ├── styles/              # Shared styles
│   │   └── global.ts        # Common style patterns
│   │
│   ├── types/               # TypeScript definitions
│   │   └── index.ts         # User, Post, Course, etc.
│   │
│   └── utils/               # Utility functions
│       └── index.ts         # formatDate, formatNumber, etc.
│
├── App.tsx                  # Entry point
├── app.json                 # Expo configuration
├── babel.config.js          # Babel configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript configuration
```

## 🚀 Getting Started

For App Store and Play Store production builds, see [PRODUCTION_RELEASE_GUIDE.md](./PRODUCTION_RELEASE_GUIDE.md).

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Navigate to mobile app
cd apps/mobile

# Install dependencies
npm install

# Start development server
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
# (auto-configures Android SDK + local.properties)
npm run android
```

### Environment Configuration

Create `.env.local` file (see `.env.local.example`):

```env
# API Host - Update with your Mac's IP address
EXPO_PUBLIC_API_HOST=192.168.1.100  # Change to your IP

# Supabase Realtime (required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

`EXPO_PUBLIC_*` variables must be defined in `apps/mobile/.env.local` (or `apps/mobile/.env`). Values in the repository root `.env` are not automatically injected into the mobile app bundle.

**Important for iOS Simulator:**
- iOS Simulator can't use `localhost` - you must use your Mac's IP address
- Find your IP: `ipconfig getifaddr en0`
- Quick update: `./scripts/update-mobile-ip.sh`
- After changing IP, **restart Expo dev server**

**Troubleshooting Connection Issues:**  
See [NETWORK_TROUBLESHOOTING.md](./NETWORK_TROUBLESHOOTING.md) if you get timeout errors.

**Troubleshooting Setup Errors:**

- Error: `supabaseUrl is required`  
  Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to `apps/mobile/.env.local`, then restart with `npx expo start --clear`.

- Error: `pod install ... SDK "iphoneos" cannot be located`  
  Complete Xcode install, then run:
  ```bash
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  sudo xcodebuild -runFirstLaunch
  sudo xcodebuild -license accept
  ```
  Then rerun:
  ```bash
  cd ios && pod install --repo-update && cd ..
  npx expo run:ios
  ```

## 🎨 Design System

### Colors

```typescript
// Primary (Amber/Orange)
primary: {
  500: '#F59E0B',  // Main brand color
  600: '#D97706',  // Hover/Active
}

// Semantic
success: '#22C55E'
warning: '#EAB308'
error: '#EF4444'
info: '#3B82F6'
```

### Typography

```typescript
fontSize: {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
}
```

### Spacing (8-point grid)

```typescript
spacing: {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
}
```

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| expo | Framework and toolchain |
| @react-navigation | Navigation |
| zustand | State management |
| axios | HTTP client |
| expo-secure-store | Secure token storage |
| expo-notifications | Push notifications |
| expo-image | Optimized images |
| expo-camera | Camera access |
| react-native-reanimated | Animations |
| lottie-react-native | Lottie animations |

## 🔐 Security Features

- **Secure Token Storage** - Using Expo SecureStore (Keychain/Keystore)
- **Biometric Auth** - Face ID / Touch ID / Fingerprint
- **Token Auto-Refresh** - Automatic access token renewal
- **Request Signing** - X-Request-ID for tracing
- **Certificate Pinning** - (Production only)

## 📲 Building for Production

### iOS

```bash
# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Android

```bash
# Build for Play Store
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests (Detox)
npm run test:e2e
```

## 📁 File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `Button.tsx`, `PostCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Stores: `camelCase.ts` with `Store` suffix (e.g., `authStore.ts`)
- Utils: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `PascalCase` for interfaces (e.g., `User`, `Post`)

## 🔄 State Management

Using Zustand for lightweight, performant state management:

```typescript
// Usage in components
const { user, login, logout } = useAuthStore();
const { posts, fetchPosts, likePost } = useFeedStore();
```

## 🌐 API Integration

```typescript
// Automatic token refresh
// Retry with exponential backoff
// Request/Response interceptors
// Consistent error handling

import { feedApi } from '@/api/client';

const response = await feedApi.get('/posts');
```

## 📱 Supported Platforms

- iOS 13.0+
- Android API 21+ (Android 5.0+)

## 📄 License

Proprietary - Stunity Enterprise
