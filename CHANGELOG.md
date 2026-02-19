# Changelog

All notable changes to Stunity Enterprise will be documented in this file.

## [2.8.0] - 2026-02-19

### Added — Brand Color Migration (Sky Blue) & Profile Screen Enhancements

#### Brand Color Migration: Amber → Sky Blue
- **Primary color system** migrated from amber/orange to sky blue/cyan
- **Color mapping**: `#F59E0B` → `#0EA5E9`, `#D97706` → `#0284C7`, `#FCD34D` → `#7DD3FC`
- **Theme config** (`theme.ts`) updated with full Tailwind Sky palette (50–900)
- **43+ files** updated across all screens and components
- **Semantic colors preserved**: Gold trophies, leaderboard ranks, and achievement badges kept their natural amber/gold appearance

#### Profile Screen Enhancements
- **Stats cards redesign** — Three individual mini-cards (Posts=purple, Followers=blue, Following=green) with pastel gradients, icon circles, and individual shadows
- **Blue hero card** — "Your Progress" card with sky blue gradient (`#38BDF8 → #0EA5E9 → #0284C7`), decorative floating circles, and 3 inline stats (Courses, Avg Grade, Study Time)
- **6 performance cards** — 2-column grid with light blue backgrounds: Courses, Avg Grade, Study Hours, Day Streak, Achievements, Projects (ready for backend integration)
- **Edit Profile button** — Compact pill with sky blue border + icon replacing full-width gradient button
- **Settings & camera icons** — Added to cover photo header for profile owners
- **Cover gradient** — Updated to sky blue tones (`#BAE6FD → #E0F2FE → #F0F9FF`)
- **QR code button** — Added to action buttons row

#### SubjectFilters Fix
- **History category** — Changed from colliding blue to distinct orange (`#FB923C`/`#C2410C`)
- **All category** — Updated to sky blue primary

### Changed
- **config/theme.ts** — Primary palette fully sky blue (was amber)
- **Avatar.tsx** — Gold gradient preset updated; default border color sky blue
- **Button.tsx** — Brand colors sky blue
- **Sidebar.tsx** — Menu accent colors sky blue
- **FeedScreen.tsx** — Quick action gradient, create card shadow, refresh spinner, new posts pill
- **LearnScreen.tsx** — Tab/category colors, path gradients, create course button
- **ClubsScreen.tsx** — FAB gradient, join button, filter pills
- **ClubDetailsScreen.tsx** — Action button shadow
- **CreateClubScreen.tsx** — Create button gradient
- **ProfileScreen.tsx** — Complete stats & performance section redesign + cover gradient
- **PollVoting.tsx** — Option 4 gradient corrected
- **CourseCard.tsx** — Gradient palette updated
- **CourseDetailScreen.tsx** — Header gradient updated
- **PostCard.tsx**, **PostCardSections.tsx**, **StoryCircles.tsx** — Accent colors
- **All auth screens** (Login, Register, Welcome) — Brand colors sky blue
- **All assignment screens** — Brand colors sky blue
- **NotificationsScreen.tsx**, **ConversationsScreen.tsx** — Brand colors sky blue
- **Create post forms** (Announcement, Question, Course, Quiz) — Brand colors sky blue

### Technical Details
- Files modified: 43+
- Brand color references replaced: 100+
- No new TypeScript errors introduced
- Design system: Sky Blue (#0EA5E9) primary, consistent across all screens
- Background: #F5F3FF (soft purple, unchanged)

---

## [2.7.0] - 2026-02-19

### Added - Mobile UI/UX Redesign (Indigo Design System)

#### Feed Screen Redesign
- **Performance Card** — Indigo gradient card replacing greeting bar with streak, XP, and completion stats
- **User Avatar** — Profile picture on the performance card (xl size, white ring border)
- **Featured Categories** — Circular icon grid replacing horizontal chip filters
- **Story Circles removal** — Removed stories feature and all related API calls
- **PostCard accent bar removal** — Cleaner card design without top colored bar
- **Post type badge** — Analytics-style metrics (⚡ XP + 📊 engagement) on right side

#### Poll Voting Redesign
- **Fully rounded pill buttons** (borderRadius: 24) with unique vibrant colors per option
- 6-color palette: indigo, pink, green, amber, blue, purple
- Gradient progress fill for voted results with highlighted borders
- Smooth fade-in animations for result transitions

#### Quick Action Buttons
- Replaced dead buttons (Study Buddy → **Quiz**, Challenge → **Poll**)
- All 4 buttons functional: Ask (QUESTION), Quiz (QUIZ), Poll (POLL), Resource (RESOURCE)
- Each navigates to CreatePost with pre-selected post type

#### Sidebar Menu Redesign
- **Gradient profile card** matching feed performance card (indigo gradient, centered avatar)
- Role badge pill (Student/Teacher/Admin) with icon
- **Colored icon circles** per menu item (amber, pink, indigo, emerald, gray, blue)
- **Clean logout** with confirmation Alert dialog
- App version text footer

#### Course Page Redesign
- **LearnScreen** — Indigo pill tabs, colored category circles, gradient learning path cards
- **CourseCard** — Indigo shadow tint, semantic level badges, colored stat icons, verified tick
- Learning paths rendered as vibrant gradient cards (indigo/pink/emerald) with CTA buttons

### Changed
- **FeedScreen.tsx** — Performance card, quick actions, stories removal, avatar integration
- **PostCard.tsx** — Type badge row with analytics metrics
- **PollVoting.tsx** — Complete pill redesign with per-option colors
- **SubjectFilters.tsx** — Circular icon grid
- **Sidebar.tsx** — Premium gradient profile card redesign
- **LearnScreen.tsx** — Full indigo design system
- **CourseCard.tsx** — Updated shadows, badges, stats, price colors

### Removed
- StoryCircles component and all story API calls from feed
- `handleFindStudyBuddy` and `handleDailyChallenge` dead handlers
- Random fake progress bar from CourseCard

### Technical Details
- Files modified: 9
- TypeScript compilation: ✅ No errors
- Design system: Indigo (#6366F1) primary, consistent across all screens

---

## [2.6.0] - 2026-02-19

### Added - Feed Architecture Optimization (33 changes, 6 phases)

#### Phase 1: Quick Wins (10K → 50K users)
- Replaced polling with AppState foreground refresh
- Batched view tracking (10s flush interval, 400K → 40K requests)
- Rate limiting (100 req/min) + body limit increase (5MB)
- Database connection pool (20 connections, 10s timeout)
- Database indexes on `Post.createdAt`, `PostView.postId`, `UserFeedSignal.userId`
- Redis cache TTL increase (5min)

#### Phase 2: Production Readiness (50K → 100K users)
- Multi-stage Dockerfile for Cloud Run deployment
- `.dockerignore` for optimized Docker builds
- Structured `/health` endpoint with DB + Redis checks
- Cursor-based pagination (O(1) vs O(N) for offset)
- `PostCardSections.tsx` — extracted PostCard sections for better rendering
- Resolved linting errors and type mismatches

#### Phase 3: Scale to 1M Users
- Response compression (gzip) via `compression` middleware
- `FeedRanker` batched queries using `$transaction`
- Graceful shutdown (SIGINT/SIGTERM drains connections)
- `fields=minimal` query param (~76% smaller feed payloads)
- ETag caching for 304 Not Modified responses

#### Phase 4: Frontend Performance Hardening
- Image prefetching (`Image.prefetch()`) for smooth scrolling
- CDN URL helper (`cdnUrl.ts`) for resized media
- FlashList `getItemType` for cell recycling by post type
- Stable `renderItem` closure (eliminated re-creation churn)

#### Phase 5: Backend Architecture
- **Route split**: `index.ts` 3,939 → 235 lines (94% reduction)
  - 9 route modules: posts, postActions, quiz, analytics, profile, skills, experience, achievements, signals
  - Shared `context.ts` for Prisma, FeedRanker, multer singletons
- **Batch `trackAction`**: N+1 sequential upserts → single `$transaction`
- **Pre-computed feed cache**: Background worker pre-ranks feeds for top 100 active users (Redis, 5min TTL)
- **Read replica**: `prismaRead` client ready for `DATABASE_READ_URL`

#### Phase 6: Frontend Resilience
- **Offline feed cache**: AsyncStorage-based cache of last 20 posts for instant cold-start
- **Stale-while-revalidate**: Serve cached feed instantly, refresh in background
- **Memory pressure**: iOS `memoryWarning` listener trims posts 50 → 20
- **CI/CD pipeline**: GitHub Actions → Docker build → Cloud Run deploy (`deploy-feed.yml`)

### Changed
- **feed-service** — Complete modular route architecture (v6 → v7)
- **feedStore.ts** — Offline cache + stale-while-revalidate + image prefetch + `fields=minimal`
- **FeedScreen.tsx** — Memory pressure + FlashList `getItemType` + stable renderItem
- **feedRanker.ts** — Batched `trackAction` + refreshPostScores via `$transaction`

### Technical Details
- Backend files: 12 new, 4 modified
- Frontend files: 4 new, 4 modified
- TypeScript compilation: ✅ No errors
- All 15 services running successfully

---


## [2.5.0] - 2026-02-10

### Added - Professional Mobile UI/UX

#### Fullscreen Sidebar Navigation
- **Instagram-style fullscreen sidebar** (100% width, no backdrop)
- Enhanced sizing: 24px padding, 44x44 icons, 20px profile name
- Professional enterprise styling (#111827, #374151, #6B7280)
- Gradient logout button (red gradient with confirmation)
- Better touch targets (56px minimum)
- Smooth slide animation (right-to-left)
- Replaces 85% width overlay design

**Rationale:** Fullscreen design better suits enterprise school management features and provides cleaner, more focused navigation experience.

#### Avatar Gradient Redesign
- **12 beautiful light gradient colors** for post/feed/comment avatars
- **No borders** on post variant (cleaner appearance)
- **Deterministic color selection** based on name (consistent per user)
- **Profile page avatars unchanged** (kept gradient borders)
- Colors: light red/rose, blue, yellow, green, pink, indigo, orange, purple, sky, rose, lime, amber
- Enhanced text color (#374151) for better readability
- Variant system: 'default', 'post', 'profile'

**Files Updated:**
- `Avatar.tsx` - Added variant prop and getPostGradientColors()
- `PostCard.tsx` - Uses variant="post"
- `CreatePostScreen.tsx` - Uses variant="post"
- `FeedScreen.tsx` - Uses variant="post"
- `CommentSection.tsx` - Uses variant="post"

#### Logout Functionality
- **POST /auth/logout endpoint** added to Auth Service v2.4
- Proper 200 success response with message
- Client-side token clearing (localStorage/AsyncStorage)
- Fixed 404 error on logout button click

**Auth Service v2.4:**
- Port 3001
- Endpoint: `POST /auth/logout`
- Returns: `{ message: "Logged out successfully" }`

#### Documentation
- `FULLSCREEN_SIDEBAR_UPDATE.md` (7.5KB) - Sidebar redesign details
- `SIDEBAR_LOGOUT_FIX.md` (6.2KB) - Logout implementation
- `AVATAR_GRADIENT_REDESIGN.md` (7.1KB) - Avatar system specs

### Changed
- **Sidebar.tsx** - Redesigned from 85% overlay to 100% fullscreen
- **Avatar.tsx** - Added variant system with 12 light gradients
- **Auth Service** - Version 2.3 → 2.4 (logout endpoint)

### Technical Details
- Mobile UI components: 6 files modified
- Backend services: 1 file modified
- Lines of code: ~200 added
- TypeScript compilation: ✅ No errors
- Git commits: 5

---

## [2.4.0] - 2026-02-10

### Added - Claim Code & ID Generation System

#### Database & Core
- **ID Generation System** with 3 formats (STRUCTURED, SIMPLIFIED, HYBRID)
- **ClaimCode model** with verification data, expiration, and revocation support
- **IdGenerationLog model** for audit trail
- Luhn check digit algorithm for ID validation
- Support for Cambodia/ASEAN student ID standards
- New enums: `IdFormat`, `ClaimCodeType`, `AccountType`

#### Backend Services
- **Auth Service v2.3** - 4 new claim code endpoints:
  - `POST /auth/claim-codes/validate` - Validate claim code
  - `POST /auth/claim-codes/link` - Link code to existing account
  - `POST /auth/register/with-claim-code` - Register with code
  - `POST /auth/login/claim-code` - First-time login with code

- **School Service v2.4** - 5 new claim code management endpoints:
  - `POST /schools/:id/claim-codes/generate` - Generate codes (bulk/specific)
  - `GET /schools/:id/claim-codes` - List codes with filtering
  - `GET /schools/:id/claim-codes/:codeId` - Get code details
  - `GET /schools/:id/claim-codes/export` - Export as CSV
  - `POST /schools/:id/claim-codes/:codeId/revoke` - Revoke code

- **Student Service** - Integrated ID generation:
  - Automatic student ID generation on creation
  - Configurable format per school (STRUCTURED/SIMPLIFIED/HYBRID)
  - Permanent UUID-based IDs
  - Generation metadata logging

- **Teacher Service** - Integrated ID generation:
  - Automatic teacher ID generation on creation
  - Same format options as students
  - Permanent UUID-based IDs
  - Generation metadata logging

#### Mobile App
- **RegisterScreen** - Claim code integration:
  - "I have a school claim code" toggle
  - Claim code input with auto-uppercase
  - Real-time validation with API
  - Success card showing school/student info
  - Auto-fill organization from validated code
  - Auto-select role based on code type (STUDENT/TEACHER)
  - Professional UI with yellow toggle, blue validate button, green success card

#### Utilities
- `ClaimCodeGenerator` - Cryptographic code generation
  - Format: `TYPE-XXXX-XXXX` (e.g., STNT-AB12-CD34)
  - Removes ambiguous characters (0, O, 1, I)
  - Configurable expiration (default 365 days)
  - Verification data support

- `IdGenerator` - Flexible student/teacher ID generation
  - STRUCTURED format: `GSYY-SSCCC-NNNN-C` with full demographics
  - SIMPLIFIED format: `S-XXXXXX-C` for privacy compliance
  - HYBRID format: `SYYL-NNNNNN-C` balanced approach
  - Thread-safe sequential numbering

#### Documentation
- `CLAIM_CODE_API_IMPLEMENTATION.md` (21KB) - Complete API reference
- `STUDENT_TEACHER_ID_SYSTEM.md` (30KB) - ID system specifications
- `SOCIAL_SCHOOL_INTEGRATION_WORKFLOW.md` (30KB) - Workflow design
- `MOBILE_INTEGRATION_COMPLETE.md` (8KB) - Mobile integration guide

#### Testing
- Comprehensive integration test script (`test-claim-codes.sh`)
- Simple API test script (`simple-test-claim-codes.sh`)
- Service health checks
- End-to-end workflow testing

### Changed
- **User model** - Added account type fields:
  - `accountType` (SOCIAL_ONLY, SCHOOL_ONLY, HYBRID)
  - `organizationCode`, `organizationName`, `organizationType`
  - `socialFeaturesEnabled`, `privacySettings`
  - SSO fields: `ssoProvider`, `ssoId`, `ssoAccessToken`

- **School model** - Added ID generation configuration:
  - `idFormat` (STRUCTURED, SIMPLIFIED, HYBRID)
  - `idPrefix` for school identification
  - `nextStudentNumber`, `nextTeacherNumber` for sequencing
  - `countryCode`, `regionCode` for regional customization

- **Student model** - Added ID fields:
  - `permanentId` (UUID-based, immutable)
  - `studentIdFormat`, `studentIdMeta`
  - `entryYear` for cohort tracking

- **Teacher model** - Added ID fields:
  - `permanentId` (UUID-based, immutable)
  - `teacherIdFormat`, `teacherIdMeta`
  - `hireYear` for tenure tracking

### Database Migration
- Migration: `20260210131804_add_id_and_claim_code_systems`
- All tables created successfully
- Indexes added for performance
- Foreign key relationships established

### Technical Details
- Total implementation: 21.5 hours
- Backend endpoints: 9 (4 auth + 5 school)
- Mobile code added: ~300 lines
- Test scripts: 2
- Documentation: 4 major files
- TypeScript compilation: ✅ No errors

---

## [2.3.0] - 2026-02-09

### Added - Enterprise Mobile Auth UI
- Professional authentication screens (Welcome, Login, Register)
- Enterprise SSO button
- Organization selection in registration
- Compliance checkboxes (Terms, Privacy, FERPA/GDPR)
- Fully rounded design system (28-30px border radius)
- Enhanced visual design with shadows and gradients

See: `ENHANCED_AUTH_DESIGN.md`, `DESIGN_CONSISTENCY_UPDATE.md`

---

## [2.2.0] - 2026-01-15

### Added
- Multi-tenant school management system
- Academic year comprehensive management
- Attendance tracking system
- Grade management with confirmation workflow
- Parent portal with student lookup

### Changed
- Upgraded to Prisma 5.x
- Enhanced database schema
- Improved API error handling

---

## [2.1.0] - 2025-12-10

### Added
- Social feed system
- User profiles with connections
- Post creation and interaction
- Like and comment system

---

## [2.0.0] - 2025-11-01

### Added
- Initial release of Stunity Enterprise
- 12 microservices architecture
- PostgreSQL database with Prisma ORM
- React Native mobile app
- Authentication system
- School registration

---

## Version History Summary

- **v2.8.0** (2026-02-19): Brand Color Migration (Sky Blue) & Profile Enhancements ✅
- **v2.7.0** (2026-02-19): Mobile UI/UX Redesign — Indigo Design System ✅
- **v2.6.0** (2026-02-19): Feed Architecture Optimization (6 phases, 33 changes) ✅
- **v2.5.0** (2026-02-10): Professional Mobile UI/UX ✅
- **v2.4.0** (2026-02-10): Claim Code & ID Generation System ✅
- **v2.3.0** (2026-02-09): Enterprise Mobile Auth UI
- **v2.2.0** (2026-01-15): Multi-tenant School Management
- **v2.1.0** (2025-12-10): Social Feed System
- **v2.0.0** (2025-11-01): Initial Release
