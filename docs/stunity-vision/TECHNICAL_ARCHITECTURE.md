# 🏗️ Stunity - Technical Architecture

**Version:** 1.0  
**Date:** January 27, 2026  
**Status:** Planning Phase

---

## 📖 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Design](#database-design)
5. [API Architecture](#api-architecture)
6. [Security Architecture](#security-architecture)
7. [Scalability & Performance](#scalability--performance)
8. [Infrastructure](#infrastructure)

---

## 🎯 Architecture Overview

### Design Principles

1. **API-First**: RESTful and GraphQL APIs for all features
2. **Mobile-First**: PWA now, React Native later
3. **Microservices-Ready**: Modular architecture for future scaling
4. **Real-Time**: WebSocket support for live features
5. **Offline-First**: Local caching and sync
6. **Secure by Default**: Security at every layer
7. **Scalable**: Horizontal scaling capability
8. **Testable**: High test coverage, automated testing

---

## 💻 Technology Stack

### Current Stack (Phase 0-3)

#### Frontend
```
├── Framework: Next.js 14+ (App Router)
├── Language: TypeScript 5+
├── UI Library: React 18+
├── Styling: Tailwind CSS 3+
├── State Management: React Context + Hooks
├── Forms: React Hook Form + Zod
├── HTTP Client: Axios / Fetch API
└── Real-time: Socket.io Client
```

#### Backend (API)
```
├── Framework: Next.js API Routes (serverless)
├── Language: TypeScript
├── ORM: Prisma
├── Validation: Zod
├── Authentication: NextAuth.js
└── File Upload: AWS S3 / Cloudinary
```

#### Database
```
├── Primary: PostgreSQL (Neon.tech)
├── Cache: Redis (Upstash)
├── Search: PostgreSQL Full-Text Search
└── File Storage: AWS S3 / Cloudinary
```

#### Real-Time
```
├── WebSockets: Socket.io
├── Pub/Sub: Redis
└── Message Queue: BullMQ (future)
```

#### Infrastructure
```
├── Hosting: Vercel
├── Database: Neon.tech (PostgreSQL)
├── Cache: Upstash Redis
├── Storage: AWS S3 / Cloudinary
├── CDN: Vercel Edge Network
└── Monitoring: Vercel Analytics + Sentry
```

### Future Stack (Phase 4-7)

#### Mobile Native
```
├── Framework: React Native
├── Navigation: React Navigation
├── State: Redux Toolkit / Zustand
├── Offline: WatermelonDB
└── Push: Firebase Cloud Messaging
```

#### Backend (Microservices)
```
├── API Gateway: Kong / AWS API Gateway
├── Services: Node.js / Go
├── Message Queue: RabbitMQ / AWS SQS
├── Event Bus: Apache Kafka
└── Service Mesh: Istio (optional)
```

#### Database (Scaling)
```
├── Primary: PostgreSQL (RDS)
├── Read Replicas: PostgreSQL
├── Analytics: ClickHouse
├── Search: Elasticsearch
├── Cache: Redis Cluster
└── CDN: CloudFront
```

#### AI/ML
```
├── Recommendations: TensorFlow / PyTorch
├── NLP: OpenAI GPT / Hugging Face
├── Analytics: Python (Pandas, NumPy)
└── ML Ops: AWS SageMaker
```

---

## 🏛️ System Architecture

### Current Architecture (Monolithic with Next.js)

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                        │
├─────────────────────────────────────────────────────────┤
│  PWA (Next.js)                                          │
│  ├── React Components                                   │
│  ├── Tailwind CSS                                       │
│  ├── Context API (State)                               │
│  └── Service Worker (Offline)                          │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
├─────────────────────────────────────────────────────────┤
│  Next.js API Routes                                     │
│  ├── /api/auth/* (Authentication)                      │
│  ├── /api/posts/* (Social Feed)                        │
│  ├── /api/courses/* (LMS)                              │
│  ├── /api/users/* (User Management)                    │
│  └── /api/messages/* (Messaging)                       │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    Business Logic                        │
├─────────────────────────────────────────────────────────┤
│  Services Layer                                          │
│  ├── UserService                                        │
│  ├── CourseService                                      │
│  ├── AssignmentService                                  │
│  ├── PostService                                        │
│  └── NotificationService                               │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                     Data Layer                          │
├─────────────────────────────────────────────────────────┤
│  Prisma ORM                                             │
│  ├── Models & Schemas                                   │
│  ├── Query Builder                                      │
│  └── Migrations                                         │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                   Database Layer                         │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL (Neon)          Redis (Upstash)            │
│  ├── Users                  ├── Sessions               │
│  ├── Courses                ├── Cache                  │
│  ├── Posts                  └── Real-time Data         │
│  ├── Assignments                                       │
│  └── Messages                                          │
└─────────────────────────────────────────────────────────┘
```

### Future Architecture (Microservices)

```
┌──────────────────────────────────────────────────────────┐
│                      Client Layer                         │
├──────────────────────────────────────────────────────────┤
│  PWA (Next.js)              React Native App            │
│  ├── Web App                ├── iOS App                 │
│  └── Mobile Web             └── Android App             │
└──────────────────────────────────────────────────────────┘
                            ↕
┌──────────────────────────────────────────────────────────┐
│                     API Gateway                          │
├──────────────────────────────────────────────────────────┤
│  Kong / AWS API Gateway                                  │
│  ├── Authentication                                      │
│  ├── Rate Limiting                                       │
│  ├── Load Balancing                                      │
│  └── API Versioning                                      │
└──────────────────────────────────────────────────────────┘
                            ↕
┌──────────────────────────────────────────────────────────┐
│                  Microservices Layer                     │
├──────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Auth    │  │  User    │  │  Social  │              │
│  │ Service  │  │ Service  │  │ Service  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   LMS    │  │ Message  │  │Analytics │              │
│  │ Service  │  │ Service  │  │ Service  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Media   │  │  Search  │  │   AI     │              │
│  │ Service  │  │ Service  │  │ Service  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└──────────────────────────────────────────────────────────┘
                            ↕
┌──────────────────────────────────────────────────────────┐
│                    Event Bus / Message Queue             │
├──────────────────────────────────────────────────────────┤
│  Apache Kafka / RabbitMQ / AWS SQS                       │
│  ├── User Events                                         │
│  ├── Course Events                                       │
│  ├── Notification Events                                 │
│  └── Analytics Events                                    │
└──────────────────────────────────────────────────────────┘
                            ↕
┌──────────────────────────────────────────────────────────┐
│                     Database Layer                       │
├──────────────────────────────────────────────────────────┤
│  PostgreSQL     MongoDB      Redis       Elasticsearch   │
│  (Relational)   (Documents)  (Cache)     (Search)        │
│  ├── Users      ├── Logs     ├── Cache   ├── Courses    │
│  ├── Courses    ├── Chat     └── Queue   ├── Posts      │
│  └── Grades     └── Content               └── Users     │
└──────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Design

### Core Schema (Prisma)

#### User Management
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  firstName     String
  lastName      String
  role          UserRole  @default(STUDENT)
  avatar        String?
  coverPhoto    String?
  bio           String?
  verified      Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  posts         Post[]
  comments      Comment[]
  likes         Like[]
  courses       CourseEnrollment[]
  assignments   AssignmentSubmission[]
  following     Follow[]  @relation("Following")
  followers     Follow[]  @relation("Followers")
  sentMessages  Message[] @relation("Sender")
  receivedMessages Message[] @relation("Receiver")
  
  @@index([email])
  @@index([role])
}

enum UserRole {
  STUDENT
  TEACHER
  RESEARCHER
  ADMIN
  PARENT
}

model Profile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  
  // Additional fields
  pronouns      String?
  dateOfBirth   DateTime?
  location      String?
  website       String?
  linkedin      String?
  github        String?
  twitter       String?
  skills        String[] // Array of skills
  interests     String[] // Array of interests
  education     Json?    // Education history
  experience    Json?    // Work experience
  
  // Privacy settings
  profileVisibility    Visibility @default(PUBLIC)
  activityVisibility   Visibility @default(PUBLIC)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum Visibility {
  PUBLIC
  CONNECTIONS
  PRIVATE
}
```

#### Social Features
```prisma
model Post {
  id            String   @id @default(cuid())
  content       String
  contentKh     String?
  type          PostType @default(TEXT)
  media         String[] // URLs to images/videos
  authorId      String
  author        User     @relation(fields: [authorId], references: [id])
  
  likes         Like[]
  comments      Comment[]
  hashtags      String[] // Array of hashtags
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([authorId])
  @@index([createdAt])
}

enum PostType {
  TEXT
  IMAGE
  VIDEO
  POLL
  QUIZ
  ARTICLE
  EVENT
}

model Comment {
  id            String   @id @default(cuid())
  content       String
  postId        String
  post          Post     @relation(fields: [postId], references: [id])
  authorId      String
  author        User     @relation(fields: [authorId], references: [id])
  parentId      String?  // For nested replies
  parent        Comment? @relation("Replies", fields: [parentId], references: [id])
  replies       Comment[] @relation("Replies")
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([postId])
  @@index([authorId])
}

model Like {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  postId        String?
  post          Post?    @relation(fields: [postId], references: [id])
  commentId     String?
  comment       Comment? @relation(fields: [commentId], references: [id])
  
  createdAt     DateTime @default(now())
  
  @@unique([userId, postId])
  @@unique([userId, commentId])
  @@index([userId])
}

model Follow {
  id            String   @id @default(cuid())
  followerId    String
  follower      User     @relation("Following", fields: [followerId], references: [id])
  followingId   String
  following     User     @relation("Followers", fields: [followingId], references: [id])
  
  createdAt     DateTime @default(now())
  
  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}
```

#### Learning Management
```prisma
model Course {
  id            String   @id @default(cuid())
  title         String
  titleKh       String?
  description   String
  descriptionKh String?
  thumbnail     String?
  category      String
  level         Level    @default(BEGINNER)
  price         Float    @default(0)
  isPaid        Boolean  @default(false)
  
  instructorId  String
  instructor    User     @relation(fields: [instructorId], references: [id])
  
  lessons       Lesson[]
  enrollments   CourseEnrollment[]
  assignments   Assignment[]
  
  published     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([instructorId])
  @@index([category])
  @@index([published])
}

enum Level {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}

model Lesson {
  id            String   @id @default(cuid())
  courseId      String
  course        Course   @relation(fields: [courseId], references: [id])
  
  title         String
  titleKh       String?
  content       String   // HTML or Markdown
  contentKh     String?
  videoUrl      String?
  duration      Int?     // in minutes
  order         Int
  
  resources     Resource[]
  
  published     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([courseId])
  @@index([order])
}

model CourseEnrollment {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  courseId      String
  course        Course   @relation(fields: [courseId], references: [id])
  
  progress      Float    @default(0) // 0-100
  completedLessons Int   @default(0)
  grade         Float?   // 0-100
  
  enrolledAt    DateTime @default(now())
  completedAt   DateTime?
  
  @@unique([userId, courseId])
  @@index([userId])
  @@index([courseId])
}

model Assignment {
  id            String   @id @default(cuid())
  courseId      String
  course        Course   @relation(fields: [courseId], references: [id])
  
  title         String
  titleKh       String?
  description   String
  descriptionKh String?
  type          AssignmentType @default(FILE)
  maxPoints     Float    @default(100)
  dueDate       DateTime
  
  submissions   AssignmentSubmission[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([courseId])
  @@index([dueDate])
}

enum AssignmentType {
  FILE
  TEXT
  LINK
  VIDEO
  QUIZ
}

model AssignmentSubmission {
  id            String   @id @default(cuid())
  assignmentId  String
  assignment    Assignment @relation(fields: [assignmentId], references: [id])
  studentId     String
  student       User     @relation(fields: [studentId], references: [id])
  
  content       String?  // Text submission
  fileUrl       String?  // File submission URL
  status        SubmissionStatus @default(PENDING)
  
  grade         Float?   // 0-100
  feedback      String?
  gradedAt      DateTime?
  gradedBy      String?
  
  submittedAt   DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([assignmentId, studentId])
  @@index([assignmentId])
  @@index([studentId])
  @@index([status])
}

enum SubmissionStatus {
  PENDING
  SUBMITTED
  GRADED
  LATE
  MISSING
}
```

#### Messaging
```prisma
model Message {
  id            String   @id @default(cuid())
  content       String
  senderId      String
  sender        User     @relation("Sender", fields: [senderId], references: [id])
  receiverId    String
  receiver      User     @relation("Receiver", fields: [receiverId], references: [id])
  
  read          Boolean  @default(false)
  readAt        DateTime?
  
  attachments   String[] // URLs to files
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([senderId])
  @@index([receiverId])
  @@index([createdAt])
}

model Conversation {
  id            String   @id @default(cuid())
  participants  String[] // Array of user IDs
  type          ConversationType @default(DIRECT)
  name          String?  // For group chats
  avatar        String?  // For group chats
  
  lastMessage   String?
  lastMessageAt DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([participants])
}

enum ConversationType {
  DIRECT
  GROUP
}
```

#### Notifications
```prisma
model Notification {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  type          NotificationType
  title         String
  message       String
  link          String?
  
  read          Boolean  @default(false)
  readAt        DateTime?
  
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([createdAt])
  @@index([read])
}

enum NotificationType {
  POST_LIKE
  POST_COMMENT
  NEW_FOLLOWER
  ASSIGNMENT_DUE
  ASSIGNMENT_GRADED
  MESSAGE_RECEIVED
  COURSE_UPDATE
  SYSTEM
}
```

### Database Optimization

#### Indexing Strategy
```sql
-- Most queried fields
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX idx_courses_published ON courses(published, created_at DESC);
CREATE INDEX idx_assignments_due ON assignments(due_date);
CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id, created_at);

-- Full-text search
CREATE INDEX idx_posts_content_fts ON posts USING GIN(to_tsvector('english', content));
CREATE INDEX idx_courses_title_fts ON courses USING GIN(to_tsvector('english', title));
```

#### Partitioning (Future)
```sql
-- Partition posts by date for performance
CREATE TABLE posts_2026 PARTITION OF posts
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
  
CREATE TABLE posts_2027 PARTITION OF posts
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
```

---

## 🔌 API Architecture

### RESTful API

#### Base URL
```
Production: https://api.stunity.com/v1
Development: http://localhost:3000/api
```

#### Authentication
```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/verify-email/:token
```

#### Users
```http
GET    /api/users/me
PUT    /api/users/me
GET    /api/users/:id
GET    /api/users/:id/posts
GET    /api/users/:id/followers
GET    /api/users/:id/following
POST   /api/users/:id/follow
DELETE /api/users/:id/follow
```

#### Posts
```http
GET    /api/posts              # Get feed
POST   /api/posts              # Create post
GET    /api/posts/:id          # Get post
PUT    /api/posts/:id          # Update post
DELETE /api/posts/:id          # Delete post
POST   /api/posts/:id/like     # Like post
POST   /api/posts/:id/comment  # Comment on post
GET    /api/posts/:id/comments # Get comments
```

#### Courses
```http
GET    /api/courses            # List courses
POST   /api/courses            # Create course (teacher)
GET    /api/courses/:id        # Get course details
PUT    /api/courses/:id        # Update course
DELETE /api/courses/:id        # Delete course
POST   /api/courses/:id/enroll # Enroll in course
GET    /api/courses/:id/lessons # Get lessons
POST   /api/courses/:id/lessons # Create lesson
```

#### Assignments
```http
GET    /api/assignments         # List assignments
POST   /api/assignments         # Create assignment
GET    /api/assignments/:id     # Get assignment
PUT    /api/assignments/:id     # Update assignment
DELETE /api/assignments/:id     # Delete assignment
POST   /api/assignments/:id/submit # Submit assignment
GET    /api/assignments/:id/submissions # Get submissions
PUT    /api/assignments/:id/submissions/:submissionId/grade # Grade
```

#### Messages
```http
GET    /api/messages/conversations # List conversations
GET    /api/messages/:conversationId # Get messages
POST   /api/messages/:conversationId # Send message
PUT    /api/messages/:messageId/read # Mark as read
```

### GraphQL API (Future)

```graphql
type Query {
  me: User
  user(id: ID!): User
  posts(limit: Int, offset: Int): [Post]
  courses(filter: CourseFilter): [Course]
  course(id: ID!): Course
}

type Mutation {
  createPost(input: CreatePostInput!): Post
  updatePost(id: ID!, input: UpdatePostInput!): Post
  deletePost(id: ID!): Boolean
  
  enrollCourse(courseId: ID!): CourseEnrollment
  submitAssignment(input: SubmitAssignmentInput!): AssignmentSubmission
}

type Subscription {
  newMessage(conversationId: ID!): Message
  newNotification: Notification
  postUpdate(postId: ID!): Post
}
```

### WebSocket Events

```javascript
// Client -> Server
socket.emit('join_conversation', { conversationId })
socket.emit('send_message', { conversationId, content })
socket.emit('typing', { conversationId })

// Server -> Client
socket.on('new_message', (message) => {})
socket.on('user_typing', (userId) => {})
socket.on('new_notification', (notification) => {})
socket.on('user_online', (userId) => {})
socket.on('user_offline', (userId) => {})
```

---

## 🔒 Security Architecture

### Authentication & Authorization

#### JWT Strategy
```typescript
// Access Token (short-lived: 15 minutes)
{
  userId: "123",
  role: "STUDENT",
  exp: 1234567890
}

// Refresh Token (long-lived: 7 days)
{
  userId: "123",
  tokenVersion: 1,
  exp: 1234567890
}
```

#### Role-Based Access Control (RBAC)
```typescript
const permissions = {
  STUDENT: [
    'posts:read',
    'posts:create',
    'courses:enroll',
    'assignments:submit'
  ],
  TEACHER: [
    'posts:read',
    'posts:create',
    'courses:create',
    'courses:update',
    'assignments:create',
    'assignments:grade'
  ],
  ADMIN: [
    '*' // All permissions
  ]
}
```

### Data Security

#### Encryption
- **At Rest**: Database encryption (PostgreSQL TDE)
- **In Transit**: HTTPS/TLS 1.3
- **Messages**: End-to-end encryption (E2EE)
- **Passwords**: bcrypt with salt rounds = 12

#### Input Validation
```typescript
// Using Zod
const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  media: z.array(z.string().url()).max(10).optional(),
  hashtags: z.array(z.string()).max(10).optional()
})
```

#### SQL Injection Prevention
- Use Prisma ORM (parameterized queries)
- Never use raw SQL with user input
- Validate and sanitize all inputs

#### XSS Prevention
- Sanitize HTML content (DOMPurify)
- Use Content Security Policy (CSP)
- Escape user-generated content

#### CSRF Protection
- CSRF tokens for state-changing operations
- SameSite cookies
- Verify Origin header

---

## ⚡ Scalability & Performance

### Caching Strategy

#### Redis Caching
```typescript
// Cache layers
1. Page cache (CDN): Static pages
2. API cache (Redis): API responses (TTL: 5 minutes)
3. Database query cache (Redis): Expensive queries (TTL: 15 minutes)
4. Session cache (Redis): User sessions
```

#### Cache Invalidation
```typescript
// Invalidate on write
await redis.del(`user:${userId}:profile`)
await redis.del(`course:${courseId}:details`)

// Stale-while-revalidate pattern
const data = await cache.get(key) || await fetchFreshData()
```

### Database Optimization

#### Connection Pooling
```typescript
// Prisma connection pooling
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 20
}
```

#### Query Optimization
```typescript
// Use select to limit fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    avatar: true
  }
})

// Use cursor-based pagination
const posts = await prisma.post.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastPostId }
})
```

### Load Balancing

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  User A  │     │  User B  │     │  User C  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
                ┌─────▼─────┐
                │  Vercel   │
                │ Edge CDN  │
                └─────┬─────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
     ┌────▼───┐  ┌────▼───┐  ┌───▼────┐
     │ Node 1 │  │ Node 2 │  │ Node 3 │
     └────┬───┘  └────┬───┘  └───┬────┘
          │           │           │
          └───────────┼───────────┘
                      │
              ┌───────▼────────┐
              │   PostgreSQL   │
              │  (Primary +    │
              │   Replicas)    │
              └────────────────┘
```

### Rate Limiting

```typescript
// Rate limits per endpoint
const rateLimits = {
  '/api/posts': { max: 100, window: '15m' },
  '/api/messages': { max: 50, window: '1m' },
  '/api/uploads': { max: 10, window: '1h' }
}

// Implementation with Redis
async function checkRateLimit(userId: string, endpoint: string) {
  const key = `ratelimit:${userId}:${endpoint}`
  const count = await redis.incr(key)
  
  if (count === 1) {
    await redis.expire(key, rateLimits[endpoint].window)
  }
  
  return count <= rateLimits[endpoint].max
}
```

---

## ☁️ Infrastructure

### Current Infrastructure (Vercel + Neon)

```
┌─────────────────────────────────────────┐
│            Vercel Platform              │
├─────────────────────────────────────────┤
│  • Next.js Hosting                      │
│  • Serverless Functions                 │
│  • Edge Network (CDN)                   │
│  • Automatic HTTPS                      │
│  • Preview Deployments                  │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│          Neon Database                  │
├─────────────────────────────────────────┤
│  • PostgreSQL                           │
│  • Automatic Scaling                    │
│  • Branching (for dev/staging)          │
│  • Point-in-time Recovery               │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│         Upstash Redis                   │
├─────────────────────────────────────────┤
│  • Cache                                │
│  • Session Storage                      │
│  • Rate Limiting                        │
└─────────────────────────────────────────┘
```

### Future Infrastructure (AWS)

```
┌────────────────────────────────────────────┐
│            CloudFront (CDN)                │
└──────────────┬─────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│         Application Load Balancer          │
└──────────────┬─────────────────────────────┘
               │
      ┌────────┼────────┐
      │        │        │
┌─────▼───┐ ┌─▼─────┐ ┌▼──────┐
│  ECS    │ │  ECS  │ │  ECS  │
│Container│ │Contain│ │Contain│
│    1    │ │   2   │ │   3   │
└─────┬───┘ └──┬────┘ └┬──────┘
      │        │        │
      └────────┼────────┘
               │
┌──────────────▼─────────────────────────────┐
│           RDS PostgreSQL                    │
│  ┌──────────┐         ┌──────────┐         │
│  │ Primary  │────────▶│ Replica  │         │
│  └──────────┘         └──────────┘         │
└─────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│         ElastiCache Redis Cluster          │
└─────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│              S3 Storage                     │
│  • User uploads                             │
│  • Course materials                         │
│  • Static assets                            │
└─────────────────────────────────────────────┘
```

### Monitoring & Observability

```typescript
// Monitoring Stack
{
  "Application Performance": "Vercel Analytics + Sentry",
  "Error Tracking": "Sentry",
  "Logging": "Vercel Logs + Papertrail",
  "Uptime Monitoring": "UptimeRobot",
  "Database Monitoring": "Neon Dashboard",
  "User Analytics": "Google Analytics + Mixpanel"
}
```

---

## 📊 Performance Targets

### Response Times
- **Page Load (Initial)**: < 2 seconds
- **Page Load (Subsequent)**: < 500ms
- **API Response**: < 300ms (p95)
- **Database Query**: < 100ms (p95)
- **Real-time Message**: < 100ms

### Availability
- **Uptime Target**: 99.9% (< 44 minutes downtime/month)
- **Recovery Time Objective (RTO)**: < 1 hour
- **Recovery Point Objective (RPO)**: < 15 minutes

### Scalability
- **Users**: Support 100,000 MAU initially
- **Database**: Scale to 10TB
- **API Requests**: Handle 10,000 req/sec
- **Concurrent Users**: Support 5,000 concurrent users

---

## 🚀 Deployment Strategy

### Environments

```
1. Development (Local)
   - localhost:3000
   - Local PostgreSQL
   - Hot reload enabled

2. Staging (Vercel Preview)
   - preview.stunity.com
   - Neon staging branch
   - Full production features

3. Production (Vercel)
   - www.stunity.com
   - Neon production database
   - CDN enabled
   - Monitoring active
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run lint
        run: npm run lint

  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel Preview
        run: vercel deploy --token=${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel Production
        run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 📞 Next Steps

1. ✅ Review this technical architecture
2. 🎨 Review design system document
3. 🧪 Review testing strategy
4. 📋 Start Phase 1 implementation
5. 🏗️ Set up development environment
6. 💻 Initialize project structure

---

**Document Owner:** Naing Seiha  
**Last Updated:** January 27, 2026  
**Next Review:** February 15, 2026

---

**Building a scalable, secure, and performant platform! 💪**
