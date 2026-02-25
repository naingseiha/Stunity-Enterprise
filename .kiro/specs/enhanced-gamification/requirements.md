# Requirements Document: Enhanced Gamification

## Introduction

This document specifies requirements for enhancing the existing gamification system in Stunity Enterprise, a school management and social e-learning platform. The enhancement expands beyond the current XP, badges, and leaderboard system to include diverse achievement categories, daily/weekly challenges, virtual currency, team-based social gamification, and deeper integration with academic performance data. The system must scale to millions of users across mobile (React Native) and web (Next.js) platforms, leveraging existing microservices architecture with PostgreSQL/Supabase backend.

## Glossary

- **Analytics_Service**: Microservice (port 3014) managing XP points, achievements, leaderboards, and quiz challenges
- **Achievement**: Digital badge or recognition earned by completing specific criteria
- **Challenge**: Time-bound goal or task that users can complete for rewards
- **Virtual_Currency**: In-app points (Stunity Coins) that users earn and spend on unlockables
- **Unlockable**: Digital item (avatar, theme, badge frame) purchasable with Virtual_Currency
- **Leaderboard**: Ranked list of users based on specific metrics
- **Streak**: Consecutive days of completing a specific activity
- **Team_Challenge**: Collaborative goal requiring multiple users to contribute
- **Milestone**: Significant progress point that triggers celebration UI
- **Feed_Service**: Microservice (port 3010) managing social feed posts
- **Auth_Service**: Microservice (port 3001) managing user profiles and notifications
- **Grade_Service**: Microservice (port 3007) managing academic performance data
- **Attendance_Service**: Microservice (port 3008) managing attendance records
- **Supabase_Realtime**: Real-time database subscription system for live updates
- **Achievement_Category**: Grouping of related achievements (Academic, Social, Attendance, Engagement)
- **Challenge_Type**: Classification of challenges (Daily, Weekly, Special_Event)
- **Reward_Tier**: Level of reward value (Bronze, Silver, Gold, Platinum)

## Requirements

### Requirement 1: Achievement Category System

**User Story:** As a student, I want to earn achievements across different categories, so that I can showcase diverse accomplishments beyond just academic performance.

#### Acceptance Criteria

1. THE Analytics_Service SHALL support achievement categories: Academic, Social, Attendance, Engagement, and Special_Event
2. WHEN an achievement is created, THE Analytics_Service SHALL assign it to exactly one Achievement_Category
3. THE Analytics_Service SHALL track user progress separately for each Achievement_Category
4. WHEN a user views achievements, THE System SHALL display them grouped by Achievement_Category
5. FOR ALL achievements in a category, the total count SHALL equal the sum of locked and unlocked achievements in that category (invariant property)
6. WHEN achievements are filtered by category, THE System SHALL return only achievements matching the specified Achievement_Category

### Requirement 2: Progressive Achievement Tiers

**User Story:** As a student, I want achievements to have multiple tiers, so that I can continue progressing in areas I've already mastered.

#### Acceptance Criteria

1. THE Analytics_Service SHALL support tiered achievements with Bronze, Silver, Gold, and Platinum levels
2. WHEN a user unlocks an achievement tier, THE Analytics_Service SHALL check if the next tier criteria is met
3. THE Analytics_Service SHALL enforce that higher tiers require strictly greater criteria values than lower tiers
4. WHEN displaying tiered achievements, THE System SHALL show current tier and progress toward next tier
5. FOR ALL tiered achievements, the tier order SHALL be Bronze < Silver < Gold < Platinum (invariant property)
6. THE Analytics_Service SHALL award XP points scaled by achievement tier (Bronze: 1x, Silver: 2x, Gold: 3x, Platinum: 5x)

### Requirement 3: Daily Challenge System

**User Story:** As a student, I want to complete daily challenges, so that I stay engaged with the platform regularly.

#### Acceptance Criteria

1. THE Analytics_Service SHALL generate three daily challenges per user at midnight UTC
2. WHEN a daily challenge is generated, THE Analytics_Service SHALL select from a pool of challenge templates appropriate to the user's grade level
3. THE Analytics_Service SHALL expire uncompleted daily challenges after 24 hours
4. WHEN a user completes a daily challenge, THE Analytics_Service SHALL award the specified Virtual_Currency amount
5. THE Analytics_Service SHALL track daily challenge completion streaks
6. WHEN a user completes all three daily challenges, THE Analytics_Service SHALL award a streak bonus of 50 Virtual_Currency
7. FOR ALL active daily challenges, the expiration timestamp SHALL be greater than the current timestamp (invariant property)

### Requirement 4: Weekly Challenge System

**User Story:** As a student, I want to work toward weekly challenges, so that I have longer-term goals beyond daily tasks.

#### Acceptance Criteria

1. THE Analytics_Service SHALL generate five weekly challenges per user every Monday at midnight UTC
2. WHEN a weekly challenge is generated, THE Analytics_Service SHALL assign difficulty levels (Easy, Medium, Hard) with corresponding reward multipliers
3. THE Analytics_Service SHALL expire uncompleted weekly challenges after 7 days
4. WHEN a user completes a weekly challenge, THE Analytics_Service SHALL award Virtual_Currency scaled by difficulty (Easy: 100, Medium: 250, Hard: 500)
5. THE Analytics_Service SHALL allow partial progress tracking for weekly challenges with incremental goals
6. WHEN a user completes all five weekly challenges, THE Analytics_Service SHALL award a completion bonus of 1000 Virtual_Currency
7. FOR ALL weekly challenges with partial progress, the current progress SHALL be less than or equal to the target goal (invariant property)

### Requirement 5: Virtual Currency System

**User Story:** As a student, I want to earn and spend virtual currency, so that I can unlock customization options and rewards.

#### Acceptance Criteria

1. THE Analytics_Service SHALL maintain a Virtual_Currency balance for each user
2. WHEN a user earns Virtual_Currency, THE Analytics_Service SHALL increment their balance by the earned amount
3. WHEN a user spends Virtual_Currency, THE Analytics_Service SHALL decrement their balance by the spent amount only if balance is sufficient
4. THE Analytics_Service SHALL prevent Virtual_Currency balance from becoming negative
5. THE Analytics_Service SHALL log all Virtual_Currency transactions with timestamp, amount, and transaction type
6. FOR ALL Virtual_Currency transactions, the sum of credits minus debits SHALL equal the current balance (invariant property)
7. WHEN Virtual_Currency is awarded, THE System SHALL display an animated notification showing the amount earned

### Requirement 6: Unlockable Items System

**User Story:** As a student, I want to purchase unlockable items with my virtual currency, so that I can customize my profile and celebrate my achievements.

#### Acceptance Criteria

1. THE Analytics_Service SHALL maintain a catalog of unlockable items including avatars, themes, badge frames, and profile effects
2. WHEN a user purchases an unlockable, THE Analytics_Service SHALL verify sufficient Virtual_Currency balance before completing the transaction
3. THE Analytics_Service SHALL mark purchased unlockables as owned by the user
4. THE Analytics_Service SHALL prevent duplicate purchases of the same unlockable
5. WHEN a user views the unlockables catalog, THE System SHALL display owned items, available items, and locked items requiring achievements
6. WHERE an unlockable requires an achievement, THE Analytics_Service SHALL only allow purchase after the achievement is unlocked
7. FOR ALL users, the set of owned unlockables SHALL be a subset of all available unlockables (invariant property)

### Requirement 7: Multi-Category Leaderboards

**User Story:** As a student, I want to see leaderboards for different categories, so that I can compete in areas that match my strengths.

#### Acceptance Criteria

1. THE Analytics_Service SHALL maintain separate leaderboards for: Total_XP, Academic_Performance, Social_Engagement, Attendance_Rate, and Challenge_Completion
2. WHEN leaderboard data is requested, THE Analytics_Service SHALL return rankings sorted in descending order by the specified metric
3. THE Analytics_Service SHALL support leaderboard scopes: School_Wide, Grade_Level, and Class_Specific
4. WHEN a user views a leaderboard, THE System SHALL highlight the user's current rank and position
5. THE Analytics_Service SHALL update leaderboard rankings in real-time using Supabase_Realtime subscriptions
6. FOR ALL leaderboard entries, ranks SHALL be sequential integers starting from 1 with no gaps for tied scores (invariant property)
7. THE Analytics_Service SHALL handle tied scores by assigning the same rank and skipping subsequent ranks appropriately

### Requirement 8: Time-Period Leaderboards

**User Story:** As a student, I want to see leaderboards for different time periods, so that I can compete in current challenges even if I joined late.

#### Acceptance Criteria

1. THE Analytics_Service SHALL support leaderboard time periods: All_Time, Monthly, Weekly, and Daily
2. WHEN a time period ends, THE Analytics_Service SHALL archive the leaderboard results
3. THE Analytics_Service SHALL reset Weekly leaderboards every Monday at midnight UTC
4. THE Analytics_Service SHALL reset Monthly leaderboards on the first day of each month at midnight UTC
5. THE Analytics_Service SHALL reset Daily leaderboards every day at midnight UTC
6. WHEN a user views archived leaderboards, THE System SHALL display historical rankings with the time period label
7. FOR ALL time-period leaderboards, the start timestamp SHALL be less than the end timestamp (invariant property)

### Requirement 9: Team Challenge System

**User Story:** As a student, I want to participate in team challenges with classmates, so that we can work together toward shared goals.

#### Acceptance Criteria

1. THE Analytics_Service SHALL allow creation of Team_Challenges with 2 to 50 participants
2. WHEN a Team_Challenge is created, THE Analytics_Service SHALL assign a unique identifier and set a deadline
3. THE Analytics_Service SHALL track individual contributions to the Team_Challenge goal
4. WHEN any team member makes progress, THE Analytics_Service SHALL update the team's total progress using Supabase_Realtime
5. WHEN a Team_Challenge is completed, THE Analytics_Service SHALL award Virtual_Currency to all participants proportional to their contribution
6. THE Analytics_Service SHALL allow team members to view a contribution breakdown showing each member's percentage
7. FOR ALL Team_Challenges, the sum of individual contributions SHALL equal the total team progress (invariant property)

### Requirement 10: Academic Integration - Grade-Based Achievements

**User Story:** As a student, I want to earn achievements based on my academic performance, so that my grades contribute to my gamification progress.

#### Acceptance Criteria

1. WHEN Grade_Service records a new grade, THE Analytics_Service SHALL evaluate grade-based achievement criteria
2. THE Analytics_Service SHALL award achievements for: Perfect_Score (100%), Honor_Roll (90%+ average), Improvement_Streak (3+ consecutive grade increases)
3. THE Analytics_Service SHALL calculate grade averages per subject and overall GPA for achievement evaluation
4. WHEN a student achieves Honor_Roll status, THE Analytics_Service SHALL award 500 Virtual_Currency
5. THE Analytics_Service SHALL track subject-specific mastery achievements (10+ assignments with 90%+ in a subject)
6. FOR ALL grade-based achievements, the triggering grade SHALL meet or exceed the achievement threshold (invariant property)

### Requirement 11: Attendance Integration - Streak Enhancements

**User Story:** As a student, I want enhanced attendance streak rewards, so that I'm motivated to maintain perfect attendance.

#### Acceptance Criteria

1. WHEN Attendance_Service records attendance, THE Analytics_Service SHALL update the user's attendance streak
2. THE Analytics_Service SHALL award milestone bonuses at streak days: 7, 30, 60, 90, 180, 365
3. THE Analytics_Service SHALL increase Virtual_Currency rewards exponentially with streak length (base: 10 coins per day, multiplier: 1.1^(streak/7))
4. WHEN a streak is broken, THE Analytics_Service SHALL store the previous streak as a personal record
5. THE Analytics_Service SHALL display a streak recovery grace period of 1 day for excused absences
6. WHEN a user reaches a 30-day streak, THE Analytics_Service SHALL unlock a special Attendance_Champion badge
7. FOR ALL active streaks, the streak count SHALL equal the number of consecutive attendance days (invariant property)

### Requirement 12: Assignment Completion Challenges

**User Story:** As a student, I want to earn rewards for completing assignments on time, so that I'm motivated to stay on top of my work.

#### Acceptance Criteria

1. WHEN an assignment is submitted before the deadline, THE Analytics_Service SHALL award 50 Virtual_Currency
2. THE Analytics_Service SHALL award bonus Virtual_Currency for early submissions (3+ days early: 25 bonus, 7+ days early: 50 bonus)
3. THE Analytics_Service SHALL track on-time submission streaks across all subjects
4. WHEN a student completes all assignments in a week on time, THE Analytics_Service SHALL award a 200 Virtual_Currency bonus
5. THE Analytics_Service SHALL create dynamic weekly challenges based on upcoming assignment deadlines
6. FOR ALL on-time submissions, the submission timestamp SHALL be less than or equal to the deadline timestamp (invariant property)

### Requirement 13: Social Engagement Achievements

**User Story:** As a student, I want to earn achievements for positive social interactions, so that I'm encouraged to engage constructively with the community.

#### Acceptance Criteria

1. WHEN Feed_Service records a post, comment, or like, THE Analytics_Service SHALL update social engagement metrics
2. THE Analytics_Service SHALL award achievements for: First_Post, Helpful_Commenter (10+ helpful reactions), Community_Builder (100+ interactions)
3. THE Analytics_Service SHALL track post quality metrics based on likes, comments, and shares received
4. WHEN a user's post receives 50+ likes, THE Analytics_Service SHALL award a Viral_Post achievement and 100 Virtual_Currency
5. THE Analytics_Service SHALL award daily bonuses for constructive engagement (posting study resources, helping peers)
6. THE Analytics_Service SHALL prevent achievement farming by rate-limiting social actions (max 50 counted interactions per hour)
7. FOR ALL social engagement achievements, the interaction count SHALL be greater than or equal to the achievement threshold (invariant property)

### Requirement 14: Milestone Celebration System

**User Story:** As a student, I want to see celebratory animations when I reach milestones, so that my achievements feel rewarding and memorable.

#### Acceptance Criteria

1. WHEN a user reaches a milestone, THE System SHALL display a full-screen celebration animation
2. THE System SHALL trigger celebrations for: Level_Up, Achievement_Unlock, Streak_Milestone, Challenge_Completion, Leaderboard_Top_10
3. THE System SHALL use platform-appropriate animations (Lottie for React Native, CSS animations for Next.js)
4. THE System SHALL display milestone details including rewards earned and next milestone target
5. THE System SHALL allow users to dismiss celebrations with a tap or click
6. THE System SHALL queue multiple celebrations and display them sequentially if triggered simultaneously
7. WHEN a celebration is displayed, THE System SHALL play a congratulatory sound effect (if device audio is enabled)

### Requirement 15: Progress Visualization Dashboard

**User Story:** As a student, I want to see visual representations of my progress, so that I can understand my strengths and areas for improvement.

#### Acceptance Criteria

1. THE System SHALL display a dashboard with progress charts for: XP_Over_Time, Achievement_Completion_Rate, Streak_History, Challenge_Success_Rate
2. THE System SHALL use chart types appropriate to data: line charts for time series, radial charts for category completion, bar charts for comparisons
3. THE System SHALL allow users to filter dashboard data by time period (Week, Month, Quarter, Year, All_Time)
4. THE System SHALL display comparative statistics showing user performance versus grade-level average
5. THE System SHALL highlight areas of strength (top 25% in category) and growth opportunities (bottom 50% in category)
6. THE System SHALL update dashboard visualizations in real-time when new data is available
7. FOR ALL progress charts, data points SHALL be ordered chronologically from oldest to newest (invariant property)

### Requirement 16: Notification System for Gamification Events

**User Story:** As a student, I want to receive notifications for gamification events, so that I stay informed about my progress and opportunities.

#### Acceptance Criteria

1. WHEN a gamification event occurs, THE Analytics_Service SHALL send a notification request to Auth_Service
2. THE System SHALL send notifications for: Achievement_Unlocked, Challenge_Available, Challenge_Expiring_Soon (6 hours before), Streak_At_Risk, Leaderboard_Position_Change (top 10 only)
3. THE System SHALL allow users to configure notification preferences per event type
4. THE System SHALL batch multiple notifications of the same type within a 1-hour window to prevent spam
5. THE System SHALL include deep links in notifications to navigate directly to relevant screens
6. WHEN a user taps a notification, THE System SHALL navigate to the appropriate screen with context (achievement details, challenge page, leaderboard)
7. THE System SHALL respect device notification settings and platform-specific notification guidelines

### Requirement 17: Real-Time Updates via Supabase

**User Story:** As a student, I want to see real-time updates to leaderboards and team challenges, so that I can react to changes as they happen.

#### Acceptance Criteria

1. THE Analytics_Service SHALL publish gamification events to Supabase_Realtime channels
2. THE System SHALL subscribe to real-time updates for: Leaderboard_Changes, Team_Challenge_Progress, Achievement_Unlocks (for friends)
3. WHEN a subscribed event occurs, THE System SHALL update the UI within 2 seconds without requiring a manual refresh
4. THE System SHALL handle connection interruptions gracefully and resubscribe automatically when connection is restored
5. THE System SHALL limit real-time subscriptions to currently visible screens to conserve resources
6. WHEN a user navigates away from a screen, THE System SHALL unsubscribe from associated real-time channels
7. THE System SHALL batch rapid updates (multiple events within 500ms) to prevent UI thrashing

### Requirement 18: Challenge Template System

**User Story:** As a platform administrator, I want to create challenge templates, so that the system can generate varied and appropriate challenges for different users.

#### Acceptance Criteria

1. THE Analytics_Service SHALL maintain a library of challenge templates with configurable parameters
2. WHEN generating challenges, THE Analytics_Service SHALL select templates appropriate to user grade level and historical activity
3. THE Analytics_Service SHALL support template parameters: Target_Value, Time_Limit, Reward_Amount, Required_Achievement
4. THE Analytics_Service SHALL prevent duplicate challenge types from being assigned to the same user in the same time period
5. THE Analytics_Service SHALL weight template selection based on user engagement patterns (prefer challenge types the user has completed before)
6. THE Analytics_Service SHALL support seasonal and event-based template activation (e.g., exam preparation challenges during exam periods)
7. FOR ALL generated challenges, the template parameters SHALL be within defined min/max bounds (invariant property)

### Requirement 19: Achievement Announcement in Feed

**User Story:** As a student, I want my achievements to be shared in the social feed, so that my friends can celebrate my accomplishments with me.

#### Acceptance Criteria

1. WHEN a user unlocks a significant achievement (Gold tier or higher), THE Analytics_Service SHALL create a post in Feed_Service
2. THE System SHALL allow users to configure achievement sharing preferences (All, Major_Only, Friends_Only, None)
3. THE System SHALL format achievement posts with: Achievement_Icon, Achievement_Name, User_Name, Timestamp, Congratulatory_Message
4. WHEN friends view an achievement post, THE System SHALL display a "Congratulate" reaction option
5. THE System SHALL aggregate congratulations and display the count on the achievement post
6. THE System SHALL prevent achievement post spam by limiting to 3 achievement posts per user per day
7. WHEN a user receives 10+ congratulations, THE Analytics_Service SHALL award a Social_Star bonus of 50 Virtual_Currency

### Requirement 20: Data Export and Analytics

**User Story:** As a student, I want to export my gamification data, so that I can track my progress over time and share it with parents or teachers.

#### Acceptance Criteria

1. THE Analytics_Service SHALL provide an export endpoint that generates a JSON file with user gamification data
2. THE System SHALL include in exports: Achievement_History, XP_Timeline, Challenge_Completion_Records, Virtual_Currency_Transactions, Leaderboard_History
3. THE System SHALL format exported data according to a documented schema version
4. WHEN a user requests an export, THE System SHALL generate the file within 30 seconds
5. THE System SHALL allow users to export data for custom date ranges
6. THE System SHALL include data visualization recommendations in the export metadata
7. FOR ALL exported data, parsing the JSON then serializing it SHALL produce valid JSON matching the schema (round-trip property)

### Requirement 21: Performance and Scalability

**User Story:** As a platform operator, I want the gamification system to scale efficiently, so that it can handle millions of concurrent users without degradation.

#### Acceptance Criteria

1. THE Analytics_Service SHALL process achievement evaluations within 100ms for 95% of requests
2. THE Analytics_Service SHALL handle at least 10,000 concurrent real-time subscriptions per instance
3. THE Analytics_Service SHALL use database indexing on: user_id, achievement_id, challenge_id, leaderboard_type, timestamp
4. THE Analytics_Service SHALL implement caching for leaderboard data with 60-second TTL
5. THE Analytics_Service SHALL use batch processing for daily challenge generation (process 1000 users per batch)
6. THE Analytics_Service SHALL implement rate limiting: 100 requests per minute per user for gamification endpoints
7. WHEN system load exceeds 80% capacity, THE Analytics_Service SHALL scale horizontally on Google Cloud Run

### Requirement 22: Data Consistency and Integrity

**User Story:** As a platform operator, I want gamification data to remain consistent, so that users have accurate and trustworthy progress tracking.

#### Acceptance Criteria

1. THE Analytics_Service SHALL use database transactions for all Virtual_Currency operations
2. THE Analytics_Service SHALL implement optimistic locking for concurrent achievement unlock attempts
3. THE Analytics_Service SHALL validate all achievement criteria before awarding achievements
4. WHEN data inconsistencies are detected, THE Analytics_Service SHALL log the error and trigger an alert
5. THE Analytics_Service SHALL implement idempotent achievement unlock operations (unlocking twice has same effect as unlocking once)
6. THE Analytics_Service SHALL reconcile leaderboard rankings daily at midnight UTC to correct any drift
7. FOR ALL Virtual_Currency transactions, the database SHALL enforce a check constraint preventing negative balances (invariant property)

### Requirement 23: Mobile and Web Platform Parity

**User Story:** As a student, I want the same gamification features on mobile and web, so that I have a consistent experience across devices.

#### Acceptance Criteria

1. THE System SHALL provide identical gamification functionality on React Native mobile app and Next.js web app
2. THE System SHALL synchronize gamification state across devices in real-time using Supabase_Realtime
3. THE System SHALL adapt UI components to platform conventions (bottom sheets on mobile, modals on web)
4. THE System SHALL use responsive design for dashboard visualizations that work on screen sizes from 320px to 2560px width
5. THE System SHALL optimize animations for mobile performance (60 FPS target on mid-range devices)
6. THE System SHALL support offline mode for viewing cached gamification data (read-only)
7. WHEN connectivity is restored after offline mode, THE System SHALL sync any pending actions and update local state

### Requirement 24: Accessibility and Inclusivity

**User Story:** As a student with accessibility needs, I want the gamification system to be fully accessible, so that I can participate equally in all features.

#### Acceptance Criteria

1. THE System SHALL provide screen reader labels for all gamification UI elements
2. THE System SHALL support keyboard navigation for all interactive gamification features on web
3. THE System SHALL use color combinations meeting WCAG 2.1 AA contrast requirements (4.5:1 for text)
4. THE System SHALL provide text alternatives for all achievement icons and visual indicators
5. THE System SHALL support reduced motion preferences by disabling animations when requested
6. THE System SHALL allow font size scaling up to 200% without breaking layouts
7. THE System SHALL provide haptic feedback for milestone celebrations on mobile devices with haptic support

### Requirement 25: Privacy and Data Protection

**User Story:** As a student, I want control over my gamification data visibility, so that I can maintain my privacy preferences.

#### Acceptance Criteria

1. THE System SHALL allow users to set profile visibility: Public, Friends_Only, or Private
2. WHEN profile is set to Private, THE System SHALL exclude the user from public leaderboards
3. THE System SHALL allow users to opt out of achievement sharing in Feed_Service
4. THE System SHALL anonymize user data in aggregate analytics and reports
5. THE System SHALL comply with data retention policies by archiving gamification data older than 2 years
6. THE System SHALL provide a data deletion endpoint that removes all user gamification data when requested
7. WHEN a user deletes their account, THE Analytics_Service SHALL remove all personally identifiable gamification data within 30 days

## Correctness Properties for Property-Based Testing

### Property 1: Virtual Currency Balance Invariant
FOR ALL sequences of Virtual_Currency transactions (credits and debits), the final balance SHALL equal the sum of all credits minus the sum of all debits, and SHALL never be negative.

### Property 2: Achievement Unlock Idempotence
FOR ALL achievements, unlocking the same achievement multiple times SHALL result in the same state as unlocking it once (idempotent operation).

### Property 3: Leaderboard Ranking Consistency
FOR ALL leaderboards, if user A has a higher score than user B, then user A's rank SHALL be less than or equal to user B's rank (with equality only for tied scores).

### Property 4: Challenge Progress Monotonicity
FOR ALL challenges with progress tracking, the progress value SHALL never decrease unless the challenge is reset or expired.

### Property 5: Team Challenge Contribution Sum
FOR ALL Team_Challenges, the sum of individual member contributions SHALL equal the total team progress at any point in time.

### Property 6: Streak Calculation Correctness
FOR ALL attendance or activity streaks, the streak count SHALL equal the number of consecutive days with recorded activity, starting from the most recent day.

### Property 7: Achievement Tier Ordering
FOR ALL tiered achievements, the criteria threshold for tier N+1 SHALL be strictly greater than the threshold for tier N.

### Property 8: Time Period Leaderboard Boundaries
FOR ALL time-period leaderboards, every included data point's timestamp SHALL fall within the leaderboard's start and end timestamps (inclusive).

### Property 9: Export-Import Round Trip
FOR ALL gamification data exports, parsing the exported JSON and then serializing it SHALL produce valid JSON that matches the original export schema.

### Property 10: Real-Time Update Convergence
FOR ALL real-time subscriptions, after all pending updates are processed, the client state SHALL converge to match the server state within 5 seconds.

### Property 11: Challenge Generation Uniqueness
FOR ALL daily or weekly challenge generation cycles, no two active challenges for the same user SHALL have the same challenge template type.

### Property 12: Reward Scaling Consistency
FOR ALL achievement tiers with reward multipliers, the reward amount SHALL increase monotonically with tier level (Bronze < Silver < Gold < Platinum).

### Property 13: Notification Batching Correctness
FOR ALL notification batches, the number of individual notifications SHALL be greater than or equal to 1, and the batch timestamp SHALL be within the batching window.

### Property 14: Unlockable Purchase Validation
FOR ALL unlockable purchases, the user's Virtual_Currency balance before purchase SHALL be greater than or equal to the item cost, and the balance after purchase SHALL equal the balance before minus the cost.

### Property 15: Grade-Based Achievement Threshold
FOR ALL grade-based achievements, the triggering grade value SHALL meet or exceed the achievement's defined threshold value.

---

## Notes

- All timestamps use UTC timezone
- All monetary values (Virtual_Currency) use integer representation to avoid floating-point precision issues
- Real-time updates use Supabase Realtime channels with automatic reconnection
- The system follows the existing Stunity Enterprise brand guidelines (Primary color: #0EA5E9)
- Integration with existing services (analytics-service, feed-service, auth-service, grade-service, attendance-service) uses REST APIs with JWT authentication
- Database schema changes will be managed through Prisma migrations
- All user-facing text supports internationalization (i18n) for future localization
