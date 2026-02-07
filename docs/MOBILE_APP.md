# 📱 Stunity Mobile App Documentation

**Platform:** React Native (Expo SDK 54)  
**Status:** Working on Expo Go ✅  
**Last Updated:** February 7, 2026  
**Version:** 16.4

---

## Quick Start

### Prerequisites
- Node.js 18+
- Expo Go app on your iOS/Android device
- Backend services running (Auth: 3001, Feed: 3010)

### Start the App
```bash
# Navigate to mobile app
cd apps/mobile

# Install dependencies (if not already done)
npm install --legacy-peer-deps

# Start with tunnel mode (recommended for real device)
npx expo start --tunnel

# Or start with LAN mode (faster, same network required)
npx expo start
```

### Test Credentials
- **Email:** john.doe@testhighschool.edu
- **Password:** SecurePass123!

---

## Recent Updates (February 7, 2026)

### v16.4 - Additional Screens
- **CreatePostScreen** - Full post creation with v1 design:
  - Post type selector (Article, Question, Announcement, Poll, Course, Project)
  - Photo library and camera integration
  - Image preview with remove option (up to 4 images)
  - Discard confirmation dialog
  - Bottom media action bar

- **CourseDetailScreen** - Complete course detail:
  - Hero section with thumbnail and gradient overlay
  - Course stats (rating, enrolled, duration, lessons)
  - Instructor info card with avatar
  - Expandable curriculum sections
  - Lesson list with lock/unlock status
  - Fixed bottom bar with pricing and enroll button

### v16.3 - Feed v1 Design Redesign
- **FeedScreen** - Redesigned with clean v1 style:
  - White header with subtle border (no gradients)
  - Minimal create post card
  - Clean FAB button (solid indigo)
  - Removed hero banner for cleaner look

- **PostCard** - v1 clean card design:
  - White cards with subtle shadow-card shadows
  - Post type badge inline in header (minimal colored style)
  - YouTube-style media thumbnails (16:9)
  - Title/description content layout
  - Engagement buttons with active states (red like, amber bookmark)

- **Types Updated**:
  - Added `PostType` enum with 16 post types
  - Added `User.name` optional field

### v16.2 - Mobile App Working
- Fixed Expo SDK 54 compatibility
- Fixed monorepo entry point (App.js at root)
- Fixed API response parsing (data.data structure)
- Login/authentication fully working
- Navigation between all screens working

---

## Project Structure

```
apps/mobile/
├── src/
│   ├── api/              # Axios client with interceptors
│   │   └── client.ts     # Auto-refresh, error handling
│   ├── assets/           # Images, fonts, animations
│   ├── components/       # Reusable UI components
│   │   ├── common/       # Button, Input, Avatar, Card, Loading
│   │   └── feed/         # PostCard, StoryCircles
│   ├── config/           # Environment, Colors, Typography
│   │   ├── env.ts        # API URLs by environment
│   │   └── theme.ts      # Design system tokens
│   ├── constants/        # API endpoints, regex patterns
│   ├── hooks/            # Custom React hooks
│   ├── navigation/       # React Navigation setup
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   └── types.ts      # TypeScript route definitions
│   ├── screens/          # Screen components
│   │   ├── auth/         # Welcome, Login, Register
│   │   ├── feed/         # Feed, PostDetail
│   │   ├── learn/        # LearnHub, CourseDetail
│   │   ├── messages/     # Conversations, Chat
│   │   └── profile/      # Profile, EditProfile
│   ├── services/         # Token storage service
│   ├── stores/           # Zustand state management
│   │   ├── authStore.ts  # Auth state, login/logout
│   │   └── feedStore.ts  # Posts, stories, likes
│   ├── types/            # TypeScript interfaces
│   └── utils/            # Helper functions
├── App.tsx               # Entry point
├── index.js              # Custom entry for monorepo
├── app.json              # Expo configuration
└── package.json          # Dependencies
```

---

## Design System (v1 Style)

### Design Philosophy
The mobile app follows the **v1 SchoolManagementApp** design style:
- **Clean white cards** with subtle shadows
- **Minimal color usage** - accent colors only for actions
- **Rounded corners** - 16px (rounded-2xl)
- **Simple typography** - clear hierarchy
- **Subtle borders** - #E5E7EB gray

### PostCard Design
```
┌─────────────────────────────────────────┐
│ [Avatar] Author Name    [Badge] [•••]  │  Header
├─────────────────────────────────────────┤
│                                         │
│  [16:9 Media Image]                     │  Media
│                                         │
├─────────────────────────────────────────┤
│ Title (bold)                            │  Content
│ Description text...                     │
├─────────────────────────────────────────┤
│  ❤️ 42   💬 12   🔗 5          🔖       │  Actions
└─────────────────────────────────────────┘
```

### Colors
```typescript
// Primary Actions
Indigo: '#6366F1'   // Buttons, links
Red: '#EF4444'      // Likes (active)
Amber: '#F59E0B'    // Bookmarks (active)

// Post Type Colors
Article: '#F59E0B'  // Amber
Question: '#3B82F6' // Blue  
Course: '#10B981'   // Green
Quiz: '#8B5CF6'     // Purple
Event: '#EC4899'    // Pink

// Neutrals
Background: '#F9FAFB'
Card: '#FFFFFF'
Border: '#E5E7EB'
Text: '#1F2937'
TextSecondary: '#6B7280'
```

### Shadows
```typescript
// shadow-card (v1 style)
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.05,
shadowRadius: 3,
elevation: 2,
```

---

## Components

### Feed Components

| Component | Description |
|-----------|-------------|
| `FeedScreen` | Main feed with stories, create post, and post list |
| `PostCard` | Clean card with author, media, content, and engagement |
| `StoryCircles` | Horizontal scrollable story avatars |
| `CreatePost` | Create post form (TODO) |

### PostCard Features
- **Header**: Avatar, author name, time ago, post type badge, more menu
- **Media**: 16:9 aspect ratio, counter for multiple images
- **Content**: Title (bold) + description
- **Tags**: #hashtag chips
- **Engagement**: Like, Comment, Share, Bookmark buttons with active states

### Post Types Supported
```typescript
type PostType = 
  | 'ARTICLE' | 'QUESTION' | 'ANNOUNCEMENT' | 'POLL'
  | 'ACHIEVEMENT' | 'PROJECT' | 'COURSE' | 'EVENT'
  | 'QUIZ' | 'EXAM' | 'ASSIGNMENT' | 'RESOURCE'
  | 'TUTORIAL' | 'RESEARCH' | 'REFLECTION' | 'COLLABORATION';
```

---

## Navigation

### Auth Flow
```
AuthNavigator
├── Welcome    - App intro with features
├── Login      - Email/password login
├── Register   - 3-step signup wizard
└── ForgotPass - Password recovery (TODO)
```

### Main App
```
MainNavigator (Bottom Tabs)
├── FeedStack
│   ├── Feed        - Posts list with stories
│   ├── PostDetail  - Single post view
│   ├── UserProfile - Other user's profile
│   └── CreatePost  - New post form (TODO)
├── LearnStack
│   ├── Learn       - Course categories
│   └── Course      - Course detail (TODO)
├── MessagesStack
│   ├── Conversations - Chat list
│   └── Chat          - Message thread
└── ProfileStack
    ├── Profile     - Current user profile
    └── Settings    - App settings
```

---

## State Management (Zustand)

### Auth Store
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  initialize: () => Promise<void>;  // Restore persisted auth
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

### Feed Store
```typescript
interface FeedState {
  posts: Post[];
  storyGroups: StoryGroup[];
  isLoadingPosts: boolean;
  
  fetchPosts: (refresh?: boolean) => Promise<void>;
  fetchStories: () => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
}
```

### Auth Persistence
- Uses Zustand persist middleware with AsyncStorage
- App.tsx calls `initialize()` on mount to restore session
- Tokens only cleared on 401 (expired), not on network errors

---

## API Integration

### Configuration (src/config/env.ts)
```typescript
const config = {
  development: {
    apiUrl: 'http://YOUR_IP:3001',  // Update with your IP
    feedUrl: 'http://YOUR_IP:3010',
  },
  production: {
    apiUrl: 'https://api.stunity.com',
    feedUrl: 'https://feed.stunity.com',
  },
};
```

### API Client Features
- Automatic token refresh on 401
- Request/response interceptors
- Error handling with retry logic
- Secure token storage (Expo SecureStore)

---

## Testing

### Run on Device
1. Start backend services (./start-all-services.sh)
2. Start Expo (`npx expo start --tunnel`)
3. Scan QR code with Expo Go
4. Login with test credentials

### Run on Simulator
```bash
# iOS (requires Xcode)
npx expo start --ios

# Android (requires Android Studio + emulator)
npx expo start --android
```

---

## Known Issues

### TypeScript Errors
React 19 type definitions are incompatible with React Native class components. The app runs correctly despite TS errors. These are type-only issues.

### Network Connectivity
- Use `--tunnel` mode for reliable device connection
- Or update `src/config/env.ts` with your computer's local IP
- Ensure phone and computer are on same network for LAN mode

### Worklets Version
Expo Go SDK 54 includes react-native-worklets native module v0.5.1. The JS package must match this version.

---

## Remaining Implementation

### Priority 1 (Next)
- [ ] CreatePost screen with media upload
- [ ] Course Detail screen
- [ ] Push notification setup (Expo Notifications)

### Priority 2
- [ ] Forgot Password flow
- [ ] Edit Profile screen
- [ ] Camera integration for posts/stories

### Priority 3
- [ ] Offline support (AsyncStorage caching)
- [ ] Deep linking
- [ ] App Store deployment

---

## Build & Deploy

### Development Build
```bash
# Create development build
npx expo run:ios
npx expo run:android
```

### Production Build
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for stores
eas build --platform ios
eas build --platform android
```

---

*For detailed project status, see PROJECT_STATUS.md*
