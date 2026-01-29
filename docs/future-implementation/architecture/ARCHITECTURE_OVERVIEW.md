# 🏗️ System Architecture Overview

## Executive Summary

This document outlines the complete technical architecture for the global e-learning social platform, designed to support millions of users across thousands of schools worldwide.

---

## 🎯 Architecture Principles

### 1. Scalability First
- **Horizontal scaling**: Add more servers as load increases
- **Microservices**: Independent services that can scale individually
- **Stateless design**: Enable easy replication and load balancing
- **Caching layers**: Reduce database load with Redis and CDN

### 2. Global Distribution
- **Multi-region deployment**: Serve users from nearest region
- **CDN integration**: Fast content delivery worldwide
- **Database replication**: Read replicas in each region
- **Smart routing**: Route users to optimal servers

### 3. High Availability
- **99.95% uptime target**: Maximum 4.38 hours downtime per year
- **Redundancy**: Multiple instances of each service
- **Auto-failover**: Automatic recovery from failures
- **Health monitoring**: Continuous system health checks

### 4. Security & Privacy
- **Zero-trust architecture**: Verify every request
- **End-to-end encryption**: Protect sensitive data
- **Multi-tenant isolation**: Complete data separation
- **Compliance**: GDPR, COPPA, FERPA compliant

---

## 🌐 High-Level Architecture

```
                           ┌─────────────────────────────────┐
                           │      Global Load Balancer       │
                           │         (Cloudflare)            │
                           └──────────────┬──────────────────┘
                                          │
                 ┌────────────────────────┼────────────────────────┐
                 │                        │                        │
        ┌────────▼────────┐     ┌────────▼────────┐    ┌────────▼────────┐
        │  Region: Asia    │     │ Region: Europe  │    │ Region: Americas│
        │   (Singapore)    │     │   (Frankfurt)   │    │  (N. Virginia)  │
        └────────┬─────────┘     └────────┬────────┘    └────────┬────────┘
                 │                        │                       │
        ┌────────▼─────────────────────────▼──────────────────────▼────────┐
        │                                                                    │
        │                     Kubernetes Cluster                            │
        │                                                                    │
        │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
        │  │  API Gateway  │  │  Web Sockets │  │   GraphQL    │          │
        │  │   (NGINX)     │  │  (Socket.io) │  │   (Apollo)   │          │
        │  └──────┬────────┘  └──────┬────────┘  └──────┬───────┘          │
        │         │                  │                   │                  │
        │  ┌──────▼──────────────────▼───────────────────▼───────┐         │
        │  │                                                       │         │
        │  │              Microservices Layer                     │         │
        │  │                                                       │         │
        │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │         │
        │  │  │  User  │ │ Social │ │Course  │ │ Grade  │       │         │
        │  │  │Service │ │Service │ │Service │ │Service │  ...  │         │
        │  │  └────────┘ └────────┘ └────────┘ └────────┘       │         │
        │  │                                                       │         │
        │  └───────────────────┬───────────────────────────────────┘         │
        │                      │                                             │
        │  ┌───────────────────▼───────────────────────────────┐            │
        │  │                                                    │            │
        │  │              Data Layer                           │            │
        │  │                                                    │            │
        │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │            │
        │  │  │PostgreSQL │  │  Redis   │  │  S3/R2   │        │            │
        │  │  │ (Primary) │  │ (Cache)  │  │ (Files)  │        │            │
        │  │  └──────────┘  └──────────┘  └──────────┘        │            │
        │  │                                                    │            │
        │  └────────────────────────────────────────────────────┘            │
        │                                                                    │
        └────────────────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────────────────────────┐
        │                                                                   │
        │                    Supporting Services                           │
        │                                                                   │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
        │  │  Queue   │  │Analytics │  │   ML     │  │  Search  │        │
        │  │  (Bull)  │  │(ClickHouse)│ │(TensorFlow)││(Elastic) │        │
        │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
        │                                                                   │
        └───────────────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────────────────────────┐
        │                                                                   │
        │                    Observability Layer                           │
        │                                                                   │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
        │  │ Logging  │  │ Metrics  │  │  APM     │  │ Alerts   │        │
        │  │  (ELK)   │  │(Prometheus)│ │ (Sentry) │  │(PagerDuty)│        │
        │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
        │                                                                   │
        └───────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Components

### 1. Frontend Architecture

#### Web Application (Next.js 15)
```typescript
// App Structure
src/
├── app/                    // Next.js 15 App Router
│   ├── (auth)/            // Auth routes (login, register)
│   ├── (dashboard)/       // Main app routes
│   │   ├── feed/          // Social feed
│   │   ├── courses/       // E-learning
│   │   ├── messages/      // Chat
│   │   └── profile/       // User profile
│   ├── api/               // API routes (middleware)
│   └── layout.tsx         // Root layout
├── components/            // Reusable components
│   ├── ui/               // Base UI components
│   ├── features/         // Feature components
│   └── layouts/          // Layout components
├── lib/                  // Utilities
│   ├── api/             // API client
│   ├── hooks/           // Custom hooks
│   └── utils/           // Helpers
└── store/               // State management (Zustand)
```

#### Key Technologies
- **Framework**: Next.js 15 (App Router, Server Components)
- **UI Library**: Shadcn/ui + Radix UI
- **Styling**: Tailwind CSS 4
- **State**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **Real-time**: Socket.io client
- **Charts**: Recharts

#### Performance Optimizations
- Server Components for static content
- Streaming SSR for dynamic content
- Image optimization (next/image)
- Code splitting per route
- Prefetching
- Service Worker for offline
- Bundle size < 200KB (gzipped)

### 2. Mobile Applications

#### iOS App (Swift + SwiftUI)
```swift
// App Structure
App/
├── Views/
│   ├── Feed/
│   ├── Courses/
│   ├── Messages/
│   └── Profile/
├── ViewModels/
├── Models/
├── Services/
│   ├── API/
│   ├── Auth/
│   ├── Cache/
│   └── Sync/
├── Utilities/
└── Resources/
```

#### Android App (Kotlin + Jetpack Compose)
```kotlin
// App Structure
app/
├── ui/
│   ├── feed/
│   ├── courses/
│   ├── messages/
│   └── profile/
├── viewmodels/
├── data/
│   ├── models/
│   ├── repositories/
│   └── local/
├── network/
└── utils/
```

#### Features
- Native performance
- Offline-first architecture
- Background sync
- Push notifications
- Face ID / Biometric auth
- Dark mode support
- Accessibility support

### 3. Backend Architecture (Microservices)

#### API Gateway (Node.js + Express)
```typescript
// Responsibilities
- Request routing
- Authentication/Authorization
- Rate limiting
- Request validation
- Response caching
- API versioning
- Load balancing

// Structure
api-gateway/
├── src/
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rateLimit.ts
│   │   └── validation.ts
│   ├── routes/
│   │   └── index.ts
│   ├── utils/
│   └── index.ts
└── config/
```

#### Microservices Architecture

**1. User Service**
```typescript
// Responsibilities
- User registration/login
- Profile management
- Authentication (JWT)
- Password management
- 2FA handling
- Session management

// Tech Stack
- Node.js + NestJS
- PostgreSQL
- Redis (sessions)
- SendGrid (email)

// API Endpoints
POST   /api/users/register
POST   /api/users/login
GET    /api/users/me
PUT    /api/users/profile
POST   /api/users/reset-password
```

**2. Social Service**
```typescript
// Responsibilities
- Posts, comments, reactions
- Follow/friend system
- News feed generation
- Stories
- Notifications

// Tech Stack
- Node.js + NestJS
- PostgreSQL
- Redis (feed cache)
- Bull (queue)

// API Endpoints
POST   /api/social/posts
GET    /api/social/feed
POST   /api/social/follow/:userId
GET    /api/social/notifications
```

**3. Course Service**
```typescript
// Responsibilities
- Course management
- Lesson content
- Enrollment
- Progress tracking

// Tech Stack
- Node.js + NestJS
- PostgreSQL
- S3 (content storage)
- Redis (cache)

// API Endpoints
POST   /api/courses
GET    /api/courses/:id
POST   /api/courses/:id/enroll
GET    /api/courses/:id/progress
```

**4. Assignment Service**
```typescript
// Responsibilities
- Assignment creation
- Submission handling
- Grading
- Rubrics

// Tech Stack
- Node.js + NestJS
- PostgreSQL
- S3 (file uploads)
- Bull (async grading)

// API Endpoints
POST   /api/assignments
POST   /api/assignments/:id/submit
PUT    /api/assignments/:id/grade
GET    /api/assignments/:id/submissions
```

**5. Quiz Service**
```typescript
// Responsibilities
- Quiz creation
- Question bank
- Quiz attempts
- Auto-grading

// Tech Stack
- Node.js + NestJS
- PostgreSQL
- Redis (active quizzes)

// API Endpoints
POST   /api/quizzes
POST   /api/quizzes/:id/start
POST   /api/quizzes/:id/submit
GET    /api/quizzes/:id/results
```

**6. Messaging Service**
```typescript
// Responsibilities
- Direct messages
- Group chats
- Real-time delivery
- Read receipts

// Tech Stack
- Node.js + NestJS
- PostgreSQL
- Redis (online users)
- Socket.io (real-time)

// API Endpoints
POST   /api/messages
GET    /api/conversations
PUT    /api/messages/:id/read
WS     /ws/messages
```

**7. Live Class Service**
```typescript
// Responsibilities
- Video conferencing
- Screen sharing
- Recording
- Attendance

// Tech Stack
- Node.js + NestJS
- WebRTC
- Jitsi Meet / Agora
- S3 (recordings)

// API Endpoints
POST   /api/live-classes
POST   /api/live-classes/:id/join
GET    /api/live-classes/:id/recording
POST   /api/live-classes/:id/attendance
```

**8. Grade Service**
```typescript
// Responsibilities
- Gradebook management
- Grade calculation
- Transcript generation
- Analytics

// Tech Stack
- Node.js + NestJS
- PostgreSQL
- Redis (cache)
- PDF generation

// API Endpoints
GET    /api/grades/class/:classId
POST   /api/grades/calculate
GET    /api/grades/student/:id/transcript
GET    /api/grades/analytics
```

**9. Analytics Service**
```typescript
// Responsibilities
- User behavior tracking
- Learning analytics
- Performance metrics
- Reports generation

// Tech Stack
- Node.js + NestJS
- ClickHouse (analytics DB)
- PostgreSQL (metadata)
- Python (ML models)

// API Endpoints
POST   /api/analytics/track
GET    /api/analytics/dashboard
GET    /api/analytics/student/:id
GET    /api/analytics/course/:id
```

**10. Notification Service**
```typescript
// Responsibilities
- Push notifications
- Email notifications
- SMS notifications
- In-app notifications

// Tech Stack
- Node.js + NestJS
- PostgreSQL
- Redis (queue)
- FCM (push)
- SendGrid (email)

// API Endpoints
POST   /api/notifications/send
GET    /api/notifications
PUT    /api/notifications/:id/read
PUT    /api/notifications/preferences
```

**11. Search Service**
```typescript
// Responsibilities
- Full-text search
- Faceted search
- Autocomplete
- Trending content

// Tech Stack
- Node.js + NestJS
- Elasticsearch
- Redis (cache)

// API Endpoints
GET    /api/search?q=query
GET    /api/search/suggestions
GET    /api/search/trending
```

**12. Media Service**
```typescript
// Responsibilities
- File uploads
- Image processing
- Video transcoding
- CDN integration

// Tech Stack
- Node.js + NestJS
- S3/R2 (storage)
- FFmpeg (video)
- Sharp (images)

// API Endpoints
POST   /api/media/upload
GET    /api/media/:id
DELETE /api/media/:id
POST   /api/media/process
```

---

## 💾 Database Architecture

### 1. Primary Database (PostgreSQL 16)

#### Schema Organization
```sql
-- Database per service (logical separation)
- user_service_db
- social_service_db
- course_service_db
- grade_service_db
- message_service_db

-- Shared database for cross-service data
- shared_db
  - schools
  - academic_years
  - system_settings
```

#### Multi-Tenant Strategy
```sql
-- Row-Level Security (RLS)
CREATE POLICY tenant_isolation ON students
FOR ALL TO app_user
USING (school_id = current_setting('app.current_school')::uuid);

-- Automatic filtering via Prisma extension
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        if (tenantId) {
          args.where = { ...args.where, schoolId: tenantId };
        }
        return query(args);
      },
    },
  },
});
```

#### Database Replication
```
Primary (Write) ─────┐
                     │
Read Replica 1 ──────┼──── Load Balancer ──── App Servers
Read Replica 2 ──────┤
Read Replica 3 ──────┘
```

#### Connection Pooling
```typescript
// PgBouncer configuration
max_connections = 100
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
pool_mode = transaction
```

### 2. Cache Layer (Redis 7)

#### Redis Cluster Setup
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Master 1  │────▶│   Replica 1  │────▶│  Replica 1b │
└─────────────┘     └─────────────┘     └─────────────┘
      ▲
      │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Master 2  │────▶│   Replica 2  │────▶│  Replica 2b │
└─────────────┘     └─────────────┘     └─────────────┘
      ▲
      │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Master 3  │────▶│   Replica 3  │────▶│  Replica 3b │
└─────────────┘     └─────────────┘     └─────────────┘
```

#### Caching Strategy
```typescript
// Cache patterns
- Cache-Aside (Lazy Loading)
- Write-Through
- Write-Behind

// Cache keys
user:{userId}                    // User profile
feed:{userId}:page:{n}           // News feed
course:{courseId}                // Course data
grades:{studentId}:{courseId}    // Grades
online:{userId}                  // Online status

// TTL (Time To Live)
- User profiles: 1 hour
- Feed: 5 minutes
- Static content: 24 hours
- Session data: 30 minutes
```

### 3. File Storage (S3/Cloudflare R2)

#### Storage Organization
```
bucket-name/
├── avatars/
│   └── {userId}/
│       └── {timestamp}.jpg
├── posts/
│   └── {postId}/
│       ├── image.jpg
│       └── video.mp4
├── courses/
│   └── {courseId}/
│       ├── lessons/
│       │   └── {lessonId}/
│       │       ├── video.mp4
│       │       └── transcript.vtt
│       └── attachments/
└── assignments/
    └── {assignmentId}/
        └── {studentId}/
            └── submission.pdf
```

#### CDN Integration
```
User Request → CloudFlare CDN → Origin (S3/R2)
                    ↓
                  Cache
                    ↓
            Subsequent Requests
```

### 4. Analytics Database (ClickHouse)

#### Time-Series Data
```sql
CREATE TABLE analytics.events (
    event_id UUID,
    user_id UUID,
    event_type String,
    event_data JSON,
    timestamp DateTime,
    school_id UUID
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (school_id, user_id, timestamp);
```

#### Use Cases
- User behavior tracking
- Course engagement metrics
- Performance analytics
- System monitoring

### 5. Search Database (Elasticsearch)

#### Index Structure
```json
{
  "users": {
    "mappings": {
      "properties": {
        "name": { "type": "text", "analyzer": "standard" },
        "bio": { "type": "text" },
        "school": { "type": "keyword" },
        "grade": { "type": "keyword" }
      }
    }
  },
  "posts": {
    "mappings": {
      "properties": {
        "content": { "type": "text", "analyzer": "standard" },
        "author": { "type": "keyword" },
        "hashtags": { "type": "keyword" },
        "created_at": { "type": "date" }
      }
    }
  }
}
```

---

## 🔄 Data Flow Patterns

### 1. Request Flow (Synchronous)
```
Client
  ↓
API Gateway
  ↓
Auth Middleware → JWT Validation
  ↓
Rate Limiter → Check limits
  ↓
Service Router → Route to microservice
  ↓
Microservice
  ↓
Check Cache → Redis
  ↓ (miss)
Database Query → PostgreSQL
  ↓
Update Cache → Redis
  ↓
Response → Client
```

### 2. Real-Time Flow (WebSocket)
```
Client
  ↓
WebSocket Connection → Socket.io
  ↓
Auth & Subscribe → Channels
  ↓
Event Published → Redis Pub/Sub
  ↓
All Connected Servers → Receive Event
  ↓
Broadcast to Clients → In Channel
```

### 3. Background Jobs (Asynchronous)
```
API Request
  ↓
Queue Job → Bull + Redis
  ↓
Worker Picks Job
  ↓
Process Task (email, video, etc.)
  ↓
Update Status in DB
  ↓
Notify Client (WebSocket/Push)
```

---

## 🔐 Security Architecture

### 1. Authentication Flow
```typescript
// JWT-based authentication
1. User logs in with credentials
2. Server validates and generates JWT
3. Client stores JWT (httpOnly cookie + localStorage)
4. Client includes JWT in all requests
5. Server validates JWT on each request

// JWT Structure
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "student",
  "schoolId": "school_id",
  "iat": 1234567890,
  "exp": 1234571490 // 1 hour
}

// Refresh Token Flow
1. Access token expires (1 hour)
2. Client uses refresh token (30 days)
3. Server issues new access token
4. Client continues with new token
```

### 2. Authorization (RBAC)
```typescript
// Roles
type Role =
  | 'student'
  | 'teacher'
  | 'admin'
  | 'school_admin'
  | 'super_admin';

// Permissions
const permissions = {
  student: ['read:courses', 'submit:assignments', 'write:posts'],
  teacher: ['read:students', 'grade:assignments', 'create:courses'],
  admin: ['manage:school', 'manage:users', 'view:analytics'],
};

// Middleware
function requirePermission(permission: string) {
  return (req, res, next) => {
    if (req.user.permissions.includes(permission)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  };
}
```

### 3. Data Encryption
```typescript
// At Rest
- Database: AES-256 encryption
- File storage: Server-side encryption (SSE)
- Backups: Encrypted with KMS

// In Transit
- HTTPS/TLS 1.3 everywhere
- WebSocket over TLS (wss://)
- Certificate pinning for mobile apps

// Sensitive Data
- Passwords: bcrypt (cost factor 12)
- PII: Field-level encryption
- Tokens: Signed with RSA-256
```

---

## 📊 Monitoring & Observability

### 1. Logging (ELK Stack)
```
Application Logs
      ↓
  Filebeat
      ↓
  Logstash (parsing, filtering)
      ↓
Elasticsearch (storage)
      ↓
  Kibana (visualization)
```

### 2. Metrics (Prometheus + Grafana)
```typescript
// Key Metrics
- Request rate (requests/second)
- Error rate (errors/total requests)
- Response time (p50, p95, p99)
- CPU usage
- Memory usage
- Database connections
- Cache hit rate
- Queue depth
```

### 3. Distributed Tracing (Jaeger)
```
User Request
      ↓
API Gateway [span-1]
      ↓
User Service [span-2]
      ↓
Database Query [span-3]
      ↓
Response

// Trace visualization shows:
- Request path
- Time spent in each service
- Bottlenecks
- Errors
```

### 4. Application Performance Monitoring (Sentry)
```typescript
// Error tracking
- JavaScript errors (frontend)
- Unhandled exceptions (backend)
- Performance issues
- User impact
- Stack traces

// Alerting
- Slack notifications
- PagerDuty incidents
- Email alerts
```

---

## 🚀 Deployment Strategy

### 1. CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test:
    - Run unit tests
    - Run integration tests
    - Check code coverage

  build:
    - Build Docker images
    - Push to registry

  deploy:
    - Update Kubernetes manifests
    - Apply rolling update
    - Health checks
    - Rollback if failed
```

### 2. Kubernetes Deployment
```yaml
# Deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: user-service
        image: registry/user-service:v1.0
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
```

### 3. Auto-Scaling
```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 📈 Performance Targets

### Response Times
- API endpoints: < 200ms (p95)
- Page load: < 2s (p95)
- Database queries: < 100ms (p95)
- Cache access: < 10ms (p95)

### Throughput
- API requests: 10,000 req/s
- WebSocket connections: 100,000 concurrent
- Database queries: 50,000 queries/s
- Message delivery: 5,000 messages/s

### Availability
- Overall uptime: 99.95%
- Planned maintenance: < 4 hours/year
- RTO (Recovery Time Objective): < 1 hour
- RPO (Recovery Point Objective): < 5 minutes

---

**Document Version**: 1.0
**Last Updated**: January 18, 2026
**Status**: Ready for Implementation
