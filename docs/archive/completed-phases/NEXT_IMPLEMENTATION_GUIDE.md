# 🚀 Next Implementation Guide

**Last Updated:** February 5, 2026

This guide provides step-by-step instructions for implementing the next features in Stunity Enterprise.

---

## Priority Features

| Priority | Feature | Estimated Time | Complexity |
|----------|---------|----------------|------------|
| 🔴 HIGH | Groups & Communities | 3-4 sessions | Medium |
| 🟠 MEDIUM | Events & Calendar | 2-3 sessions | Medium |
| 🟡 LOW | Stories/Status | 2 sessions | Low |
| 🔴 HIGH | Mobile App | 5-7 sessions | High |

---

## 1. Groups & Communities

### Step 1: Database Schema

Add to `packages/database/prisma/schema.prisma`:

```prisma
model Group {
  id          String       @id @default(cuid())
  name        String
  slug        String       @unique
  description String?
  coverUrl    String?
  coverKey    String?
  privacy     GroupPrivacy @default(PUBLIC)
  createdById String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  createdBy   User         @relation(fields: [createdById], references: [id])
  members     GroupMember[]
  posts       Post[]

  @@index([privacy])
  @@index([createdById])
  @@map("groups")
}

model GroupMember {
  id        String      @id @default(cuid())
  groupId   String
  userId    String
  role      GroupRole   @default(MEMBER)
  joinedAt  DateTime    @default(now())
  isMuted   Boolean     @default(false)
  
  group     Group       @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@index([userId])
  @@map("group_members")
}

enum GroupPrivacy {
  PUBLIC    // Anyone can see and join
  PRIVATE   // Visible, but requires approval
  SECRET    // Invite only, hidden from search
}

enum GroupRole {
  OWNER
  ADMIN
  MODERATOR
  MEMBER
}
```

Add `groupId` to Post model:
```prisma
model Post {
  // ... existing fields
  groupId    String?
  group      Group?    @relation(fields: [groupId], references: [id], onDelete: SetNull)
}
```

Run migration:
```bash
cd packages/database
npx prisma migrate dev --name add_groups
npx prisma generate
```

### Step 2: Backend API

Create `services/feed-service/src/groups.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
let prisma: PrismaClient;

export function initGroupRoutes(prismaClient: PrismaClient) {
  prisma = prismaClient;
  return router;
}

// Create group
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, description, privacy = 'PUBLIC' } = req.body;
  const userId = req.user?.id;
  
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  const group = await prisma.group.create({
    data: {
      name,
      slug,
      description,
      privacy,
      createdById: userId,
      members: {
        create: { userId, role: 'OWNER' }
      }
    }
  });
  
  res.status(201).json({ success: true, group });
});

// List groups
router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, search } = req.query;
  
  const groups = await prisma.group.findMany({
    where: {
      privacy: { in: ['PUBLIC', 'PRIVATE'] },
      ...(search ? { name: { contains: String(search), mode: 'insensitive' } } : {})
    },
    include: {
      _count: { select: { members: true } },
      createdBy: { select: { firstName: true, lastName: true } }
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit)
  });
  
  res.json({ success: true, groups });
});

// Get group details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: {
      _count: { select: { members: true, posts: true } },
      members: {
        take: 10,
        include: { user: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } } }
      }
    }
  });
  
  res.json({ success: true, group });
});

// Join group
router.post('/:id/join', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const groupId = req.params.id;
  
  const member = await prisma.groupMember.create({
    data: { groupId, userId }
  });
  
  res.json({ success: true, member });
});

// Leave group
router.delete('/:id/leave', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId: req.params.id, userId } }
  });
  
  res.json({ success: true });
});

export default router;
```

Add to `services/feed-service/src/index.ts`:
```typescript
import groupRouter, { initGroupRoutes } from './groups';
// ...
app.use('/groups', authenticateToken, initGroupRoutes(prisma));
```

### Step 3: Frontend Pages

Create `/apps/web/src/app/[locale]/feed/groups/page.tsx`:
- Discover groups page
- Group cards with cover, name, member count
- Join/Leave buttons
- Search functionality

Create `/apps/web/src/app/[locale]/feed/groups/[id]/page.tsx`:
- Group header with cover
- Member list preview
- Group posts feed
- Admin controls (if owner/admin)

Create `/apps/web/src/components/feed/CreateGroupModal.tsx`:
- Group name input
- Description textarea
- Privacy selector
- Cover image upload

---

## 2. Events & Calendar

### Step 1: Database Schema

```prisma
model Event {
  id          String       @id @default(cuid())
  title       String
  description String?
  coverUrl    String?
  coverKey    String?
  startDate   DateTime
  endDate     DateTime?
  location    String?
  isVirtual   Boolean      @default(false)
  virtualUrl  String?
  hostId      String
  groupId     String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  host        User         @relation(fields: [hostId], references: [id])
  group       Group?       @relation(fields: [groupId], references: [id])
  attendees   EventAttendee[]

  @@index([startDate])
  @@index([hostId])
  @@map("events")
}

model EventAttendee {
  id       String         @id @default(cuid())
  eventId  String
  userId   String
  status   AttendeeStatus @default(INTERESTED)
  
  event    Event          @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@map("event_attendees")
}

enum AttendeeStatus {
  GOING
  INTERESTED
  NOT_GOING
}
```

### Step 2: Backend API

Create `services/feed-service/src/events.ts` with:
- `POST /events` - Create event
- `GET /events` - List upcoming events
- `GET /events/:id` - Get event details
- `POST /events/:id/rsvp` - RSVP to event
- `GET /events/:id/attendees` - Get attendees

### Step 3: Frontend Pages

- `/feed/events` - Calendar view with event list
- `/feed/events/[id]` - Event detail page
- Create event modal component

---

## 3. Stories/Status

### Step 1: Database Schema

```prisma
model Story {
  id        String      @id @default(cuid())
  userId    String
  mediaUrl  String
  mediaKey  String?
  mediaType String      // image/video
  caption   String?
  expiresAt DateTime    // createdAt + 24 hours
  createdAt DateTime    @default(now())
  
  user      User        @relation(fields: [userId], references: [id])
  views     StoryView[]

  @@index([userId])
  @@index([expiresAt])
  @@map("stories")
}

model StoryView {
  id        String   @id @default(cuid())
  storyId   String
  viewerId  String
  viewedAt  DateTime @default(now())
  
  story     Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  viewer    User     @relation(fields: [viewerId], references: [id])

  @@unique([storyId, viewerId])
  @@map("story_views")
}
```

### Step 2: Backend API

- `POST /stories` - Create story (set expiresAt to now + 24h)
- `GET /stories` - Get active stories (where expiresAt > now)
- `GET /stories/:userId` - Get user's stories
- `POST /stories/:id/view` - Record view
- Cron job to delete expired stories

### Step 3: Frontend Components

- Story circles at top of feed
- Full-screen story viewer with progress bar
- Swipe navigation between stories
- Create story modal with camera

---

## 4. Mobile App (React Native)

### Step 1: Project Setup

```bash
npx create-expo-app StunityMobile --template blank-typescript
cd StunityMobile

# Install dependencies
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
npm install axios @tanstack/react-query zustand
npm install react-native-mmkv # Fast storage
npm install expo-image-picker expo-camera
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### Step 2: Navigation Structure

```typescript
// src/navigation/AppNavigator.tsx
const Stack = createNativeStackNavigator();

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

// Bottom tabs: Feed, Search, Create, Messages, Profile
```

### Step 3: API Client

```typescript
// src/lib/api.ts
import axios from 'axios';
import { storage } from './storage';

const api = axios.create({
  baseURL: 'https://api.stunity.com', // Production URL
});

api.interceptors.request.use((config) => {
  const token = storage.getString('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Step 4: Key Screens

1. **LoginScreen** - Email/password, social login
2. **FeedScreen** - Post list with pull-to-refresh
3. **CreatePostScreen** - Camera, gallery, text input
4. **ProfileScreen** - User profile with sections
5. **MessagesScreen** - Chat list
6. **ChatScreen** - Message conversation

---

## Quick Start Commands

```bash
# Start development
./start-all-services.sh
cd apps/web && npm run dev

# Database changes
cd packages/database
npx prisma migrate dev --name <migration_name>
npx prisma generate
npx prisma studio

# Build production
npm run build --workspace=apps/web

# Deploy
npm run deploy
```

---

## Development Tips

1. **Always check existing code** - Many features may already be partially implemented
2. **Use the task agent** - For complex multi-file changes
3. **Test incrementally** - Build after each change
4. **Keep commits atomic** - One feature per commit
5. **Update documentation** - Keep docs current with changes

---

## Support Files

- `docs/SOCIAL_FEATURES_COMPLETE.md` - Full social features documentation
- `docs/PROJECT_STATUS.md` - Overall project status
- `docs/FEED_SYSTEM.md` - Feed system details
- `docs/REALTIME_ARCHITECTURE.md` - SSE implementation
