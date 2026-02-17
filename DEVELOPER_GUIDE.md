# 👨‍💻 Stunity Enterprise - Developer Guide

**Last Updated:** February 17, 2026  
**Version:** 21.10

> **Complete guide for developers working on Stunity Enterprise**

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [Project Structure](#-project-structure)
3. [Development Environment](#️-development-environment)
4. [Running the Project](#-running-the-project)
5. [Working with the Code](#-working-with-the-code)
6. [Testing](#-testing)
7. [Common Tasks](#-common-tasks)
8. [Troubleshooting](#-troubleshooting)
9. [Best Practices](#-best-practices)
10. [Resources](#-resources)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required versions
Node.js >= 20.0.0
npm >= 10.0.0
PostgreSQL >= 14.0
```

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd Stunity-Enterprise

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 4. Set up database
cd packages/database
npx prisma migrate dev
npx prisma generate
npm run seed

# 5. Start all services
cd ../..
./start-all-services.sh

# 6. Start mobile app (in new terminal)
cd apps/mobile
npm start
```

**Done!** Your development environment is ready.

---

## 📁 Project Structure

```
Stunity-Enterprise/
├── apps/
│   ├── mobile/              # React Native mobile app (Expo)
│   │   ├── src/
│   │   │   ├── screens/     # 55+ app screens
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── services/    # API client services
│   │   │   ├── stores/      # Zustand state management
│   │   │   ├── navigation/  # Navigation configuration
│   │   │   ├── utils/       # Utility functions
│   │   │   └── types/       # TypeScript types
│   │   ├── App.tsx          # Root component
│   │   └── package.json
│   │
│   └── web/                 # Next.js web app (optional)
│
├── services/                # Backend microservices
│   ├── auth-service/        # Port 3001
│   ├── feed-service/        # Port 3010
│   ├── club-service/        # Port 3012
│   ├── school-service/      # Port 3002
│   ├── student-service/     # Port 3003
│   ├── teacher-service/     # Port 3004
│   ├── class-service/       # Port 3005
│   ├── subject-service/     # Port 3006
│   ├── grade-service/       # Port 3007
│   ├── attendance-service/  # Port 3008
│   ├── timetable-service/   # Port 3009
│   ├── messaging-service/   # Port 3011
│   └── analytics-service/   # Port 3014
│
├── packages/
│   ├── database/            # Prisma schema & migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Database models
│   │   │   └── migrations/      # Migration history
│   │   └── seed.ts              # Test data seeding
│   │
│   ├── shared/              # Shared utilities
│   ├── types/               # Shared TypeScript types
│   └── config/              # Shared configuration
│
├── docs/                    # Documentation
│   ├── current/             # Active documentation
│   ├── archive/             # Historical docs
│   └── api/                 # API documentation
│
├── scripts/                 # Utility scripts
├── infrastructure/          # Infrastructure config
│
├── README.md                # Project overview
├── FEATURES_COMPLETE.md     # Complete feature inventory
├── NEXT_IMPLEMENTATION.md   # Implementation roadmap
├── DEVELOPER_GUIDE.md       # This file
├── CHANGELOG.md             # Version history
│
├── turbo.json               # Turborepo configuration
├── package.json             # Root package.json
└── tsconfig.json            # TypeScript config
```

---

## 🛠️ Development Environment

### Required Tools

1. **Node.js & npm**
   ```bash
   node --version  # Should be >= 20.0.0
   npm --version   # Should be >= 10.0.0
   ```

2. **PostgreSQL**
   ```bash
   psql --version  # Should be >= 14.0
   # Or use Neon serverless PostgreSQL (recommended)
   ```

3. **VS Code** (recommended)
   - Install extensions:
     - ESLint
     - Prettier
     - Prisma
     - React Native Tools
     - TypeScript

4. **Mobile Development**
   - **For iOS:** Xcode (Mac only)
   - **For Android:** Android Studio
   - **For Both:** Expo Go app on physical device

### Environment Variables

**Root `.env`:**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/stunity"
```

**Mobile `.env.local`:**
```env
# Auto-detected by Expo, manual config not needed
API_URL=http://192.168.1.100:3010
```

---

## ▶️ Running the Project

### Start All Backend Services

```bash
# Option 1: Start all services at once
./start-all-services.sh

# Option 2: Start services individually
cd services/auth-service && npm run dev
cd services/feed-service && npm run dev
# ... etc

# Check service health
./health-check.sh
```

### Start Mobile App

```bash
cd apps/mobile

# Start Expo dev server
npm start

# Or start with specific platform
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

**Scan QR code** with Expo Go app (iOS/Android) to run on device.

### Stop Services

```bash
./stop-all-services.sh
```

---

## 💻 Working with the Code

### Mobile Development

#### Adding a New Screen

```typescript
// 1. Create screen file
// apps/mobile/src/screens/example/NewScreen.tsx

import React from 'react';
import { View, Text } from 'react-native';

export default function NewScreen() {
  return (
    <View>
      <Text>New Screen</Text>
    </View>
  );
}

// 2. Export from index
// apps/mobile/src/screens/example/index.ts
export { default as NewScreen } from './NewScreen';

// 3. Add to navigation
// apps/mobile/src/navigation/AppNavigator.tsx
import { NewScreen } from '../screens/example';

<Stack.Screen name="NewScreen" component={NewScreen} />
```

#### Using API Services

```typescript
import { feedApi } from '../services/api';

// GET request
const posts = await feedApi.getPosts({ page: 1, limit: 20 });

// POST request
const newPost = await feedApi.createPost({
  type: 'ARTICLE',
  content: 'Hello World',
  visibility: 'PUBLIC'
});

// With error handling
try {
  const result = await feedApi.createPost(data);
} catch (error) {
  console.error('Failed to create post:', error);
}
```

#### State Management (Zustand)

```typescript
// apps/mobile/src/stores/feedStore.ts
import create from 'zustand';

interface FeedState {
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  posts: [],
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ 
    posts: [post, ...state.posts] 
  })),
}));

// Usage in component
import { useFeedStore } from '../stores/feedStore';

const posts = useFeedStore((state) => state.posts);
const addPost = useFeedStore((state) => state.addPost);
```

### Backend Development

#### Adding a New Endpoint

```typescript
// services/feed-service/src/index.ts

import express from 'express';
const app = express();

// GET endpoint
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST endpoint with validation
app.post('/api/posts', async (req, res) => {
  try {
    const { type, content, visibility } = req.body;
    
    // Validation
    if (!type || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }
    
    // Create post
    const post = await prisma.post.create({
      data: { type, content, visibility, userId: req.user.id }
    });
    
    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});
```

#### Working with Database (Prisma)

```typescript
// packages/database/prisma/schema.prisma

model Post {
  id          String   @id @default(cuid())
  type        PostType
  content     String
  visibility  Visibility @default(PUBLIC)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("posts")
}

// Generate Prisma client after schema changes
// cd packages/database && npx prisma generate

// Usage in code
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create
const post = await prisma.post.create({
  data: { type: 'ARTICLE', content: 'Hello', userId: 'user-id' }
});

// Read
const posts = await prisma.post.findMany({
  where: { userId: 'user-id' },
  include: { user: true }
});

// Update
await prisma.post.update({
  where: { id: 'post-id' },
  data: { content: 'Updated content' }
});

// Delete
await prisma.post.delete({ where: { id: 'post-id' } });
```

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
cd apps/mobile && npm test
cd services/feed-service && npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

### Writing Tests

```typescript
// __tests__/feedStore.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useFeedStore } from '../stores/feedStore';

describe('Feed Store', () => {
  it('should add post', () => {
    const { result } = renderHook(() => useFeedStore());
    
    act(() => {
      result.current.addPost({ id: '1', content: 'Test' });
    });
    
    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts[0].content).toBe('Test');
  });
});
```

---

## 🔧 Common Tasks

### Database Migrations

```bash
cd packages/database

# Create new migration
npx prisma migrate dev --name add_new_field

# Apply migrations
npx prisma migrate deploy

# Reset database (DANGER: deletes all data)
npx prisma migrate reset

# Seed database
npm run seed
```

### Adding a New Service

```bash
# 1. Create service directory
mkdir services/new-service
cd services/new-service

# 2. Initialize package
npm init -y

# 3. Install dependencies
npm install express @prisma/client cors
npm install -D typescript @types/node @types/express

# 4. Create src/index.ts
# 5. Add to start-all-services.sh
# 6. Update turbo.json
```

### Updating Dependencies

```bash
# Check outdated packages
npm outdated

# Update all packages
npm update

# Update specific package
npm install package-name@latest

# Update Expo SDK (mobile)
cd apps/mobile
npx expo upgrade
```

### Building for Production

```bash
# Build all packages
npm run build

# Build mobile app
cd apps/mobile
eas build --platform ios
eas build --platform android

# Build specific service
cd services/feed-service
npm run build
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Services Won't Start

```bash
# Check if ports are in use
lsof -i :3001
lsof -i :3010

# Kill processes on port
kill -9 $(lsof -t -i:3001)

# Or use script
./kill-port.sh 3001
```

#### 2. Database Connection Errors

```bash
# Check if PostgreSQL is running
pg_isready

# Reset database connection
cd packages/database
npx prisma migrate reset
npm run seed
```

#### 3. Prisma Client Issues

```bash
# Regenerate Prisma client
cd packages/database
npx prisma generate

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

#### 4. Mobile App Not Loading

```bash
# Clear Expo cache
cd apps/mobile
npx expo start -c

# Clear React Native cache
npm start -- --reset-cache

# Reinstall dependencies
rm -rf node_modules
npm install
```

#### 5. Type Errors

```bash
# Rebuild TypeScript
npm run type-check

# Clean build
npm run clean
npm install
npm run build
```

---

## ✅ Best Practices

### Code Style

```typescript
// ✅ Good: Descriptive names
const fetchUserPosts = async (userId: string) => { ... };

// ❌ Bad: Unclear names
const getData = async (id: string) => { ... };

// ✅ Good: Type everything
interface Post {
  id: string;
  content: string;
  createdAt: Date;
}

// ❌ Bad: Using any
const post: any = { ... };

// ✅ Good: Error handling
try {
  const result = await api.call();
} catch (error) {
  console.error('Failed:', error);
  showError('Something went wrong');
}

// ❌ Bad: Silent failures
const result = await api.call().catch(() => null);
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push to remote
git push origin feature/new-feature

# 4. Create Pull Request
# 5. After review, merge to main
```

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add dark mode support
fix: resolve quiz timer issue
docs: update API documentation
style: format code with prettier
refactor: simplify feed logic
test: add unit tests for auth
chore: update dependencies
```

### Code Organization

```typescript
// ✅ Good: Organized imports
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFeedStore } from '../stores/feedStore';
import { feedApi } from '../services/api';
import { Button } from '../components';

// ✅ Good: Component structure
export default function FeedScreen() {
  // 1. State
  const [loading, setLoading] = useState(false);
  
  // 2. Store
  const posts = useFeedStore((state) => state.posts);
  
  // 3. Effects
  useEffect(() => {
    fetchPosts();
  }, []);
  
  // 4. Handlers
  const fetchPosts = async () => { ... };
  
  // 5. Render
  return <View>...</View>;
}

// 6. Styles
const styles = StyleSheet.create({ ... });
```

---

## 📚 Resources

### Documentation
- [FEATURES_COMPLETE.md](./FEATURES_COMPLETE.md) - All implemented features
- [NEXT_IMPLEMENTATION.md](./NEXT_IMPLEMENTATION.md) - Roadmap
- [README.md](./README.md) - Quick start guide
- [CHANGELOG.md](./CHANGELOG.md) - Version history

### API Documentation
- Auth Service: `http://localhost:3001/api-docs`
- Feed Service: `http://localhost:3010/api-docs`
- Club Service: `http://localhost:3012/api-docs`

### External Resources
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Express Docs](https://expressjs.com/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

### Tools
- **Database GUI:** `npx prisma studio`
- **API Testing:** Postman / Insomnia
- **Mobile Testing:** Expo Go app
- **Debugging:** React Native Debugger

---

## 🆘 Getting Help

### Internal Resources
- Check existing documentation in `docs/`
- Review code examples in codebase
- Search for similar issues in git history

### External Help
- React Native: [Community Discord](https://discord.gg/reactnative)
- Expo: [Community Forums](https://forums.expo.dev/)
- Prisma: [Community Slack](https://slack.prisma.io/)

### Reporting Issues
1. Check if issue already exists
2. Create detailed bug report
3. Include reproduction steps
4. Provide environment details

---

**Document Status:** ✅ Complete  
**Last Updated:** February 17, 2026  
**Maintainer:** Development Team

---

*Happy coding! 🚀*
