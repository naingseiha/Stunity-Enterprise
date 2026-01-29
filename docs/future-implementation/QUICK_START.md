# ⚡ Quick Start Guide - Future Implementation

## 🎯 For Developers Who Want to Start Immediately

This guide gets you up and running with the future implementation documentation and helps you begin building features right away.

## ⚠️ CRITICAL: Multi-Tenant Architecture

**This system is being built as a MULTI-TENANT, MULTI-YEAR platform from the start.**

### Key Concepts You MUST Understand:

1. **Multi-Tenant (Multiple Schools)**
   - Every model needs `schoolId` field
   - Every query MUST be school-scoped
   - Data isolation between schools is CRITICAL
   - Super admin can manage multiple schools

2. **Multi-Year (Multiple Academic Years)**
   - Support multiple academic years per school
   - Student progression across years
   - Historical data tracking
   - Year-specific classes and grades

3. **Data Isolation**
   - Schools cannot see each other's data
   - Row-level security in database
   - School context in every API call
   - JWT tokens include schoolId

**🚨 If you don't understand multi-tenant architecture, STOP and read:**
- `/database/CURRENT_VS_FUTURE_SCHEMA.md`
- `/database/DATABASE_DOCS_README.md`
- `/architecture/ARCHITECTURE_OVERVIEW.md`

---

## 📋 Prerequisites

### Required Knowledge
- ✅ TypeScript/JavaScript (ES2020+)
- ✅ React 19 + Next.js 15
- ✅ Node.js 20+ backend development
- ✅ PostgreSQL database
- ✅ REST API design
- ✅ Git version control

### Nice to Have
- WebSocket/real-time features
- Mobile development (React Native/Swift/Kotlin)
- Docker & Kubernetes
- Cloud platforms (AWS/Azure/GCP)
- GraphQL

---

## 🚀 Getting Started (Day 1)

### Step 1: Review Documentation (2 hours)

```bash
# Navigate to documentation
cd docs/future-implementation

# Read these files in order:
# 1. Overview and vision
cat README.md

# 2. Architecture understanding
cat architecture/ARCHITECTURE_OVERVIEW.md

# 3. Feature overview
cat features/SOCIAL_MEDIA_FEATURES.md
cat features/E_LEARNING_PLATFORM.md

# 4. International support
cat international/GLOBAL_EDUCATION_SYSTEMS.md
```

### Step 2: Setup Development Environment (1 hour)

```bash
# Clone repository (if not already done)
git clone <repository-url>
cd SchoolManagementApp

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Configure environment
cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/school_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="1h"

# File Upload
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="your-bucket"

# Email
SENDGRID_API_KEY="your-sendgrid-key"

# Environment
NODE_ENV="development"
EOF

# Start development servers
npm run dev        # Frontend (port 3000)
cd api && npm run dev  # Backend (port 5001)
```

### Step 3: Understand Current System vs Future System (1 hour)

```bash
# Current System (v1.0) - Single School
# - Single school (no multi-tenant)
# - Single academic year (hardcoded "2024-2025")
# - 13 models
# - Basic features only

# Future System (v2.0+) - Multi-Tenant
# - Multiple schools (full multi-tenant)
# - Multiple academic years per school
# - 22 models (+9 new)
# - Advanced social + e-learning features

# Review migration guide
cat docs/future-implementation/database/CURRENT_VS_FUTURE_SCHEMA.md

# Test current system
npm run dev
# Open http://localhost:3000
# Login with admin credentials
```

---

## 🏢 Multi-Tenant Architecture (CRITICAL)

### Understanding School Context

Every request needs school context. Here's how it works:

```typescript
// 1. User logs in
POST /api/auth/login
{
  "email": "teacher@school.com",
  "password": "password"
}

// 2. Response includes available schools
{
  "user": { "id": "user-123", "name": "John Doe" },
  "schools": [
    { "id": "school-001", "name": "Phnom Penh High School" },
    { "id": "school-002", "name": "Siem Reap Academy" }
  ],
  "defaultSchool": "school-001",
  "token": "jwt-token-with-schoolId"
}

// 3. Frontend stores selected school
localStorage.setItem('currentSchool', 'school-001');

// 4. All API calls include school context
GET /api/schools/school-001/students
GET /api/schools/school-001/classes
GET /api/schools/school-001/grades
```

### Database Models (Multi-Tenant)

**WRONG ❌ (Single-School):**
```prisma
model Student {
  id        String @id @default(cuid())
  name      String
  grade     String
  classId   String
  
  class     Class  @relation(fields: [classId], references: [id])
}
```

**CORRECT ✅ (Multi-Tenant):**
```prisma
model Student {
  id             String @id @default(cuid())
  schoolId       String          // ← REQUIRED for multi-tenant
  academicYearId String          // ← REQUIRED for multi-year
  name           String
  grade          String
  classId        String
  
  school         School       @relation(fields: [schoolId], references: [id])
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  class          Class        @relation(fields: [classId], references: [id])
  
  @@index([schoolId])                    // ← REQUIRED
  @@index([schoolId, academicYearId])    // ← REQUIRED
}

model School {
  id           String @id @default(cuid())
  schoolId     String @unique          // "SCH-PP-001"
  name         String
  nameKh       String
  
  students     Student[]
  teachers     Teacher[]
  classes      Class[]
  academicYears AcademicYear[]
}

model AcademicYear {
  id        String @id @default(cuid())
  schoolId  String
  yearCode  String                     // "2024-2025"
  startDate DateTime
  endDate   DateTime
  isCurrent Boolean  @default(false)
  
  school    School   @relation(fields: [schoolId], references: [id])
  students  Student[]
  classes   Class[]
  
  @@unique([schoolId, yearCode])
  @@index([schoolId, isCurrent])
}
```

### API Patterns (Multi-Tenant)

**1. School Context Middleware:**
```typescript
// api/src/middleware/school-context.middleware.ts
import { Request, Response, NextFunction } from 'express';

export async function schoolContext(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  // Get school from URL or JWT token
  const schoolId = req.params.schoolId || req.user?.schoolId;
  
  if (!schoolId) {
    return res.status(400).json({ error: 'School context required' });
  }
  
  // Verify user has access to this school
  const hasAccess = await checkSchoolAccess(req.user.id, schoolId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this school' });
  }
  
  // Add school to request
  req.school = await prisma.school.findUnique({
    where: { id: schoolId }
  });
  
  next();
}
```

**2. School-Scoped Queries:**
```typescript
// WRONG ❌
const students = await prisma.student.findMany();

// CORRECT ✅
const students = await prisma.student.findMany({
  where: {
    schoolId: req.school.id,
    academicYearId: currentYear.id
  }
});
```

**3. School-Scoped Routes:**
```typescript
// api/src/routes/students.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { schoolContext } from '../middleware/school-context.middleware';

const router = Router();

// All routes require authentication AND school context
router.use(authenticate);
router.use(schoolContext);

// GET /api/schools/:schoolId/students
router.get('/:schoolId/students', async (req, res) => {
  const students = await prisma.student.findMany({
    where: {
      schoolId: req.school.id,  // From middleware
      academicYearId: req.school.currentAcademicYearId
    }
  });
  
  res.json(students);
});

// POST /api/schools/:schoolId/students
router.post('/:schoolId/students', async (req, res) => {
  const student = await prisma.student.create({
    data: {
      ...req.body,
      schoolId: req.school.id,  // Auto-inject
      academicYearId: req.school.currentAcademicYearId
    }
  });
  
  res.json(student);
});
```

### School Selection Flow (Frontend)

```typescript
// src/components/SchoolSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function SchoolSelector() {
  const [schools, setSchools] = useState([]);
  const [currentSchool, setCurrentSchool] = useState(null);
  const router = useRouter();
  
  useEffect(() => {
    // Load user's schools
    fetch('/api/auth/schools')
      .then(res => res.json())
      .then(data => {
        setSchools(data.schools);
        setCurrentSchool(data.currentSchool);
      });
  }, []);
  
  const switchSchool = async (schoolId: string) => {
    // Update backend session
    await fetch('/api/auth/switch-school', {
      method: 'POST',
      body: JSON.stringify({ schoolId }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Update local storage
    localStorage.setItem('currentSchool', schoolId);
    
    // Refresh page to load new school data
    router.refresh();
  };
  
  if (!currentSchool) return null;
  
  return (
    <div className="school-selector">
      <select 
        value={currentSchool.id}
        onChange={(e) => switchSchool(e.target.value)}
      >
        {schools.map(school => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Migration Steps (Multi-Tenant)

```bash
# Phase 1: Add School Model
cd api/prisma

# 1. Add School model to schema.prisma
# 2. Add schoolId to all models
# 3. Create migration
npx prisma migrate dev --name add_school_model

# Phase 2: Add AcademicYear Model
# 1. Add AcademicYear model
# 2. Add academicYearId to relevant models
# 3. Create migration
npx prisma migrate dev --name add_academic_year_model

# Phase 3: Migrate existing data
# Run data migration script
node scripts/migrate-to-multi-tenant.js

# This script:
# - Creates default school
# - Creates current academic year
# - Updates all existing records with schoolId
# - Updates all existing records with academicYearId
```

---

## 🏗️ Implementation Roadmap

### Phase 1: Social Foundation (Weeks 1-8)

#### Week 1-2: User Profiles & Social Features

**Day 1-3: Enhanced User Profiles**
```bash
# Tasks:
# 1. Update User model in Prisma schema
cd api/prisma

# Add to schema.prisma:
model User {
  // ... existing fields
  bio              String?
  avatar           String?
  coverPhoto       String?
  website          String?
  socialLinks      Json?

  // Social stats
  followersCount   Int       @default(0)
  followingCount   Int       @default(0)
  postsCount       Int       @default(0)

  // Privacy
  isPublic         Boolean   @default(true)
  showGrades       Boolean   @default(false)

  // Relations
  posts            Post[]
  following        Follow[]  @relation("UserFollowing")
  followers        Follow[]  @relation("UserFollowers")

  updatedAt        DateTime  @updatedAt
}

# Run migration
npx prisma migrate dev --name add_social_profile

# Generate Prisma client
npx prisma generate
```

**Day 4-5: Follow System**
```bash
# Create Follow model
model Follow {
  id           String    @id @default(cuid())
  followerId   String
  followingId  String
  createdAt    DateTime  @default(now())

  follower     User      @relation("UserFollowing", fields: [followerId], references: [id])
  following    User      @relation("UserFollowers", fields: [followingId], references: [id])

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}

# Create follow service
# File: api/src/services/follow.service.ts
```

**Day 6-7: API Endpoints**
```typescript
// api/src/routes/social.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Follow/Unfollow
router.post('/follow/:userId', authenticate, followUser);
router.delete('/follow/:userId', authenticate, unfollowUser);
router.get('/followers/:userId', getFollowers);
router.get('/following/:userId', getFollowing);

// Profile
router.get('/profile/:userId', getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;
```

#### Week 3-4: Posts & Feed System

**Day 1-3: Post Model & Backend**
```prisma
model Post {
  id              String     @id @default(cuid())
  authorId        String
  content         String     @db.Text
  type            PostType   @default(TEXT)
  media           Json?      // Array of media URLs
  visibility      Visibility @default(PUBLIC)

  // Engagement
  likesCount      Int        @default(0)
  commentsCount   Int        @default(0)
  sharesCount     Int        @default(0)
  viewsCount      Int        @default(0)

  // Relations
  author          User       @relation(fields: [authorId], references: [id])
  comments        Comment[]
  likes           Like[]

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([authorId, createdAt])
  @@index([visibility, createdAt])
}

enum PostType {
  TEXT
  IMAGE
  VIDEO
  LINK
  POLL
}

enum Visibility {
  PUBLIC
  FRIENDS
  CLASS
  SCHOOL
  PRIVATE
}

model Comment {
  id         String    @id @default(cuid())
  postId     String
  authorId   String
  content    String    @db.Text
  parentId   String?   // For nested comments

  likesCount Int       @default(0)

  post       Post      @relation(fields: [postId], references: [id])
  author     User      @relation(fields: [authorId], references: [id])
  parent     Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies    Comment[] @relation("CommentReplies")

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([postId, createdAt])
}

model Like {
  id         String    @id @default(cuid())
  userId     String
  postId     String?
  commentId  String?

  user       User      @relation(fields: [userId], references: [id])
  post       Post?     @relation(fields: [postId], references: [id])

  createdAt  DateTime  @default(now())

  @@unique([userId, postId])
  @@unique([userId, commentId])
}
```

**Day 4-5: Feed Algorithm**
```typescript
// api/src/services/feed.service.ts
export class FeedService {
  async generateFeed(userId: string, page: number = 1) {
    const limit = 20;
    const offset = (page - 1) * limit;

    // Get user's following list
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map(f => f.followingId);

    // Get posts from following + own posts
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { authorId: userId },
          { authorId: { in: followingIds } },
          { visibility: 'PUBLIC' },
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    });

    return posts;
  }
}
```

**Day 6-7: Frontend Components**
```tsx
// src/components/social/FeedCard.tsx
'use client';

import { Post } from '@/types';
import { useState } from 'react';

export function FeedCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);

  const handleLike = async () => {
    try {
      if (liked) {
        await fetch(`/api/social/posts/${post.id}/unlike`, {
          method: 'DELETE',
        });
        setLikesCount(prev => prev - 1);
      } else {
        await fetch(`/api/social/posts/${post.id}/like`, {
          method: 'POST',
        });
        setLikesCount(prev => prev + 1);
      }
      setLiked(!liked);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      {/* Post header */}
      <div className="flex items-center mb-3">
        <img
          src={post.author.avatar || '/default-avatar.png'}
          alt={post.author.name}
          className="w-10 h-10 rounded-full"
        />
        <div className="ml-3">
          <p className="font-semibold">{post.author.name}</p>
          <p className="text-sm text-gray-500">
            {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Post content */}
      <p className="mb-3">{post.content}</p>

      {/* Post media */}
      {post.media && post.type === 'IMAGE' && (
        <img
          src={post.media[0]}
          alt="Post"
          className="w-full rounded-lg mb-3"
        />
      )}

      {/* Post actions */}
      <div className="flex items-center gap-4 pt-3 border-t">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 ${
            liked ? 'text-red-500' : 'text-gray-600'
          }`}
        >
          <span>❤️</span>
          <span>{likesCount}</span>
        </button>

        <button className="flex items-center gap-1 text-gray-600">
          <span>💬</span>
          <span>{post.commentsCount}</span>
        </button>

        <button className="flex items-center gap-1 text-gray-600">
          <span>🔗</span>
          <span>{post.sharesCount}</span>
        </button>
      </div>
    </div>
  );
}
```

#### Week 5-6: Messaging System

**Backend Setup**
```typescript
// api/src/services/message.service.ts
import { Server as SocketServer } from 'socket.io';

export class MessageService {
  private io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
  }

  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    content: string;
  }) {
    // Save to database
    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        status: 'sent',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Emit to conversation participants
    this.io
      .to(`conversation:${data.conversationId}`)
      .emit('message:new', message);

    return message;
  }
}
```

**WebSocket Setup**
```typescript
// api/src/socket/index.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export function initializeSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join conversation rooms
    socket.on('join:conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Send message
    socket.on('message:send', async (data) => {
      const messageService = new MessageService(io);
      await messageService.sendMessage(data);
    });

    // Typing indicator
    socket.on('typing:start', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        userId: socket.data.userId,
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}
```

#### Week 7-8: Polish & Testing

**Testing Checklist**
```bash
# Unit Tests
npm run test:unit

# Integration Tests
npm run test:integration

# E2E Tests (Playwright)
npm run test:e2e

# Test Coverage
npm run test:coverage
```

---

## 📚 Key Resources

### Documentation
- **README.md** - Overview and structure
- **features/** - Detailed feature specifications
- **architecture/** - Technical architecture
- **international/** - Global support

### Code Examples
- Check `examples/` directory for code samples
- Review existing codebase for patterns

### Support
- GitHub Issues for questions
- Team Slack/Discord channel
- Weekly sync meetings

---

## ✅ Daily Checklist

### Every Morning
- [ ] Pull latest changes (`git pull`)
- [ ] Check project board for tasks
- [ ] Review code review requests
- [ ] Update local environment

### Every Evening
- [ ] Commit work (`git commit -m "descriptive message"`)
- [ ] Push to feature branch (`git push origin feature/your-feature`)
- [ ] Update task status
- [ ] Document any blockers

---

## 🎯 Success Metrics

### Week 1-2
- ✅ User profiles with bio and avatar
- ✅ Follow/unfollow functionality
- ✅ 10+ unit tests passing

### Week 3-4
- ✅ Create posts with text/image
- ✅ News feed showing posts
- ✅ Like and comment functionality

### Week 5-6
- ✅ Real-time messaging
- ✅ Conversation list
- ✅ Online status indicators

### Week 7-8
- ✅ 80%+ test coverage
- ✅ No critical bugs
- ✅ Performance benchmarks met

---

## 🚨 Common Issues & Solutions

### Issue: Database Connection Fails
```bash
# Solution: Check PostgreSQL is running
brew services start postgresql
# or
sudo systemctl start postgresql

# Verify connection
psql -U postgres -h localhost
```

### Issue: Redis Not Available
```bash
# Solution: Start Redis server
brew services start redis
# or
sudo systemctl start redis

# Verify
redis-cli ping
```

### Issue: Port Already in Use
```bash
# Solution: Kill process on port
lsof -ti:3000 | xargs kill
lsof -ti:5001 | xargs kill
```

---

## 💡 Pro Tips

1. **Use TypeScript Strictly**: Enable strict mode for better type safety
2. **Write Tests First**: TDD helps catch bugs early
3. **Keep Components Small**: Aim for < 200 lines per component
4. **Use React Query**: For efficient data fetching and caching
5. **Performance**: Use React.memo() for expensive components
6. **Accessibility**: Test with screen readers
7. **Mobile First**: Design for mobile, scale up to desktop

---

## 📞 Need Help?

- **Documentation**: Check docs/future-implementation/
- **Team Chat**: Join #development channel
- **Code Review**: Create PR and request review
- **Bugs**: File issue on GitHub
- **Architecture Questions**: Ask tech lead

---

**Ready to build the future of education? Let's go! 🚀**

---

**Document Version**: 1.0
**Last Updated**: January 18, 2026
**Status**: Active Development Guide
