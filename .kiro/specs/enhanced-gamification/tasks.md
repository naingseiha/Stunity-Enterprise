# Implementation Plan: Enhanced Gamification

## Overview

This implementation plan breaks down the Enhanced Gamification feature into actionable coding tasks across a 15-week timeline. The feature expands Stunity Enterprise's gamification system with achievement categories, daily/weekly challenges, virtual currency, team challenges, multi-category leaderboards, and deep academic integration. Implementation uses TypeScript with the existing microservices architecture (analytics-service as primary orchestrator), PostgreSQL/Supabase backend, React Native mobile app, and Next.js web app.

## Implementation Approach

- Incremental development with validation at each phase
- Property-based testing for 15 correctness properties using fast-check
- Real-time updates via Supabase Realtime
- Platform parity between mobile and web
- Performance targets: <100ms response time (p95), 10k+ concurrent users

## Tasks

- [ ] 1. Phase 1: Foundation - Database Schema and Core Services (Weeks 1-2)
  - [ ] 1.1 Create database schema migration for gamification models
    - Create Prisma schema extensions in `packages/database/prisma/schema.prisma`
    - Add enums: AchievementCategory, AchievementTier, ChallengeType, ChallengeDifficulty, ChallengeStatus, TransactionType, UnlockableType, TeamChallengeStatus, LeaderboardCategory, LeaderboardScope, LeaderboardPeriod, MilestoneType
    - Add models: GamificationAchievement, UserAchievementProgress, Challenge, ChallengeTemplate, VirtualCurrency, VirtualCurrencyTransaction, Unlockable, UserUnlockable, TeamChallenge, TeamChallengeParticipant, Leaderboard, AttendanceStreak, MilestoneEvent
    - Add User model extensions for gamification relations and settings
    - Add database indexes for performance (see design document performance section)
    - Add check constraint: `balance >= 0` on virtual_currency table
    - Generate Prisma client and run migration
    - _Requirements: REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-9, REQ-21, REQ-22_

  - [ ] 1.2 Implement Virtual Currency Service with transaction safety
    - Create `services/analytics-service/src/gamification/currency/currency.service.ts`
    - Implement `initializeAccount(userId)` - create currency record for new users
    - Implement `getBalance(userId)` - retrieve current balance with caching
    - Implement `credit(userId, amount, source, sourceId)` - add currency with transaction logging
    - Implement `debit(userId, amount, source, sourceId)` - deduct currency with balance validation
    - Implement `getTransactionHistory(userId, filters, pagination)` - retrieve transaction log
    - Use Prisma transactions for all currency operations to ensure ACID properties
    - Implement row-level locking for concurrent transaction safety
    - Add Redis caching for balance queries (10 second TTL)
    - _Requirements: REQ-5.1, REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-22.1, REQ-22.7_

  - [ ]* 1.3 Write property test for Virtual Currency Balance Invariant
    - **Property 1: Virtual Currency Balance Invariant**
    - **Validates: Requirements REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.6, REQ-22.7**
    - Create `services/analytics-service/src/gamification/currency/currency.service.property.test.ts`
    - Use fast-check to generate random sequences of credit/debit transactions
    - Verify balance = sum(credits) - sum(debits) after all transactions
    - Verify balance is never negative
    - Run minimum 100 iterations per test
    - _Requirements: PROP-1_

  - [ ]* 1.4 Write unit tests for Currency Service
    - Test insufficient balance rejection
    - Test negative amount rejection
    - Test transaction logging completeness
    - Test concurrent transaction handling
    - Test cache invalidation on balance change
    - _Requirements: REQ-5.3, REQ-5.4, REQ-5.5_

  - [ ] 1.5 Implement Achievement Evaluation Engine
    - Create `services/analytics-service/src/gamification/achievements/achievement.service.ts`
    - Implement `evaluateCriteria(userId, achievement)` - check if user meets achievement criteria
    - Support criteria types: grade, attendance, social, challenge, composite
    - Support operators: gte, lte, eq, gt, lt
    - Implement `unlockAchievement(userId, achievementId)` - idempotent unlock with rewards
    - Implement `getUserAchievements(userId, filters)` - retrieve user's achievements with progress
    - Implement `getAchievementProgress(userId, achievementId)` - get progress toward specific achievement
    - Use Prisma transactions for unlock operations
    - Implement optimistic locking to prevent duplicate unlocks
    - Award XP and currency rewards on unlock
    - _Requirements: REQ-1, REQ-2, REQ-10, REQ-22.2, REQ-22.5_

  - [ ]* 1.6 Write property test for Achievement Unlock Idempotence
    - **Property 2: Achievement Unlock Idempotence**
    - **Validates: Requirements REQ-22.5**
    - Create `services/analytics-service/src/gamification/achievements/achievement.service.property.test.ts`
    - Use fast-check to generate random unlock sequences (including duplicate unlock attempts)
    - Verify unlocking same achievement multiple times results in same state as unlocking once
    - Verify rewards are awarded exactly once
    - Run minimum 100 iterations per test
    - _Requirements: PROP-2_

  - [ ]* 1.7 Write unit tests for Achievement Service
    - Test grade-based achievement criteria evaluation
    - Test attendance-based achievement criteria evaluation
    - Test social-based achievement criteria evaluation
    - Test composite criteria with AND/OR operators
    - Test achievement tier progression (Bronze → Silver → Gold → Platinum)
    - Test XP reward scaling by tier (1x, 2x, 3x, 5x)
    - Test duplicate unlock prevention
    - _Requirements: REQ-1, REQ-2, REQ-10, REQ-22.5_

  - [ ] 1.8 Create core API endpoints for currency and achievements
    - Create `services/analytics-service/src/gamification/routes/currency.routes.ts`
    - Implement `GET /api/v1/gamification/currency` - get user balance and recent transactions
    - Implement `GET /api/v1/gamification/currency/transactions` - get paginated transaction history
    - Create `services/analytics-service/src/gamification/routes/achievements.routes.ts`
    - Implement `GET /api/v1/gamification/achievements` - get achievements with filters (category, tier, unlocked)
    - Implement `GET /api/v1/gamification/achievements/:id` - get single achievement with progress
    - Implement `GET /api/v1/gamification/achievements/categories` - get achievement counts by category
    - Add JWT authentication middleware to all endpoints
    - Add request validation using Zod schemas
    - Add rate limiting (100 requests/minute per user)
    - _Requirements: REQ-1, REQ-5, REQ-21.6_

  - [ ] 1.9 Checkpoint - Verify foundation services
    - Ensure all tests pass (unit and property tests)
    - Verify database migrations applied successfully
    - Test API endpoints with Postman/Insomnia
    - Verify currency transactions maintain balance invariant
    - Verify achievement unlocks are idempotent
    - Ask the user if questions arise


- [ ] 2. Phase 2: Challenge System (Weeks 3-4)
  - [ ] 2.1 Implement Challenge Template System
    - Create `services/analytics-service/src/gamification/challenges/challenge-template.service.ts`
    - Implement `createTemplate(templateData)` - create reusable challenge template
    - Implement `getTemplates(filters)` - retrieve templates by type, difficulty, grade level
    - Implement `getActiveTemplates(userId)` - get templates appropriate for user (grade level, activity history)
    - Support template parameters: targetValueMin/Max, currencyRewardMin/Max, xpRewardMin/Max
    - Support seasonal templates with activation dates
    - Implement template selection weighting based on user completion history
    - _Requirements: REQ-18.1, REQ-18.2, REQ-18.3, REQ-18.5_

  - [ ] 2.2 Implement Challenge Service with progress tracking
    - Create `services/analytics-service/src/gamification/challenges/challenge.service.ts`
    - Implement `generateDailyChallenges(userId)` - create 3 daily challenges from templates
    - Implement `generateWeeklyChallenges(userId)` - create 5 weekly challenges from templates
    - Implement `updateProgress(challengeId, userId, increment)` - increment challenge progress
    - Implement `completeChallenge(challengeId, userId)` - mark complete and award rewards
    - Implement `getUserChallenges(userId, type, status)` - retrieve user's challenges
    - Implement `expireChallenges()` - batch expire challenges past deadline
    - Track daily and weekly completion streaks
    - Award streak bonuses (daily: 50 coins for all 3, weekly: 1000 coins for all 5)
    - Prevent duplicate challenge types in same period
    - _Requirements: REQ-3, REQ-4, REQ-18.4_

  - [ ]* 2.3 Write property test for Challenge Progress Monotonicity
    - **Property 4: Challenge Progress Monotonicity**
    - **Validates: Requirements REQ-3.5, REQ-4.5**
    - Create `services/analytics-service/src/gamification/challenges/challenge.service.property.test.ts`
    - Use fast-check to generate random sequences of progress updates
    - Verify progress never decreases unless challenge is reset/expired
    - Verify each update maintains or increases progress
    - Run minimum 100 iterations per test
    - _Requirements: PROP-4_

  - [ ]* 2.4 Write property test for Challenge Expiry Timing
    - **Property 11: Challenge Expiry Timing**
    - **Validates: Requirements REQ-3.3, REQ-3.7, REQ-4.3**
    - Verify daily challenges expire exactly 24 hours after creation
    - Verify weekly challenges expire exactly 7 days after creation
    - Verify all active challenges have expiresAt > now
    - Run minimum 100 iterations per test
    - _Requirements: PROP-11_

  - [ ]* 2.5 Write unit tests for Challenge Service
    - Test daily challenge generation creates exactly 3 challenges
    - Test weekly challenge generation creates exactly 5 challenges
    - Test challenge completion awards correct currency amount
    - Test streak bonus calculation (daily and weekly)
    - Test challenge expiry after deadline
    - Test duplicate challenge type prevention
    - Test difficulty-based reward scaling (Easy: 100, Medium: 250, Hard: 500)
    - _Requirements: REQ-3, REQ-4_

  - [ ] 2.6 Create Challenge API endpoints
    - Create `services/analytics-service/src/gamification/routes/challenges.routes.ts`
    - Implement `GET /api/v1/gamification/challenges` - get user challenges with filters (type, status)
    - Implement `POST /api/v1/gamification/challenges/:id/progress` - update challenge progress
    - Implement `GET /api/v1/gamification/challenges/available` - get available challenge templates
    - Add request validation (progress increment: 1-1000)
    - Add rate limiting (100 requests/minute per user)
    - Return streak information with challenge list
    - _Requirements: REQ-3, REQ-4_

  - [ ] 2.7 Implement background jobs for challenge generation and expiry
    - Create `services/analytics-service/src/gamification/jobs/challenge-generation.job.ts`
    - Implement daily challenge generation job (runs at 00:00 UTC)
    - Implement weekly challenge generation job (runs Monday 00:00 UTC)
    - Process users in batches of 1000 for scalability
    - Create `services/analytics-service/src/gamification/jobs/challenge-expiry.job.ts`
    - Implement challenge expiry job (runs hourly)
    - Update expired challenges to EXPIRED status
    - Configure Cloud Scheduler to trigger jobs
    - Log generation and expiry metrics
    - _Requirements: REQ-3.1, REQ-3.3, REQ-4.1, REQ-4.3, REQ-21.5_

  - [ ]* 2.8 Write property test for Challenge Generation Uniqueness
    - **Property 11: Challenge Generation Uniqueness**
    - **Validates: Requirements REQ-18.4**
    - Verify no two active challenges for same user have same template type
    - Use fast-check to generate multiple challenge generation cycles
    - Run minimum 100 iterations per test
    - _Requirements: PROP-11_

  - [ ] 2.9 Checkpoint - Verify challenge system
    - Ensure all tests pass (unit and property tests)
    - Test challenge generation jobs manually
    - Verify challenge progress updates correctly
    - Verify challenge completion awards rewards
    - Verify streak bonuses calculated correctly
    - Verify challenges expire after deadline
    - Ask the user if questions arise


- [ ] 3. Phase 3: Leaderboard System (Week 5)
  - [ ] 3.1 Implement Leaderboard Calculation Service
    - Create `services/analytics-service/src/gamification/leaderboards/leaderboard.service.ts`
    - Implement `calculateLeaderboard(category, scope, timePeriod)` - compute rankings
    - Support categories: TOTAL_XP, ACADEMIC_PERFORMANCE, SOCIAL_ENGAGEMENT, ATTENDANCE_RATE, CHALLENGE_COMPLETION
    - Support scopes: SCHOOL_WIDE, GRADE_LEVEL, CLASS_SPECIFIC
    - Support time periods: ALL_TIME, MONTHLY, WEEKLY, DAILY
    - Implement rank calculation with tie handling (tied users get same rank, skip subsequent ranks)
    - Implement `getUserRank(userId, category, scope, timePeriod)` - get user's position
    - Implement `getLeaderboardEntries(category, scope, timePeriod, pagination)` - get ranked list
    - Respect user privacy settings (exclude PRIVATE profiles from public leaderboards)
    - Use cursor-based pagination for large result sets
    - _Requirements: REQ-7, REQ-8, REQ-25.1, REQ-25.2_

  - [ ]* 3.2 Write property test for Leaderboard Ranking Consistency
    - **Property 3: Leaderboard Ranking Consistency with Ties**
    - **Validates: Requirements REQ-7.2, REQ-7.6, REQ-7.7**
    - Create `services/analytics-service/src/gamification/leaderboards/leaderboard.service.property.test.ts`
    - Use fast-check to generate random user scores
    - Verify if user A score > user B score, then rank A < rank B
    - Verify tied scores get same rank
    - Verify next rank after tie skips appropriately (e.g., 1, 2, 2, 4, 5)
    - Run minimum 100 iterations per test
    - _Requirements: PROP-3_

  - [ ]* 3.3 Write property test for Time Period Leaderboard Boundaries
    - **Property 8: Time Period Leaderboard Boundaries**
    - **Validates: Requirements REQ-8.2, REQ-8.3, REQ-8.4, REQ-8.5**
    - Verify all data points in time-period leaderboard fall within start/end timestamps
    - Use fast-check to generate random timestamps and leaderboard periods
    - Run minimum 100 iterations per test
    - _Requirements: PROP-8_

  - [ ]* 3.4 Write unit tests for Leaderboard Service
    - Test leaderboard calculation for each category
    - Test scope filtering (school-wide, grade-level, class-specific)
    - Test time period filtering (all-time, monthly, weekly, daily)
    - Test tie-breaking scenarios (2 users tied for rank 2, next is rank 4)
    - Test privacy filtering (exclude PRIVATE profiles)
    - Test pagination with cursor
    - _Requirements: REQ-7, REQ-8, REQ-25_

  - [ ] 3.5 Implement leaderboard caching with Redis
    - Add Redis caching layer for leaderboard queries
    - Cache key format: `leaderboard:{category}:{scope}:{timePeriod}:{periodStart}`
    - Set TTL to 60 seconds for cached leaderboards
    - Invalidate cache on XP changes affecting rankings
    - Implement cache warming for popular leaderboards
    - Monitor cache hit rate (target: >80%)
    - _Requirements: REQ-21.4_

  - [ ] 3.6 Implement real-time leaderboard updates via Supabase
    - Create Supabase Realtime channels for leaderboards
    - Channel format: `leaderboard:{category}:{scope}:{timePeriod}`
    - Publish `rank_change` events when user rank changes
    - Publish `new_leader` events when top position changes
    - Include payload: userId, oldRank, newRank, value
    - Implement event batching (500ms window) to prevent thrashing
    - _Requirements: REQ-7.5, REQ-17.1, REQ-17.2_

  - [ ] 3.7 Create Leaderboard API endpoints
    - Create `services/analytics-service/src/gamification/routes/leaderboards.routes.ts`
    - Implement `GET /api/v1/gamification/leaderboards/:category` - get ranked list with user position
    - Implement `GET /api/v1/gamification/leaderboards/user/:userId` - get user ranks across categories
    - Implement `GET /api/v1/gamification/leaderboards/archived` - get historical leaderboard data
    - Add query params: scope, timePeriod, page, limit
    - Add rate limiting (60 requests/minute per user)
    - Return user's rank and entry highlighted in response
    - _Requirements: REQ-7, REQ-8_

  - [ ] 3.8 Implement leaderboard reset and archival jobs
    - Create `services/analytics-service/src/gamification/jobs/leaderboard-reset.job.ts`
    - Implement daily reset job (runs at 00:00 UTC)
    - Implement weekly reset job (runs Monday 00:00 UTC)
    - Implement monthly reset job (runs 1st of month 00:00 UTC)
    - Archive current leaderboard before reset
    - Calculate final ranks and award top performer bonuses (top 10 get bonus currency)
    - Reset period-specific counters
    - Publish leaderboard reset events
    - Configure Cloud Scheduler to trigger jobs
    - _Requirements: REQ-8.2, REQ-8.3, REQ-8.4, REQ-8.5_

  - [ ] 3.9 Checkpoint - Verify leaderboard system
    - Ensure all tests pass (unit and property tests)
    - Test leaderboard calculation for all categories
    - Verify tie-breaking works correctly
    - Verify caching improves performance
    - Verify real-time updates publish correctly
    - Test leaderboard reset and archival
    - Ask the user if questions arise


- [ ] 4. Phase 4: Team Challenge System (Week 6)
  - [ ] 4.1 Implement Team Challenge Service
    - Create `services/analytics-service/src/gamification/team-challenges/team-challenge.service.ts`
    - Implement `createTeamChallenge(creatorId, name, description, targetValue, deadline, participantIds)` - create team challenge
    - Validate participant count (2-50 participants)
    - Implement `contribute(challengeId, userId, amount)` - add user contribution
    - Implement `getTeamChallenge(challengeId)` - get challenge with participant breakdown
    - Implement `getUserTeamChallenges(userId, status)` - get user's team challenges
    - Implement `completeTeamChallenge(challengeId)` - mark complete and distribute rewards
    - Calculate proportional rewards based on contribution percentage
    - Track individual contributions and team total progress
    - _Requirements: REQ-9.1, REQ-9.2, REQ-9.3, REQ-9.5_

  - [ ]* 4.2 Write property test for Team Challenge Contribution Sum
    - **Property 5: Team Challenge Contribution Sum**
    - **Validates: Requirements REQ-9.3, REQ-9.4, REQ-9.7**
    - Create `services/analytics-service/src/gamification/team-challenges/team-challenge.service.property.test.ts`
    - Use fast-check to generate random team sizes and contribution sequences
    - Verify sum of individual contributions equals total team progress
    - Run minimum 100 iterations per test
    - _Requirements: PROP-5_

  - [ ]* 4.3 Write property test for Team Size Constraints
    - **Property 14: Team Size Constraints**
    - **Validates: Requirements REQ-9.1**
    - Verify team creation fails with <2 or >50 participants
    - Verify team creation succeeds with 2-50 participants
    - Use fast-check to generate random participant counts
    - Run minimum 100 iterations per test
    - _Requirements: PROP-14_

  - [ ]* 4.4 Write property test for Proportional Reward Distribution
    - **Property 15: Proportional Reward Distribution**
    - **Validates: Requirements REQ-9.5, REQ-9.6**
    - Verify each participant's reward = (totalReward × contributionPercentage / 100)
    - Verify sum of contribution percentages = 100%
    - Use fast-check to generate random contributions and total rewards
    - Run minimum 100 iterations per test
    - _Requirements: PROP-15_

  - [ ]* 4.5 Write unit tests for Team Challenge Service
    - Test team creation with valid participant count (2, 25, 50)
    - Test team creation rejection with invalid count (1, 51)
    - Test contribution tracking per participant
    - Test total progress calculation
    - Test proportional reward distribution
    - Test completion detection when target reached
    - _Requirements: REQ-9_

  - [ ] 4.6 Implement real-time team challenge updates
    - Create Supabase Realtime channels for team challenges
    - Channel format: `team_challenge:{challengeId}`
    - Publish `progress_update` events when any member contributes
    - Publish `challenge_completed` event when target reached
    - Publish `member_joined` event when participant added
    - Include payload: userId, contribution, totalProgress, percentage
    - Implement event batching to prevent excessive updates
    - _Requirements: REQ-9.4, REQ-17.1, REQ-17.2_

  - [ ] 4.7 Create Team Challenge API endpoints
    - Create `services/analytics-service/src/gamification/routes/team-challenges.routes.ts`
    - Implement `POST /api/v1/gamification/team-challenges` - create team challenge
    - Implement `GET /api/v1/gamification/team-challenges/:id` - get challenge with participant breakdown
    - Implement `POST /api/v1/gamification/team-challenges/:id/contribute` - add contribution
    - Implement `GET /api/v1/gamification/team-challenges` - get user's team challenges
    - Add request validation (name: 3-100 chars, description: 10-500 chars, targetValue: 1-1000000, participants: 2-50)
    - Add rate limiting (50 requests/minute per user)
    - _Requirements: REQ-9_

  - [ ] 4.8 Implement team challenge progress sync job
    - Create `services/analytics-service/src/gamification/jobs/team-challenge-sync.job.ts`
    - Run every 15 minutes to reconcile team progress
    - Sum participant contributions and update total progress
    - Check for completed challenges and award rewards
    - Publish progress updates to real-time channels
    - Handle edge cases (concurrent contributions)
    - _Requirements: REQ-9.4, REQ-22.6_

  - [ ] 4.9 Checkpoint - Verify team challenge system
    - Ensure all tests pass (unit and property tests)
    - Test team creation with various participant counts
    - Verify contributions update team progress correctly
    - Verify proportional rewards calculated correctly
    - Verify real-time updates work for all participants
    - Test team challenge completion flow
    - Ask the user if questions arise


- [ ] 5. Phase 5: Unlockables and Shop System (Week 7)
  - [ ] 5.1 Implement Unlockable Catalog Service
    - Create `services/analytics-service/src/gamification/unlockables/unlockable.service.ts`
    - Implement `createUnlockable(unlockableData)` - create catalog item
    - Support types: AVATAR, THEME, BADGE_FRAME, PROFILE_EFFECT
    - Implement `getUnlockables(filters)` - retrieve catalog with ownership status
    - Implement `getUserUnlockables(userId)` - get user's owned items
    - Implement `purchaseUnlockable(userId, unlockableId)` - execute purchase transaction
    - Implement `equipUnlockable(userId, unlockableId)` - mark item as equipped
    - Validate sufficient balance before purchase
    - Validate required achievement if specified
    - Prevent duplicate purchases
    - Use Prisma transactions for purchase flow
    - _Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6_

  - [ ]* 5.2 Write property test for Unlockable Purchase Validation
    - **Property 12: Unlockable Purchase Validation**
    - **Validates: Requirements REQ-6.2, REQ-6.3, REQ-6.6**
    - Create `services/analytics-service/src/gamification/unlockables/unlockable.service.property.test.ts`
    - Use fast-check to generate random purchase scenarios (various balances, costs, achievement states)
    - Verify purchase succeeds only if balance >= cost AND (no achievement required OR achievement unlocked)
    - Verify balance after purchase = balance before - cost
    - Run minimum 100 iterations per test
    - _Requirements: PROP-12_

  - [ ]* 5.3 Write property test for Unlockable Ownership Subset
    - **Property 13 (partial): Achievement Category Partitioning**
    - **Validates: Requirements REQ-6.7**
    - Verify owned unlockables ⊆ available unlockables for all users
    - Use fast-check to generate random purchase sequences
    - Run minimum 100 iterations per test
    - _Requirements: PROP-13_

  - [ ]* 5.4 Write unit tests for Unlockable Service
    - Test purchase with sufficient balance succeeds
    - Test purchase with insufficient balance fails
    - Test purchase with required achievement locked fails
    - Test purchase with required achievement unlocked succeeds
    - Test duplicate purchase prevention
    - Test equip/unequip functionality
    - Test catalog filtering by type and ownership
    - _Requirements: REQ-6_

  - [ ] 5.5 Create Unlockable API endpoints
    - Create `services/analytics-service/src/gamification/routes/unlockables.routes.ts`
    - Implement `GET /api/v1/gamification/unlockables` - get catalog with filters (type, owned, available)
    - Implement `POST /api/v1/gamification/unlockables/:id/purchase` - purchase item
    - Implement `POST /api/v1/gamification/unlockables/:id/equip` - equip item
    - Add rate limiting (10 purchases/minute per user)
    - Return user balance with catalog response
    - _Requirements: REQ-6_

  - [ ] 5.6 Implement unlockable metadata handling
    - Create type-specific metadata interfaces (AvatarMetadata, ThemeMetadata, BadgeFrameMetadata, ProfileEffectMetadata)
    - Implement metadata validation for each unlockable type
    - Store metadata as JSON in unlockable.metadata field
    - Implement preview URL generation for themes and avatars
    - _Requirements: REQ-6.1_

  - [ ] 5.7 Checkpoint - Verify unlockables system
    - Ensure all tests pass (unit and property tests)
    - Test purchase flow with various balance scenarios
    - Verify achievement-gated unlockables work correctly
    - Verify duplicate purchase prevention
    - Test equip/unequip functionality
    - Ask the user if questions arise


- [ ] 6. Phase 6: Academic and Attendance Integration (Week 7)
  - [ ] 6.1 Implement Grade-Based Achievement Integration
    - Create `services/analytics-service/src/gamification/integrations/grade-integration.service.ts`
    - Implement webhook endpoint `POST /api/v1/gamification/webhooks/grade-recorded`
    - Accept payload: userId, subjectId, score, maxScore, percentage
    - Calculate grade averages per subject and overall GPA
    - Evaluate grade-based achievement criteria (Perfect_Score, Honor_Roll, Improvement_Streak)
    - Award achievements: Perfect_Score (100%), Honor_Roll (90%+ average), Improvement_Streak (3+ consecutive increases)
    - Award 500 currency for Honor_Roll achievement
    - Track subject-specific mastery (10+ assignments with 90%+ in subject)
    - Publish achievement unlock events
    - _Requirements: REQ-10.1, REQ-10.2, REQ-10.3, REQ-10.4, REQ-10.5_

  - [ ]* 6.2 Write property test for Grade-Based Achievement Threshold
    - **Property 15 (partial): Grade-Based Achievement Threshold**
    - **Validates: Requirements REQ-10.6**
    - Verify triggering grade meets or exceeds achievement threshold
    - Use fast-check to generate random grade sequences
    - Run minimum 100 iterations per test
    - _Requirements: PROP-15_

  - [ ]* 6.3 Write unit tests for Grade Integration
    - Test Perfect_Score achievement (100% grade)
    - Test Honor_Roll achievement (90%+ average)
    - Test Improvement_Streak achievement (3+ consecutive increases)
    - Test subject mastery achievement (10+ assignments with 90%+)
    - Test currency award for Honor_Roll (500 coins)
    - _Requirements: REQ-10_

  - [ ] 6.4 Implement Attendance Streak Integration
    - Create `services/analytics-service/src/gamification/integrations/attendance-integration.service.ts`
    - Implement webhook endpoint `POST /api/v1/gamification/webhooks/attendance-recorded`
    - Accept payload: userId, date, status (present, absent, excused)
    - Update attendance streak on present status
    - Break streak on absent status (unless grace period active)
    - Implement grace period (1 day for excused absences)
    - Award milestone bonuses at streak days: 7, 30, 60, 90, 180, 365
    - Calculate exponential rewards: base 10 coins/day, multiplier 1.1^(streak/7)
    - Store previous streak as personal record when broken
    - Unlock Attendance_Champion badge at 30-day streak
    - _Requirements: REQ-11.1, REQ-11.2, REQ-11.3, REQ-11.4, REQ-11.5, REQ-11.6_

  - [ ]* 6.5 Write property test for Streak Calculation Correctness
    - **Property 6: Streak Calculation Correctness**
    - **Validates: Requirements REQ-3.5, REQ-11.1, REQ-11.7**
    - Create `services/analytics-service/src/gamification/integrations/attendance-integration.service.property.test.ts`
    - Use fast-check to generate random attendance sequences
    - Verify streak count equals consecutive days with activity
    - Verify grace period handling for excused absences
    - Run minimum 100 iterations per test
    - _Requirements: PROP-6_

  - [ ]* 6.6 Write unit tests for Attendance Integration
    - Test streak increment on present status
    - Test streak break on absent status
    - Test grace period activation for excused absence
    - Test milestone bonus awards (7, 30, 60, 90, 180, 365 days)
    - Test exponential reward calculation
    - Test personal record storage when streak broken
    - Test Attendance_Champion badge unlock at 30 days
    - _Requirements: REQ-11_

  - [ ] 6.7 Implement Assignment Completion Challenges
    - Create `services/analytics-service/src/gamification/integrations/assignment-integration.service.ts`
    - Implement webhook endpoint `POST /api/v1/gamification/webhooks/assignment-submitted`
    - Accept payload: userId, assignmentId, submittedAt, deadline
    - Award 50 currency for on-time submission (submittedAt <= deadline)
    - Award early submission bonuses (3+ days early: 25 bonus, 7+ days early: 50 bonus)
    - Track on-time submission streaks across all subjects
    - Award 200 currency bonus for all assignments on-time in a week
    - Create dynamic weekly challenges based on upcoming assignment deadlines
    - _Requirements: REQ-12.1, REQ-12.2, REQ-12.3, REQ-12.4, REQ-12.5_

  - [ ]* 6.8 Write property test for On-Time Submission Validation
    - **Property 11 (partial): Challenge Expiry Timing**
    - **Validates: Requirements REQ-12.6**
    - Verify submission timestamp <= deadline for on-time submissions
    - Use fast-check to generate random submission and deadline timestamps
    - Run minimum 100 iterations per test
    - _Requirements: PROP-11_

  - [ ]* 6.9 Write unit tests for Assignment Integration
    - Test on-time submission award (50 coins)
    - Test early submission bonuses (3+ days: 25, 7+ days: 50)
    - Test on-time streak tracking
    - Test weekly completion bonus (200 coins)
    - Test dynamic challenge creation from deadlines
    - _Requirements: REQ-12_

  - [ ] 6.10 Implement streak validation background job
    - Create `services/analytics-service/src/gamification/jobs/streak-validation.job.ts`
    - Run daily at 01:00 UTC (after attendance records finalized)
    - Query all active attendance streaks
    - Check if attendance recorded for previous day
    - Increment streak if present, activate grace if excused, reset if absent
    - Award milestone bonuses when thresholds reached
    - Publish streak update events
    - _Requirements: REQ-11.1, REQ-11.4_

  - [ ] 6.11 Checkpoint - Verify academic and attendance integration
    - Ensure all tests pass (unit and property tests)
    - Test grade webhook triggers achievements correctly
    - Test attendance webhook updates streaks correctly
    - Test assignment webhook awards bonuses correctly
    - Verify streak validation job runs correctly
    - Ask the user if questions arise


- [ ] 7. Phase 7: Social Engagement and Notifications (Week 8)
  - [ ] 7.1 Implement Social Engagement Achievement Integration
    - Create `services/analytics-service/src/gamification/integrations/social-integration.service.ts`
    - Implement webhook endpoint `POST /api/v1/gamification/webhooks/post-created`
    - Accept payload: userId, postId, postType
    - Update social engagement metrics (post count)
    - Award achievements: First_Post, Helpful_Commenter (10+ helpful reactions), Community_Builder (100+ interactions)
    - Implement webhook endpoint `POST /api/v1/gamification/webhooks/post-reaction`
    - Accept payload: postId, userId, reactionType, count
    - Track post quality metrics (likes, comments, shares)
    - Award Viral_Post achievement and 100 currency when post receives 50+ likes
    - Implement rate limiting (max 50 counted interactions per hour) to prevent farming
    - Award daily bonuses for constructive engagement
    - _Requirements: REQ-13.1, REQ-13.2, REQ-13.3, REQ-13.4, REQ-13.5, REQ-13.6_

  - [ ]* 7.2 Write property test for Social Engagement Achievement Threshold
    - **Property 13 (partial): Achievement Category Partitioning**
    - **Validates: Requirements REQ-13.7**
    - Verify interaction count >= achievement threshold for social achievements
    - Use fast-check to generate random interaction sequences
    - Run minimum 100 iterations per test
    - _Requirements: PROP-13_

  - [ ]* 7.3 Write unit tests for Social Integration
    - Test First_Post achievement
    - Test Helpful_Commenter achievement (10+ helpful reactions)
    - Test Community_Builder achievement (100+ interactions)
    - Test Viral_Post achievement (50+ likes)
    - Test rate limiting (max 50 interactions/hour)
    - Test daily constructive engagement bonuses
    - _Requirements: REQ-13_

  - [ ] 7.4 Implement Achievement Announcement in Feed
    - Create `services/analytics-service/src/gamification/integrations/feed-integration.service.ts`
    - Implement `createAchievementPost(userId, achievementId)` - create feed post for achievement
    - Only post for significant achievements (Gold tier or higher)
    - Respect user sharing preferences (All, Major_Only, Friends_Only, None)
    - Format post with: achievement icon, name, user name, timestamp, congratulatory message
    - Implement congratulation reaction handling
    - Award Social_Star bonus (50 currency) when user receives 10+ congratulations
    - Limit to 3 achievement posts per user per day to prevent spam
    - _Requirements: REQ-19.1, REQ-19.2, REQ-19.3, REQ-19.4, REQ-19.5, REQ-19.6, REQ-19.7_

  - [ ]* 7.5 Write unit tests for Feed Integration
    - Test achievement post creation for Gold/Platinum achievements
    - Test achievement post respects sharing preferences
    - Test congratulation reaction tracking
    - Test Social_Star bonus (10+ congratulations)
    - Test daily post limit (3 posts/day)
    - _Requirements: REQ-19_

  - [ ] 7.6 Implement Notification System for Gamification Events
    - Create `services/analytics-service/src/gamification/notifications/notification.service.ts`
    - Implement `sendNotification(userId, eventType, payload)` - send notification via Auth Service
    - Support event types: Achievement_Unlocked, Challenge_Available, Challenge_Expiring_Soon, Streak_At_Risk, Leaderboard_Position_Change
    - Implement notification batching (1-hour window for same event type)
    - Include deep links to navigate to relevant screens
    - Respect user notification preferences per event type
    - Send Challenge_Expiring_Soon notifications 6 hours before expiry
    - Only send Leaderboard_Position_Change for top 10 positions
    - _Requirements: REQ-16.1, REQ-16.2, REQ-16.3, REQ-16.4, REQ-16.5, REQ-16.6_

  - [ ]* 7.7 Write property test for Notification Batching Correctness
    - **Property 13: Notification Batching Correctness**
    - **Validates: Requirements REQ-16.4**
    - Verify batch contains >= 1 notification
    - Verify batch timestamp within batching window
    - Use fast-check to generate random notification sequences
    - Run minimum 100 iterations per test
    - _Requirements: PROP-13_

  - [ ]* 7.8 Write unit tests for Notification Service
    - Test notification sending for each event type
    - Test notification batching (same type within 1 hour)
    - Test deep link generation
    - Test user preference filtering
    - Test Challenge_Expiring_Soon timing (6 hours before)
    - Test Leaderboard_Position_Change filtering (top 10 only)
    - _Requirements: REQ-16_

  - [ ] 7.9 Implement notification batching background job
    - Create `services/analytics-service/src/gamification/jobs/notification-batching.job.ts`
    - Run every 5 minutes
    - Query pending notifications from last 5 minutes
    - Group by user and event type
    - Batch similar notifications (e.g., "3 new achievements unlocked")
    - Send batched notifications to Auth Service
    - Mark notifications as sent
    - _Requirements: REQ-16.4_

  - [ ] 7.10 Checkpoint - Verify social and notification systems
    - Ensure all tests pass (unit and property tests)
    - Test social engagement webhooks trigger achievements
    - Test achievement posts created in feed
    - Test notifications sent for gamification events
    - Verify notification batching works correctly
    - Ask the user if questions arise


- [ ] 8. Phase 8: Dashboard and Data Export (Week 9)
  - [ ] 8.1 Implement Dashboard Data Service
    - Create `services/analytics-service/src/gamification/dashboard/dashboard.service.ts`
    - Implement `getDashboard(userId)` - comprehensive dashboard data
    - Include: XP, level, achievements summary, active challenges, currency balance, streaks, leaderboard ranks, recent activity
    - Implement `getProgressCharts(userId, timePeriod)` - progress visualization data
    - Generate chart data: XP over time (line chart), achievement completion rate (radial chart), streak history (line chart), challenge success rate (bar chart)
    - Support time periods: WEEK, MONTH, QUARTER, YEAR, ALL_TIME
    - Calculate comparative statistics (user vs grade-level average)
    - Highlight strengths (top 25% in category) and growth opportunities (bottom 50%)
    - Cache dashboard data with 30-second TTL
    - _Requirements: REQ-15.1, REQ-15.2, REQ-15.3, REQ-15.4, REQ-15.5_

  - [ ]* 8.2 Write property test for Progress Chart Ordering
    - **Property 15 (partial): Progress Visualization**
    - **Validates: Requirements REQ-15.7**
    - Verify data points ordered chronologically (oldest to newest)
    - Use fast-check to generate random time series data
    - Run minimum 100 iterations per test
    - _Requirements: PROP-15_

  - [ ]* 8.3 Write unit tests for Dashboard Service
    - Test dashboard data completeness (all required fields)
    - Test progress chart generation for each time period
    - Test comparative statistics calculation
    - Test strength/opportunity highlighting
    - Test cache invalidation on gamification events
    - _Requirements: REQ-15_

  - [ ] 8.4 Implement Data Export Service
    - Create `services/analytics-service/src/gamification/export/export.service.ts`
    - Implement `exportGamificationData(userId, startDate, endDate, options)` - generate JSON export
    - Include: achievement history, XP timeline, challenge completion records, currency transactions, leaderboard history
    - Support custom date ranges
    - Format according to documented schema version
    - Generate export within 30 seconds
    - Include data visualization recommendations in metadata
    - Implement `exportCurrencyTransactions(userId, startDate, endDate)` - currency-specific export
    - _Requirements: REQ-20.1, REQ-20.2, REQ-20.3, REQ-20.4, REQ-20.5, REQ-20.6_

  - [ ]* 8.5 Write property test for Export-Import Round Trip
    - **Property 9: Export-Import Round Trip**
    - **Validates: Requirements REQ-20.7**
    - Create `services/analytics-service/src/gamification/export/export.service.property.test.ts`
    - Use fast-check to generate random gamification data
    - Export data to JSON
    - Parse JSON and serialize again
    - Verify round-trip produces valid JSON matching schema
    - Run minimum 100 iterations per test
    - _Requirements: PROP-9_

  - [ ]* 8.6 Write unit tests for Export Service
    - Test export includes all required data types
    - Test export respects date range filters
    - Test export completes within 30 seconds
    - Test export schema validation
    - Test currency transaction export
    - _Requirements: REQ-20_

  - [ ] 8.7 Create Dashboard and Export API endpoints
    - Create `services/analytics-service/src/gamification/routes/dashboard.routes.ts`
    - Implement `GET /api/v1/gamification/dashboard` - get comprehensive dashboard
    - Implement `GET /api/v1/gamification/dashboard/progress` - get progress charts with time period filter
    - Implement `POST /api/v1/gamification/dashboard/export` - generate data export
    - Implement `POST /api/v1/gamification/currency/export` - generate currency transaction export
    - Add request validation for date ranges and export options
    - Return download URL for generated exports
    - _Requirements: REQ-15, REQ-20_

  - [ ] 8.8 Implement Milestone Celebration System
    - Create `services/analytics-service/src/gamification/milestones/milestone.service.ts`
    - Implement `createMilestone(userId, type, title, description, metadata)` - record milestone event
    - Support types: LEVEL_UP, ACHIEVEMENT_UNLOCK, STREAK_MILESTONE, CHALLENGE_COMPLETION, LEADERBOARD_TOP_10
    - Implement `getUserMilestones(userId, viewed)` - get user's milestone events
    - Implement `markMilestoneViewed(milestoneId)` - mark milestone as viewed
    - Queue multiple milestones for sequential display
    - Include celebration data (rewards earned, next milestone target)
    - _Requirements: REQ-14.1, REQ-14.2, REQ-14.3, REQ-14.4, REQ-14.6_

  - [ ]* 8.9 Write unit tests for Milestone Service
    - Test milestone creation for each type
    - Test milestone queuing (multiple simultaneous)
    - Test milestone viewed tracking
    - Test celebration data inclusion
    - _Requirements: REQ-14_

  - [ ] 8.10 Checkpoint - Verify dashboard and export systems
    - Ensure all tests pass (unit and property tests)
    - Test dashboard data completeness
    - Test progress charts for all time periods
    - Test data export generates valid JSON
    - Test export-import round trip
    - Test milestone creation and queuing
    - Ask the user if questions arise


- [ ] 9. Phase 9: Mobile UI - React Native Components (Weeks 10-11)
  - [ ] 9.1 Set up mobile state management with Zustand
    - Create `apps/mobile/src/stores/gamificationStore.ts` - main gamification state
    - Implement state: xp, level, currency, achievements, achievementProgress, unlockedAchievements
    - Implement actions: updateXP, unlockAchievement, updateAchievementProgress, syncFromServer
    - Create `apps/mobile/src/stores/challengeStore.ts` - challenge state
    - Implement state: dailyChallenges, weeklyChallenges, specialChallenges, dailyStreak, weeklyStreak
    - Implement actions: updateChallengeProgress, completeChallenge, refreshChallenges
    - Create `apps/mobile/src/stores/leaderboardStore.ts` - leaderboard state
    - Implement state: category, scope, timePeriod, entries, userRank
    - Implement actions: fetchLeaderboard, subscribeToUpdates, unsubscribeFromUpdates
    - _Requirements: REQ-23.1, REQ-23.2_

  - [ ] 9.2 Implement Supabase Realtime subscriptions for mobile
    - Create `apps/mobile/src/services/realtime.service.ts`
    - Implement leaderboard subscription: `subscribeToLeaderboard(category, scope, timePeriod, callback)`
    - Implement team challenge subscription: `subscribeToTeamChallenge(challengeId, callback)`
    - Implement user achievements subscription: `subscribeToUserAchievements(userId, callback)`
    - Implement user challenges subscription: `subscribeToUserChallenges(userId, callback)`
    - Handle connection interruptions with automatic reconnection
    - Unsubscribe when navigating away from screens
    - Batch rapid updates (500ms window) to prevent UI thrashing
    - _Requirements: REQ-17.1, REQ-17.2, REQ-17.3, REQ-17.4, REQ-17.5, REQ-17.6, REQ-17.7_

  - [ ] 9.3 Create shared gamification components
    - Create `apps/mobile/src/components/gamification/MilestoneCelebration.tsx` - Lottie animation overlay
    - Support celebration types: level up, achievement unlock, streak milestone, challenge completion, leaderboard top 10
    - Implement dismissal on tap
    - Queue multiple celebrations for sequential display
    - Play congratulatory sound effect (if audio enabled)
    - Create `apps/mobile/src/components/gamification/CurrencyIcon.tsx` - currency display icon
    - Create `apps/mobile/src/components/gamification/XPBadge.tsx` - XP display badge
    - Create `apps/mobile/src/components/gamification/ProgressBar.tsx` - reusable progress bar
    - Create `apps/mobile/src/components/gamification/TierBadge.tsx` - achievement tier badge
    - Create `apps/mobile/src/components/gamification/StreakFlame.tsx` - streak indicator
    - _Requirements: REQ-14.1, REQ-14.2, REQ-14.5, REQ-14.7, REQ-23.3_

  - [ ] 9.4 Implement Dashboard Screen
    - Create `apps/mobile/src/screens/gamification/DashboardScreen.tsx`
    - Create `apps/mobile/src/components/gamification/XPProgressCard.tsx` - XP and level display
    - Create `apps/mobile/src/components/gamification/LevelIndicator.tsx` - circular level progress
    - Create `apps/mobile/src/components/gamification/QuickStatsGrid.tsx` - currency, achievements, streaks
    - Create `apps/mobile/src/components/gamification/ActiveChallengesCarousel.tsx` - horizontal scrolling challenges
    - Create `apps/mobile/src/components/gamification/RecentAchievementsRow.tsx` - recent unlocks
    - Fetch dashboard data on mount
    - Update in real-time via subscriptions
    - Pull-to-refresh functionality
    - _Requirements: REQ-15, REQ-23.1_

  - [ ] 9.5 Implement Achievements Screen
    - Create `apps/mobile/src/screens/gamification/AchievementsScreen.tsx`
    - Create `apps/mobile/src/components/gamification/CategoryTabs.tsx` - filter by category
    - Create `apps/mobile/src/components/gamification/AchievementGrid.tsx` - grid layout
    - Create `apps/mobile/src/components/gamification/AchievementCard.tsx` - individual achievement
    - Create `apps/mobile/src/components/gamification/AchievementIcon.tsx` - achievement icon with lock state
    - Create `apps/mobile/src/components/gamification/AchievementDetailModal.tsx` - bottom sheet with details
    - Show locked, unlocked, and in-progress achievements
    - Display progress bars for in-progress achievements
    - Show tier badges for tiered achievements
    - _Requirements: REQ-1, REQ-2, REQ-23.1_

  - [ ] 9.6 Implement Challenges Screen
    - Create `apps/mobile/src/screens/gamification/ChallengesScreen.tsx`
    - Create `apps/mobile/src/components/gamification/ChallengeTypeTabs.tsx` - Daily/Weekly/Special tabs
    - Create `apps/mobile/src/components/gamification/ChallengeList.tsx` - list of challenges
    - Create `apps/mobile/src/components/gamification/ChallengeCard.tsx` - individual challenge
    - Create `apps/mobile/src/components/gamification/ChallengeProgress.tsx` - progress bar with current/target
    - Create `apps/mobile/src/components/gamification/RewardDisplay.tsx` - currency and XP rewards
    - Create `apps/mobile/src/components/gamification/ExpiryTimer.tsx` - countdown timer
    - Create `apps/mobile/src/components/gamification/StreakIndicator.tsx` - daily/weekly streak display
    - Update progress in real-time
    - Show celebration animation on completion
    - _Requirements: REQ-3, REQ-4, REQ-23.1_

  - [ ] 9.7 Implement Shop Screen
    - Create `apps/mobile/src/screens/gamification/ShopScreen.tsx`
    - Create `apps/mobile/src/components/gamification/CurrencyBalance.tsx` - prominent balance display
    - Create `apps/mobile/src/components/gamification/UnlockableCategories.tsx` - filter by type
    - Create `apps/mobile/src/components/gamification/UnlockableGrid.tsx` - grid layout
    - Create `apps/mobile/src/components/gamification/UnlockableCard.tsx` - individual item
    - Create `apps/mobile/src/components/gamification/PreviewImage.tsx` - item preview
    - Create `apps/mobile/src/components/gamification/PriceTag.tsx` - cost display
    - Create `apps/mobile/src/components/gamification/PurchaseButton.tsx` - purchase action
    - Show owned, available, and locked items
    - Display achievement requirements for locked items
    - Confirm purchase with modal
    - Update balance after purchase
    - _Requirements: REQ-6, REQ-23.1_

  - [x] 9.8 Implement Leaderboard Screen
    - [x] Create `apps/mobile/src/screens/gamification/LeaderboardScreen.tsx`
    - Create `apps/mobile/src/components/gamification/CategorySelector.tsx` - category dropdown
    - Create `apps/mobile/src/components/gamification/ScopeSelector.tsx` - scope selector
    - [x] Create `apps/mobile/src/components/gamification/TimePeriodSelector.tsx` - period selector
    - [x] Create `apps/mobile/src/components/gamification/LeaderboardList.tsx` - ranked list
    - [x] Create `apps/mobile/src/components/gamification/LeaderboardEntry.tsx` - individual entry
    - [x] Create `apps/mobile/src/components/gamification/RankBadge.tsx` - rank display (1st, 2nd, 3rd with medals)
    - [x] Create `apps/mobile/src/components/gamification/UserPositionCard.tsx` - sticky user position
    - [x] Update rankings in real-time via subscriptions
    - [x] Highlight user's entry
    - [x] Infinite scroll pagination
    - _Requirements: REQ-7, REQ-8, REQ-23.1_

  - [ ] 9.9 Implement Team Challenges Screen
    - Create `apps/mobile/src/screens/gamification/TeamChallengesScreen.tsx`
    - Create `apps/mobile/src/components/gamification/ActiveTeamChallenges.tsx` - list of active challenges
    - Create `apps/mobile/src/components/gamification/TeamChallengeCard.tsx` - individual team challenge
    - Create `apps/mobile/src/components/gamification/ParticipantAvatars.tsx` - overlapping avatar circles
    - Create `apps/mobile/src/components/gamification/ContributionBreakdown.tsx` - participant contributions
    - Create `apps/mobile/src/components/gamification/CreateTeamChallengeModal.tsx` - creation form
    - Update progress in real-time for all participants
    - Show celebration when team completes challenge
    - Display proportional rewards
    - _Requirements: REQ-9, REQ-23.1_

  - [ ] 9.10 Implement offline support for mobile
    - Cache dashboard data for offline viewing
    - Cache achievements and progress for offline viewing
    - Cache leaderboard data for offline viewing
    - Show offline indicator when disconnected
    - Queue actions (challenge progress, purchases) when offline
    - Sync queued actions when connectivity restored
    - Update local state after sync
    - _Requirements: REQ-23.6, REQ-23.7_

  - [ ] 9.11 Optimize mobile performance
    - Implement FlatList virtualization for long lists (achievements, leaderboards)
    - Optimize Lottie animations for 60 FPS on mid-range devices
    - Implement image caching for achievement icons and avatars
    - Lazy load screens and components
    - Minimize re-renders with React.memo and useMemo
    - Profile performance with React DevTools
    - _Requirements: REQ-21.1, REQ-23.5_

  - [ ] 9.12 Checkpoint - Verify mobile UI implementation
    - Test all screens on iOS and Android
    - Verify real-time updates work correctly
    - Test offline mode functionality
    - Verify animations run smoothly (60 FPS)
    - Test on various screen sizes (320px to tablet)
    - Verify accessibility (screen reader labels, haptic feedback)
    - Ask the user if questions arise


- [ ] 10. Phase 10: Web UI - Next.js Components (Weeks 12-13)
  - [ ] 10.1 Set up web data fetching with SWR
    - Create `apps/web/src/hooks/useGamificationData.ts` - dashboard data hook
    - Use SWR with 30-second refresh interval and revalidate on focus
    - Create `apps/web/src/hooks/useAchievements.ts` - achievements data hook
    - Support filters: category, tier, unlocked
    - Create `apps/web/src/hooks/useChallenges.ts` - challenges data hook
    - Support filters: type, status
    - Create `apps/web/src/hooks/useLeaderboard.ts` - leaderboard data hook
    - Implement real-time subscription with Supabase
    - Revalidate on rank change events
    - Create `apps/web/src/hooks/useTeamChallenges.ts` - team challenges data hook
    - _Requirements: REQ-23.1, REQ-23.2_

  - [ ] 10.2 Implement Supabase Realtime subscriptions for web
    - Create `apps/web/src/services/realtime.service.ts`
    - Implement leaderboard subscription with automatic revalidation
    - Implement team challenge subscription with progress updates
    - Implement user achievements subscription
    - Implement user challenges subscription
    - Handle connection interruptions with reconnection
    - Unsubscribe on component unmount
    - _Requirements: REQ-17.1, REQ-17.2, REQ-17.3, REQ-17.4, REQ-17.5, REQ-17.6_

  - [ ] 10.3 Create shared web gamification components
    - Create `apps/web/src/components/gamification/MilestoneCelebration.tsx` - CSS animation modal
    - Support celebration types: level up, achievement unlock, streak milestone, challenge completion, leaderboard top 10
    - Implement dismissal on click
    - Queue multiple celebrations
    - Create `apps/web/src/components/gamification/CurrencyIcon.tsx` - currency display
    - Create `apps/web/src/components/gamification/XPBadge.tsx` - XP display
    - Create `apps/web/src/components/gamification/ProgressBar.tsx` - reusable progress bar
    - Create `apps/web/src/components/gamification/TierBadge.tsx` - achievement tier badge
    - Create `apps/web/src/components/gamification/StreakFlame.tsx` - streak indicator
    - _Requirements: REQ-14.1, REQ-14.2, REQ-14.5, REQ-23.3_

  - [ ] 10.4 Implement Dashboard Page
    - Create `apps/web/src/app/gamification/dashboard/page.tsx`
    - Create `apps/web/src/components/gamification/XPChart.tsx` - line chart with Recharts
    - Create `apps/web/src/components/gamification/AchievementSummary.tsx` - category breakdown
    - Create `apps/web/src/components/gamification/ChallengeSummary.tsx` - active challenges
    - Create `apps/web/src/components/gamification/LeaderboardWidget.tsx` - top 10 preview
    - Display XP over time, achievement completion rate, streak history, challenge success rate
    - Support time period filtering (Week, Month, Quarter, Year, All Time)
    - Show comparative statistics (user vs grade average)
    - Highlight strengths and growth opportunities
    - _Requirements: REQ-15, REQ-23.1_

  - [ ] 10.5 Implement Achievements Page
    - Create `apps/web/src/app/gamification/achievements/page.tsx`
    - Create `apps/web/src/components/gamification/CategoryFilter.tsx` - category filter buttons
    - Create `apps/web/src/components/gamification/AchievementGrid.tsx` - responsive grid
    - Create `apps/web/src/components/gamification/AchievementCard.tsx` - individual achievement
    - Create `apps/web/src/app/gamification/achievements/[id]/page.tsx` - achievement detail page
    - Show locked, unlocked, and in-progress achievements
    - Display progress bars for in-progress achievements
    - Show tier badges for tiered achievements
    - Filter by category and tier
    - _Requirements: REQ-1, REQ-2, REQ-23.1_

  - [ ] 10.6 Implement Challenges Page
    - Create `apps/web/src/app/gamification/challenges/page.tsx`
    - Create `apps/web/src/components/gamification/DailyChallenges.tsx` - daily challenges section
    - Create `apps/web/src/components/gamification/WeeklyChallenges.tsx` - weekly challenges section
    - Create `apps/web/src/components/gamification/SpecialEvents.tsx` - special event challenges
    - Create `apps/web/src/components/gamification/ChallengeCard.tsx` - individual challenge
    - Display progress bars with current/target values
    - Show expiry countdown timers
    - Display currency and XP rewards
    - Show daily and weekly streak indicators
    - Update progress in real-time
    - _Requirements: REQ-3, REQ-4, REQ-23.1_

  - [ ] 10.7 Implement Shop Page
    - Create `apps/web/src/app/gamification/shop/page.tsx`
    - Create `apps/web/src/components/gamification/CurrencyDisplay.tsx` - prominent balance
    - Create `apps/web/src/components/gamification/UnlockableFilters.tsx` - type and ownership filters
    - Create `apps/web/src/components/gamification/UnlockableCard.tsx` - individual item
    - Show owned, available, and locked items
    - Display achievement requirements for locked items
    - Implement purchase confirmation modal
    - Update balance after purchase
    - Show preview for themes and avatars
    - _Requirements: REQ-6, REQ-23.1_

  - [ ] 10.8 Implement Leaderboards Hub Page
    - Create `apps/web/src/app/gamification/leaderboards/page.tsx`
    - Create `apps/web/src/components/gamification/LeaderboardTable.tsx` - table with rankings
    - Create `apps/web/src/components/gamification/LeaderboardFilters.tsx` - category, scope, period filters
    - Create `apps/web/src/app/gamification/leaderboards/[category]/page.tsx` - category-specific page
    - Display rank badges (1st, 2nd, 3rd with medals)
    - Highlight user's entry
    - Update rankings in real-time via subscriptions
    - Implement infinite scroll pagination
    - Show archived leaderboards
    - _Requirements: REQ-7, REQ-8, REQ-23.1_

  - [ ] 10.9 Implement Team Challenges Page
    - Create `apps/web/src/app/gamification/team-challenges/page.tsx`
    - Create `apps/web/src/components/gamification/TeamChallengeList.tsx` - list of challenges
    - Create `apps/web/src/components/gamification/CreateTeamChallengeForm.tsx` - creation form
    - Create `apps/web/src/app/gamification/team-challenges/[id]/page.tsx` - challenge detail page
    - Display participant avatars and contributions
    - Show contribution breakdown with percentages
    - Update progress in real-time for all participants
    - Show celebration when team completes challenge
    - Display proportional rewards
    - _Requirements: REQ-9, REQ-23.1_

  - [ ] 10.10 Implement responsive design for web
    - Ensure all components work on screen sizes 320px to 2560px width
    - Use CSS Grid and Flexbox for responsive layouts
    - Implement mobile-first design approach
    - Test on desktop, tablet, and mobile viewports
    - Adapt UI components to platform conventions (modals on web vs bottom sheets on mobile)
    - _Requirements: REQ-23.3, REQ-23.4_

  - [ ] 10.11 Implement accessibility for web
    - Add ARIA labels to all interactive elements
    - Implement keyboard navigation for all features
    - Ensure color contrast meets WCAG 2.1 AA (4.5:1 for text)
    - Provide text alternatives for achievement icons
    - Support reduced motion preferences (disable animations)
    - Allow font size scaling up to 200%
    - Test with screen readers (NVDA, JAWS, VoiceOver)
    - _Requirements: REQ-24.1, REQ-24.2, REQ-24.3, REQ-24.4, REQ-24.5, REQ-24.6_

  - [ ] 10.12 Checkpoint - Verify web UI implementation
    - Test all pages on Chrome, Firefox, Safari, Edge
    - Verify real-time updates work correctly
    - Test responsive design on various screen sizes
    - Verify accessibility with screen readers
    - Test keyboard navigation
    - Verify color contrast meets WCAG AA
    - Ask the user if questions arise


- [ ] 11. Phase 11: Additional Property-Based Tests (Week 13)
  - [ ]* 11.1 Write property test for Achievement Tier Ordering
    - **Property 7: Achievement Tier Ordering**
    - **Validates: Requirements REQ-2.3, REQ-2.5**
    - Create `services/analytics-service/src/gamification/achievements/achievement-tiers.property.test.ts`
    - Use fast-check to generate tiered achievements
    - Verify criteria threshold for tier N+1 > threshold for tier N
    - Verify order: Bronze < Silver < Gold < Platinum
    - Run minimum 100 iterations per test
    - _Requirements: PROP-7_

  - [ ]* 11.2 Write property test for Reward Scaling Consistency
    - **Property 10: Reward Scaling Consistency**
    - **Validates: Requirements REQ-2.6**
    - Verify reward amount increases monotonically with tier
    - Verify multipliers: Bronze 1x, Silver 2x, Gold 3x, Platinum 5x
    - Use fast-check to generate random base rewards
    - Run minimum 100 iterations per test
    - _Requirements: PROP-10_

  - [ ]* 11.3 Write property test for Achievement Category Partitioning
    - **Property 13: Achievement Category Partitioning**
    - **Validates: Requirements REQ-1.2, REQ-1.5**
    - Verify total count = locked + unlocked for each category
    - Verify no achievement belongs to multiple categories
    - Use fast-check to generate random achievement sets
    - Run minimum 100 iterations per test
    - _Requirements: PROP-13_

  - [ ]* 11.4 Write property test for Real-Time Update Convergence
    - **Property 10: Real-Time Update Convergence**
    - **Validates: Requirements REQ-17.3**
    - Verify client state converges to server state within 5 seconds after all updates processed
    - Use fast-check to generate random update sequences
    - Run minimum 100 iterations per test
    - _Requirements: PROP-10_

  - [ ]* 11.5 Run all property-based tests and verify coverage
    - Execute all 15 property tests
    - Verify each test runs minimum 100 iterations
    - Verify all properties pass consistently
    - Generate property test coverage report
    - Document any edge cases discovered
    - _Requirements: All PROP-1 through PROP-15_

  - [ ] 11.6 Checkpoint - Verify property-based test suite
    - Ensure all 15 property tests pass
    - Verify minimum 100 iterations per test
    - Review edge cases discovered during testing
    - Fix any issues found by property tests
    - Ask the user if questions arise


- [ ] 12. Phase 12: Integration Testing (Week 14)
  - [ ]* 12.1 Write integration tests for grade-based achievements
    - Create `services/analytics-service/src/gamification/integrations/__tests__/grade-integration.integration.test.ts`
    - Test grade webhook triggers achievement evaluation
    - Test Perfect_Score achievement unlocked on 100% grade
    - Test Honor_Roll achievement unlocked on 90%+ average
    - Test Improvement_Streak achievement on 3+ consecutive increases
    - Test currency awarded for Honor_Roll (500 coins)
    - Test achievement post created in feed
    - Test notification sent to user
    - _Requirements: REQ-10_

  - [ ]* 12.2 Write integration tests for attendance streaks
    - Create `services/analytics-service/src/gamification/integrations/__tests__/attendance-integration.integration.test.ts`
    - Test attendance webhook updates streak correctly
    - Test streak increment on present status
    - Test streak break on absent status
    - Test grace period for excused absence
    - Test milestone bonuses at 7, 30, 60, 90, 180, 365 days
    - Test Attendance_Champion badge unlock at 30 days
    - Test exponential reward calculation
    - _Requirements: REQ-11_

  - [ ]* 12.3 Write integration tests for challenge completion flow
    - Create `services/analytics-service/src/gamification/challenges/__tests__/challenge-completion.integration.test.ts`
    - Test challenge progress update via API
    - Test challenge completion awards currency
    - Test streak bonus awarded (daily: 50, weekly: 1000)
    - Test real-time progress update published
    - Test notification sent on completion
    - Test milestone celebration created
    - _Requirements: REQ-3, REQ-4_

  - [ ]* 12.4 Write integration tests for team challenge flow
    - Create `services/analytics-service/src/gamification/team-challenges/__tests__/team-challenge.integration.test.ts`
    - Test team challenge creation with participants
    - Test contribution updates team progress
    - Test real-time updates sent to all participants
    - Test proportional reward distribution on completion
    - Test completion notification sent to all participants
    - _Requirements: REQ-9_

  - [ ]* 12.5 Write integration tests for unlockable purchase flow
    - Create `services/analytics-service/src/gamification/unlockables/__tests__/unlockable-purchase.integration.test.ts`
    - Test purchase with sufficient balance succeeds
    - Test purchase with insufficient balance fails
    - Test purchase with required achievement locked fails
    - Test purchase with required achievement unlocked succeeds
    - Test currency deducted correctly
    - Test transaction logged
    - Test duplicate purchase prevented
    - _Requirements: REQ-6_

  - [ ]* 12.6 Write integration tests for leaderboard updates
    - Create `services/analytics-service/src/gamification/leaderboards/__tests__/leaderboard-updates.integration.test.ts`
    - Test XP change triggers rank recalculation
    - Test rank change published to real-time channel
    - Test leaderboard cache invalidated
    - Test top 10 notification sent
    - Test privacy settings respected
    - _Requirements: REQ-7, REQ-8_

  - [ ]* 12.7 Write integration tests for social engagement
    - Create `services/analytics-service/src/gamification/integrations/__tests__/social-integration.integration.test.ts`
    - Test post creation webhook updates metrics
    - Test First_Post achievement unlocked
    - Test Viral_Post achievement on 50+ likes
    - Test achievement post created in feed
    - Test congratulation reactions tracked
    - Test Social_Star bonus awarded (10+ congratulations)
    - _Requirements: REQ-13, REQ-19_

  - [ ]* 12.8 Write integration tests for notification system
    - Create `services/analytics-service/src/gamification/notifications/__tests__/notification.integration.test.ts`
    - Test notification sent for each event type
    - Test notification batching (same type within 1 hour)
    - Test deep link generation
    - Test user preference filtering
    - Test Challenge_Expiring_Soon timing (6 hours before)
    - _Requirements: REQ-16_

  - [ ]* 12.9 Write end-to-end tests for critical user flows
    - Create `apps/mobile/__tests__/e2e/gamification.e2e.test.ts` (using Detox)
    - Test complete daily challenge flow (view → progress → complete → celebrate)
    - Test purchase unlockable flow (view shop → select item → confirm → equip)
    - Test team challenge flow (create → invite → contribute → complete)
    - Test leaderboard competition flow (earn XP → rank update → view leaderboard)
    - Create `apps/web/__tests__/e2e/gamification.e2e.test.ts` (using Playwright)
    - Test same critical flows on web
    - _Requirements: REQ-23.1_

  - [ ] 12.10 Checkpoint - Verify integration test coverage
    - Ensure all integration tests pass
    - Verify end-to-end tests cover critical flows
    - Review test coverage report (target: >80%)
    - Fix any issues found by integration tests
    - Ask the user if questions arise


- [ ] 13. Phase 13: Performance Optimization and Load Testing (Week 14)
  - [ ] 13.1 Optimize database queries with indexes
    - Verify all indexes from design document are created
    - Add composite indexes for common query patterns
    - Analyze slow query log and add missing indexes
    - Test query performance with EXPLAIN ANALYZE
    - Target: <100ms for 95% of queries
    - _Requirements: REQ-21.3_

  - [ ] 13.2 Implement and tune Redis caching
    - Verify caching implemented for: leaderboards (60s TTL), dashboard (30s TTL), achievements catalog (5min TTL), challenge templates (1hr TTL), currency balance (10s TTL)
    - Implement cache warming for popular leaderboards
    - Monitor cache hit rate (target: >80%)
    - Implement cache invalidation on data changes
    - Test cache performance under load
    - _Requirements: REQ-21.4_

  - [ ] 13.3 Optimize background job performance
    - Implement batch processing for challenge generation (1000 users per batch)
    - Optimize achievement evaluation queries
    - Implement parallel processing where possible
    - Monitor job execution times
    - Set up job failure alerts
    - _Requirements: REQ-21.5_

  - [ ] 13.4 Implement rate limiting
    - Verify rate limits: 100 req/min for most endpoints, 10 req/min for purchases, 60 req/min for leaderboards, 50 req/min for team contributions
    - Use Redis for rate limit tracking
    - Return 429 status with Retry-After header
    - Monitor rate limit violations
    - _Requirements: REQ-21.6_

  - [ ] 13.5 Set up performance monitoring
    - Implement APM (Application Performance Monitoring) with New Relic or Datadog
    - Track key metrics: API response times (p50, p95, p99), database query times, cache hit rates, background job durations, real-time connection count
    - Set up performance dashboards
    - Configure performance alerts (p95 > 100ms, cache hit rate < 80%, job failures)
    - _Requirements: REQ-21.1, REQ-21.2_

  - [ ]* 13.6 Conduct load testing with k6
    - Create `services/analytics-service/load-tests/gamification.load.test.js`
    - Test leaderboard endpoint under load (100 → 1000 users)
    - Test challenge progress endpoint under load
    - Test currency transaction endpoint under load
    - Test real-time connection scaling (target: 10k concurrent connections)
    - Verify p95 response time < 100ms
    - Verify error rate < 1%
    - Identify bottlenecks and optimize
    - _Requirements: REQ-21.1, REQ-21.2_

  - [ ] 13.7 Optimize real-time performance
    - Implement connection pooling for Supabase Realtime
    - Batch rapid updates (500ms window)
    - Limit subscriptions to visible screens
    - Monitor connection count and message throughput
    - Test with 10k concurrent connections
    - _Requirements: REQ-21.2_

  - [ ] 13.8 Implement horizontal scaling on Google Cloud Run
    - Configure auto-scaling: min 2 instances, max 50 instances
    - Set scaling trigger: 80% CPU or memory utilization
    - Test scaling behavior under load
    - Verify stateless service design (no local state)
    - Test load balancing across instances
    - _Requirements: REQ-21.7_

  - [ ] 13.9 Checkpoint - Verify performance targets met
    - Verify p95 response time < 100ms for gamification endpoints
    - Verify cache hit rate > 80%
    - Verify system handles 10k concurrent real-time connections
    - Verify horizontal scaling works correctly
    - Review performance monitoring dashboards
    - Ask the user if questions arise


- [ ] 14. Phase 14: Privacy, Security, and Data Management (Week 15)
  - [ ] 14.1 Implement privacy controls
    - Implement profile visibility settings (Public, Friends_Only, Private)
    - Exclude Private profiles from public leaderboards
    - Implement achievement sharing preferences (All, Major_Only, Friends_Only, None)
    - Respect sharing preferences when creating feed posts
    - Implement notification preferences per event type
    - Allow users to opt out of specific notification types
    - _Requirements: REQ-25.1, REQ-25.2, REQ-25.3_

  - [ ] 14.2 Implement data anonymization for analytics
    - Anonymize user data in aggregate reports
    - Remove PII from exported analytics data
    - Implement data masking for admin views
    - _Requirements: REQ-25.4_

  - [ ] 14.3 Implement data retention and archival
    - Archive gamification data older than 2 years
    - Implement automated archival job (runs monthly)
    - Store archived data in cold storage
    - Maintain data integrity during archival
    - _Requirements: REQ-25.5_

  - [ ] 14.4 Implement data deletion endpoint
    - Create `DELETE /api/v1/gamification/user/:userId/data` endpoint
    - Remove all user gamification data (achievements, challenges, currency, unlockables, team participations, leaderboard entries, streaks, milestones)
    - Use database transactions for atomic deletion
    - Log deletion requests for audit trail
    - Complete deletion within 30 days of account deletion
    - _Requirements: REQ-25.6, REQ-25.7_

  - [ ] 14.5 Implement input validation and sanitization
    - Validate all API inputs with Zod schemas
    - Sanitize user-generated content (team challenge names, descriptions)
    - Prevent SQL injection with parameterized queries (Prisma handles this)
    - Prevent XSS attacks with content sanitization
    - Validate file uploads (achievement icons, unlockable images)
    - _Requirements: Security best practices_

  - [ ] 14.6 Implement authentication and authorization
    - Verify JWT authentication on all endpoints
    - Check user account status (active, not suspended)
    - Implement role-based access control (admin endpoints)
    - Verify user ownership for resource access (own achievements, challenges, currency)
    - Prevent unauthorized access to other users' data
    - _Requirements: Security best practices_

  - [ ] 14.7 Implement transaction safety and data integrity
    - Verify all currency operations use database transactions
    - Verify optimistic locking for achievement unlocks
    - Verify check constraint on currency balance (>= 0)
    - Implement idempotent operations where needed
    - Test concurrent transaction handling
    - _Requirements: REQ-22.1, REQ-22.2, REQ-22.3, REQ-22.5, REQ-22.7_

  - [ ] 14.8 Implement error handling and logging
    - Implement consistent error response format
    - Return appropriate HTTP status codes
    - Log all errors with context (user ID, request ID, timestamp)
    - Implement error recovery strategies (retry with exponential backoff)
    - Set up error monitoring and alerting
    - _Requirements: Error handling section in design_

  - [ ] 14.9 Checkpoint - Verify privacy and security implementation
    - Test privacy controls (profile visibility, sharing preferences)
    - Test data deletion endpoint
    - Verify input validation prevents malicious inputs
    - Verify authentication and authorization work correctly
    - Test transaction safety under concurrent load
    - Review security audit checklist
    - Ask the user if questions arise


- [ ] 15. Phase 15: Documentation and Launch Preparation (Week 15)
  - [ ] 15.1 Write API documentation
    - Document all gamification API endpoints with OpenAPI/Swagger
    - Include request/response schemas
    - Include authentication requirements
    - Include rate limits
    - Include example requests and responses
    - Include error codes and descriptions
    - Generate interactive API documentation
    - _Requirements: Documentation_

  - [ ] 15.2 Write developer documentation
    - Document database schema and relationships
    - Document background job schedules and purposes
    - Document real-time channel formats and events
    - Document caching strategy and TTLs
    - Document property-based test suite
    - Document deployment process
    - Document monitoring and alerting setup
    - _Requirements: Documentation_

  - [ ] 15.3 Write user documentation
    - Create user guide for gamification features
    - Document achievement categories and how to earn them
    - Document challenge system (daily, weekly, special)
    - Document virtual currency and shop
    - Document team challenges
    - Document leaderboards
    - Create FAQ for common questions
    - _Requirements: Documentation_

  - [ ] 15.4 Create admin tools for managing gamification
    - Create admin UI for creating/editing achievements
    - Create admin UI for creating/editing challenge templates
    - Create admin UI for creating/editing unlockables
    - Create admin UI for viewing gamification metrics
    - Create admin UI for managing user data (view, export, delete)
    - Implement admin authentication and authorization
    - _Requirements: Admin tools_

  - [ ] 15.5 Set up monitoring and alerting
    - Configure monitoring dashboards: API performance, database performance, cache performance, background job status, real-time connections, error rates
    - Configure alerts: Achievement unlock latency > 200ms (p95), Challenge generation job failure, Currency balance inconsistency, Leaderboard cache hit rate < 80%, Real-time connection failures > 5%, API error rate > 1%
    - Set up on-call rotation for alerts
    - Document incident response procedures
    - _Requirements: Monitoring section in design_

  - [ ] 15.6 Prepare for gradual rollout
    - Implement feature flags for gamification features
    - Create rollout plan: Phase 1 (10% of users), Phase 2 (25%), Phase 3 (50%), Phase 4 (100%)
    - Define success metrics for each phase
    - Define rollback criteria
    - Prepare rollback procedures
    - _Requirements: Launch preparation_

  - [ ] 15.7 Conduct final testing and QA
    - Run full test suite (unit, property, integration, e2e)
    - Verify all tests pass
    - Conduct manual QA on staging environment
    - Test all user flows on mobile and web
    - Test with various user roles and permissions
    - Test edge cases and error scenarios
    - Verify accessibility compliance
    - _Requirements: All requirements_

  - [ ] 15.8 Create user onboarding materials
    - Create onboarding tutorial for first-time users
    - Create tooltips for gamification features
    - Create celebration animations for first achievements
    - Create email templates for gamification notifications
    - Create push notification templates
    - _Requirements: User onboarding_

  - [ ] 15.9 Final checkpoint - Launch readiness review
    - Verify all features implemented and tested
    - Verify all 15 property tests pass
    - Verify performance targets met
    - Verify security and privacy controls in place
    - Verify monitoring and alerting configured
    - Verify documentation complete
    - Verify rollout plan ready
    - Conduct launch readiness meeting with stakeholders
    - Get approval to proceed with gradual rollout
    - Ask the user if questions arise


## Notes

- Tasks marked with `*` after the checkbox are optional and can be skipped for faster MVP delivery
- Each task references specific requirements (REQ-X format) for traceability
- Property-based tests reference correctness properties (PROP-X format) from the design document
- Checkpoints ensure incremental validation at reasonable breaks
- All property tests must run minimum 100 iterations using fast-check
- Implementation uses TypeScript with existing microservices architecture
- Target performance: <100ms response time (p95), 10k+ concurrent real-time connections
- Platform parity between React Native mobile and Next.js web applications

## Implementation Timeline

- **Weeks 1-2**: Foundation (database, currency, achievements)
- **Weeks 3-4**: Challenge system (daily, weekly, templates)
- **Week 5**: Leaderboard system (multi-category, real-time)
- **Week 6**: Team challenges (collaborative goals)
- **Week 7**: Unlockables and shop, academic/attendance integration
- **Week 8**: Social engagement and notifications
- **Week 9**: Dashboard and data export
- **Weeks 10-11**: Mobile UI (React Native)
- **Weeks 12-13**: Web UI (Next.js)
- **Week 14**: Integration testing and performance optimization
- **Week 15**: Privacy, security, documentation, and launch preparation

## Success Criteria

- All 15 correctness properties pass with 100+ iterations
- API response time p95 < 100ms
- System handles 10k+ concurrent real-time connections
- Cache hit rate > 80%
- Test coverage > 80%
- All accessibility requirements met (WCAG 2.1 AA)
- Platform parity between mobile and web
- Gradual rollout completed successfully

