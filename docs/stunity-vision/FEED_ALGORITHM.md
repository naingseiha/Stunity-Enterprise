# 🎯 Stunity Feed Algorithm - "The Learning Intelligence Engine"

**Version:** 1.0  
**Date:** January 27, 2026  
**Status:** Planning Phase

---

## 🌟 Overview

**The Stunity Feed Algorithm** is a sophisticated content recommendation engine that learns from user behavior to deliver personalized, engaging educational content. Inspired by the best practices from Facebook, TikTok, X (Twitter), and LinkedIn, but specifically designed for learning and education.

**Goal:** Surface the right educational content to the right learner at the right time.

---

## 📚 Table of Contents

1. [How Major Platforms Do It](#how-major-platforms-do-it)
2. [The Stunity Algorithm](#the-stunity-algorithm)
3. [Engagement Signals](#engagement-signals)
4. [Scoring System](#scoring-system)
5. [User Interest Profiling](#user-interest-profiling)
6. [Content Ranking](#content-ranking)
7. [Post Types & Weights](#post-types--weights)
8. [Analytics & Insights](#analytics--insights)
9. [Implementation](#implementation)
10. [Machine Learning](#machine-learning)

---

## 🔍 How Major Platforms Do It

### Facebook Algorithm (EdgeRank Evolution)

**Key Factors:**
1. **Affinity Score**: How close you are to the creator (interactions, messages, profile visits)
2. **Content Type**: Video > Images > Links > Text
3. **Recency**: Newer posts rank higher
4. **Engagement Velocity**: How fast posts get engagement
5. **Time Spent**: How long you view content
6. **Negative Signals**: Hide, report, unfollow

**Formula (Simplified):**
```
Score = Affinity × Content_Weight × Time_Decay × Engagement_Rate
```

---

### TikTok Algorithm (For You Page)

**Key Factors:**
1. **Completion Rate**: Did you watch the whole video?
2. **Re-watches**: Did you watch multiple times?
3. **Likes, Comments, Shares**: Engagement signals
4. **User Interests**: Hashtags, topics you engage with
5. **Device & Account Settings**: Language, location
6. **Not Interested**: Skip signals

**What Makes It Unique:**
- Heavy weight on **completion rate** (finished watching)
- Shows content from creators you DON'T follow (discovery)
- Very fast feedback loop (hours, not days)

**Formula (Simplified):**
```
Score = (Completion_Rate × 10) + Likes + (Comments × 2) + (Shares × 3) 
        - Skips - Time_Decay
```

---

### X/Twitter Algorithm

**Key Factors:**
1. **Engagement**: Likes, retweets, replies, quote tweets
2. **Recency**: Very time-sensitive
3. **Author Authority**: Verified accounts, follower count
4. **User Interests**: Topics, accounts you interact with
5. **Tweet Type**: Media tweets rank higher
6. **Conversation Quality**: Reply depth, discussion length

**Formula (Simplified):**
```
Score = (Likes + Retweets × 2 + Replies × 3) × Author_Score × Recency_Factor
```

---

### LinkedIn Algorithm

**Key Factors:**
1. **Personal Connections**: 1st, 2nd, 3rd degree connections
2. **Dwell Time**: How long you read the post
3. **Content Quality**: Original content > shares
4. **Engagement Type**: Comments > Likes > Views
5. **Professional Relevance**: Industry, job title, skills
6. **Recency**: Decays slower than Twitter

**Formula (Simplified):**
```
Score = Connection_Strength × (Comments × 3 + Likes + Shares × 2) 
        × Professional_Relevance × Time_Decay
```

---

## 🎓 The Stunity Algorithm

### Core Principles

1. **Education-First**: Prioritize learning value over viral content
2. **Personalization**: Everyone gets a unique feed based on interests and goals
3. **Discovery**: Introduce new topics and connections
4. **Quality over Quantity**: High-value content ranks higher
5. **Learning Path Awareness**: Consider user's current courses and goals
6. **Multi-Type Support**: Different algorithms for different post types

---

### The Stunity Score Formula

```
Stunity_Score = (Engagement_Score × 0.4) 
              + (Relevance_Score × 0.3)
              + (Quality_Score × 0.2)
              + (Recency_Score × 0.1)
              - (Negative_Signals × 0.5)
```

Let's break down each component:

---

## 📊 Engagement Signals

### Primary Engagement Actions

| Action | Weight | Points | Reasoning |
|--------|--------|--------|-----------|
| **View** | 1x | 1 | Basic interest signal |
| **Like/React** | 2x | 2 | Positive sentiment |
| **Comment** | 5x | 5 | High engagement, creates discussion |
| **Share** | 7x | 7 | Endorsement, extends reach |
| **Save/Bookmark** | 4x | 4 | Future reference, high value |
| **Click Details** | 3x | 3 | Deep interest |
| **Profile Visit** | 3x | 3 | Interest in creator |
| **Follow Author** | 10x | 10 | Strong affinity signal |

### Educational-Specific Actions

| Action | Weight | Points | Reasoning |
|--------|--------|--------|-----------|
| **Enroll in Course** | 15x | 15 | Strongest conversion signal |
| **Start Quiz** | 8x | 8 | Active learning |
| **Complete Quiz** | 12x | 12 | High engagement |
| **Submit Assignment** | 10x | 10 | Deep engagement |
| **Join Study Group** | 10x | 10 | Community engagement |
| **Download Materials** | 6x | 6 | Content value |
| **Watch Video** | Variable | 1-10 | Based on % watched |
| **Take Notes** | 8x | 8 | Active learning signal |

### Time-Based Signals

| Signal | Measurement | Impact |
|--------|-------------|--------|
| **Dwell Time** | Seconds on post | +1 point per 10 seconds (max 20) |
| **Video Completion** | % watched | 0% = 0, 50% = 5, 100% = 10 |
| **Reading Time** | Est. vs Actual | Match = +5, Below = -2 |
| **Return Visits** | Multiple views | +3 per return (max 9) |

### Negative Signals

| Action | Weight | Impact |
|--------|--------|--------|
| **Hide Post** | -10x | -10 | Strong disinterest |
| **Report** | -20x | -20 | Harmful content |
| **Unfollow** | -15x | -15 | Broken relationship |
| **Quick Scroll** | -1x | -1 | Not interesting |
| **Not Interested** | -5x | -5 | Explicit feedback |
| **Skip Video** | -2x | -2 | Content mismatch |

---

## 🧮 Scoring System

### 1. Engagement Score (40% weight)

```javascript
function calculateEngagementScore(post) {
  const baseEngagement = 
    (post.views × 1) +
    (post.likes × 2) +
    (post.comments × 5) +
    (post.shares × 7) +
    (post.saves × 4) +
    (post.clicks × 3)
  
  // Educational actions
  const eduEngagement = 
    (post.enrollments × 15) +
    (post.quizStarts × 8) +
    (post.quizCompletions × 12) +
    (post.downloads × 6)
  
  // Time-based
  const timeEngagement = 
    Math.min(post.avgDwellTime / 10, 20) +
    (post.videoCompletionRate * 10)
  
  // Normalize by age (older posts get adjusted)
  const ageInHours = (Date.now() - post.createdAt) / (1000 * 60 * 60)
  const ageMultiplier = 1 / Math.log(ageInHours + 2)
  
  return (baseEngagement + eduEngagement + timeEngagement) * ageMultiplier
}
```

### 2. Relevance Score (30% weight)

```javascript
function calculateRelevanceScore(post, user) {
  let score = 0
  
  // Topic relevance (0-100)
  const topicMatch = calculateTopicSimilarity(post.topics, user.interests)
  score += topicMatch * 0.4
  
  // Course relevance
  if (post.relatedCourses) {
    const enrolledMatch = post.relatedCourses.filter(c => 
      user.enrolledCourses.includes(c)
    ).length
    score += enrolledMatch * 10
  }
  
  // Skill relevance
  const skillMatch = calculateSkillMatch(post.skills, user.targetSkills)
  score += skillMatch * 0.3
  
  // Level appropriateness
  if (post.difficulty === user.currentLevel) {
    score += 20
  } else if (Math.abs(post.difficulty - user.currentLevel) === 1) {
    score += 10 // Close enough
  }
  
  // Author affinity
  if (user.following.includes(post.authorId)) {
    score += 30
  }
  if (user.connections.includes(post.authorId)) {
    score += 20
  }
  
  return Math.min(score, 100) // Cap at 100
}
```

### 3. Quality Score (20% weight)

```javascript
function calculateQualityScore(post) {
  let score = 0
  
  // Author credibility
  score += Math.min(post.author.reputation / 10, 20)
  
  // Content completeness
  if (post.hasMedia) score += 10
  if (post.hasDescription && post.description.length > 100) score += 10
  if (post.hasHashtags) score += 5
  if (post.hasResources) score += 10
  
  // Engagement rate (engagement / views)
  const engagementRate = (post.likes + post.comments) / Math.max(post.views, 1)
  score += Math.min(engagementRate * 100, 30)
  
  // Content originality
  if (post.isOriginal) score += 15
  
  // Verification
  if (post.isVerified) score += 10
  if (post.author.isVerified) score += 5
  
  return Math.min(score, 100)
}
```

### 4. Recency Score (10% weight)

```javascript
function calculateRecencyScore(post) {
  const ageInHours = (Date.now() - post.createdAt) / (1000 * 60 * 60)
  
  // Decay function - fast decay in first 24 hours, then slower
  if (ageInHours < 1) {
    return 100
  } else if (ageInHours < 24) {
    return 100 - (ageInHours * 2)
  } else if (ageInHours < 168) { // 1 week
    return 50 - ((ageInHours - 24) / 6)
  } else {
    return Math.max(10, 25 - (ageInHours / 168))
  }
}
```

---

## 👤 User Interest Profiling

### Building the User Profile

```javascript
const UserProfile = {
  // Demographics
  userId: string,
  role: 'student' | 'teacher' | 'researcher',
  level: 'beginner' | 'intermediate' | 'advanced',
  
  // Interests (weighted)
  topics: [
    { name: 'Mathematics', weight: 85 },
    { name: 'Computer Science', weight: 90 },
    { name: 'Physics', weight: 60 }
  ],
  
  // Skills (current + target)
  currentSkills: ['Python', 'React', 'Math'],
  targetSkills: ['Machine Learning', 'Data Science'],
  skillLevels: {
    'Python': 75,
    'React': 60
  },
  
  // Behavior patterns
  engagement: {
    avgSessionTime: 25, // minutes
    postsPerDay: 3,
    commentsPerWeek: 10,
    preferredTime: '18:00-22:00',
    preferredDays: ['Mon', 'Wed', 'Fri']
  },
  
  // Content preferences
  preferences: {
    postTypes: {
      'video': 80,
      'article': 70,
      'quiz': 90,
      'discussion': 60
    },
    contentLength: 'medium', // short, medium, long
    difficulty: 'intermediate'
  },
  
  // Relationships
  following: ['userId1', 'userId2'],
  connections: ['userId3', 'userId4'],
  affinityScores: {
    'userId1': 95, // High affinity
    'userId2': 60
  },
  
  // Learning context
  enrolledCourses: ['courseId1', 'courseId2'],
  completedCourses: ['courseId3'],
  currentGoals: ['Learn ML', 'Get certified in Python'],
  
  // Negative signals
  hiddenTopics: ['Politics'],
  mutedUsers: ['userId5'],
  dislikedContentTypes: ['long-text']
}
```

### Updating User Profile

```javascript
// Real-time updates
function updateUserProfile(userId, action, content) {
  const profile = getUserProfile(userId)
  
  switch(action) {
    case 'like':
      // Boost topic weights
      content.topics.forEach(topic => {
        profile.topics[topic] = (profile.topics[topic] || 0) + 1
      })
      break
      
    case 'enroll':
      // Strong signal - boost significantly
      content.topics.forEach(topic => {
        profile.topics[topic] = (profile.topics[topic] || 0) + 10
      })
      profile.enrolledCourses.push(content.id)
      break
      
    case 'hide':
      // Negative signal
      content.topics.forEach(topic => {
        profile.topics[topic] = Math.max((profile.topics[topic] || 0) - 5, 0)
      })
      break
      
    case 'dwell':
      // Time spent indicates interest
      if (action.dwellTime > 30) { // 30 seconds
        content.topics.forEach(topic => {
          profile.topics[topic] = (profile.topics[topic] || 0) + 2
        })
      }
      break
  }
  
  // Normalize weights (prevent inflation)
  normalizeWeights(profile.topics)
  
  saveUserProfile(profile)
}
```

---

## 🏆 Content Ranking

### Feed Generation Process

```javascript
async function generateFeed(userId, limit = 20) {
  const user = await getUserProfile(userId)
  const posts = await getCandidatePosts(userId, limit * 10) // Get 10x candidates
  
  // Score each post
  const scoredPosts = posts.map(post => {
    const engagementScore = calculateEngagementScore(post)
    const relevanceScore = calculateRelevanceScore(post, user)
    const qualityScore = calculateQualityScore(post)
    const recencyScore = calculateRecencyScore(post)
    const negativeSignals = calculateNegativeSignals(post, user)
    
    const finalScore = 
      (engagementScore * 0.4) +
      (relevanceScore * 0.3) +
      (qualityScore * 0.2) +
      (recencyScore * 0.1) -
      (negativeSignals * 0.5)
    
    return {
      ...post,
      score: finalScore,
      breakdown: { engagementScore, relevanceScore, qualityScore, recencyScore }
    }
  })
  
  // Sort by score
  scoredPosts.sort((a, b) => b.score - a.score)
  
  // Apply diversity (don't show all posts from same author)
  const diversifiedPosts = applyDiversity(scoredPosts, user)
  
  // Insert discovery content (10% of feed)
  const finalFeed = insertDiscoveryContent(diversifiedPosts, user, limit)
  
  return finalFeed.slice(0, limit)
}
```

### Diversity & Discovery

```javascript
function applyDiversity(posts, user) {
  const diversified = []
  const authorCount = {}
  const topicCount = {}
  
  for (const post of posts) {
    // Limit posts per author (max 3 in top 20)
    if ((authorCount[post.authorId] || 0) >= 3) {
      continue
    }
    
    // Ensure topic diversity (max 5 posts on same topic)
    const mainTopic = post.topics[0]
    if ((topicCount[mainTopic] || 0) >= 5) {
      continue
    }
    
    diversified.push(post)
    authorCount[post.authorId] = (authorCount[post.authorId] || 0) + 1
    topicCount[mainTopic] = (topicCount[mainTopic] || 0) + 1
    
    if (diversified.length >= 18) break // Leave room for discovery
  }
  
  return diversified
}

function insertDiscoveryContent(posts, user, limit) {
  // Get 2-3 posts outside user's usual interests
  const discoveryPosts = await getDiscoveryPosts(user, 3)
  
  // Insert at strategic positions (positions 5, 10, 15)
  const positions = [5, 10, 15]
  positions.forEach((pos, idx) => {
    if (discoveryPosts[idx] && posts.length > pos) {
      posts.splice(pos, 0, {
        ...discoveryPosts[idx],
        isDiscovery: true,
        reason: "Recommended for you"
      })
    }
  })
  
  return posts
}
```

---

## 📝 Post Types & Weights

### Different Algorithms for Different Content

```javascript
const PostTypeConfigs = {
  'general-post': {
    engagementWeight: 0.4,
    relevanceWeight: 0.3,
    qualityWeight: 0.2,
    recencyWeight: 0.1
  },
  
  'course': {
    engagementWeight: 0.3, // Less viral, more intentional
    relevanceWeight: 0.5,  // HIGH - must match interests
    qualityWeight: 0.15,
    recencyWeight: 0.05    // Courses are evergreen
  },
  
  'quiz': {
    engagementWeight: 0.35,
    relevanceWeight: 0.4,
    qualityWeight: 0.15,
    recencyWeight: 0.1
  },
  
  'question': {
    engagementWeight: 0.3,
    relevanceWeight: 0.3,
    qualityWeight: 0.2,
    recencyWeight: 0.2     // Questions need quick answers
  },
  
  'exam': {
    engagementWeight: 0.2,
    relevanceWeight: 0.6,  // VERY HIGH - only show relevant exams
    qualityWeight: 0.15,
    recencyWeight: 0.05
  },
  
  'discussion': {
    engagementWeight: 0.4,
    relevanceWeight: 0.3,
    qualityWeight: 0.2,
    recencyWeight: 0.1
  },
  
  'announcement': {
    engagementWeight: 0.2,
    relevanceWeight: 0.5,
    qualityWeight: 0.1,
    recencyWeight: 0.2     // Announcements are time-sensitive
  }
}
```

---

## 📈 Analytics & Insights

### For Content Creators (Students, Teachers, Educators)

#### Post Performance Dashboard

```javascript
const PostAnalytics = {
  postId: string,
  
  // Reach metrics
  reach: {
    impressions: 5420,      // How many times shown
    uniqueViews: 3210,      // Unique users who saw it
    reach: 3500,            // Users in whose feed it appeared
    reachRate: 0.65         // uniqueViews / reach
  },
  
  // Engagement metrics
  engagement: {
    likes: 234,
    comments: 45,
    shares: 12,
    saves: 67,
    clicks: 156,
    engagementRate: 0.095   // total engagement / uniqueViews
  },
  
  // Educational metrics (if applicable)
  educational: {
    enrollments: 23,
    quizStarts: 45,
    quizCompletions: 38,
    avgQuizScore: 85,
    downloads: 34,
    conversionRate: 0.72    // enrollments / clicks
  },
  
  // Time metrics
  time: {
    avgDwellTime: 45,       // seconds
    avgVideoCompletion: 78, // %
    avgReadingTime: 120     // seconds
  },
  
  // Audience breakdown
  audience: {
    byRole: {
      'student': 80%,
      'teacher': 15%,
      'researcher': 5%
    },
    byLevel: {
      'beginner': 40%,
      'intermediate': 50%,
      'advanced': 10%
    },
    byLocation: {
      'Cambodia': 70%,
      'Thailand': 20%,
      'Other': 10%
    }
  },
  
  // Algorithm insights
  algorithm: {
    avgScore: 67.5,
    topPerformingAudience: 'Intermediate students interested in Math',
    peakEngagementTime: '18:00-20:00',
    suggestedImprovements: [
      'Add video content for higher engagement',
      'Use hashtag #Mathematics for better discovery',
      'Post during 18:00-20:00 for maximum reach'
    ]
  },
  
  // Comparison
  comparison: {
    vsOwnAverage: '+25%',
    vsCategory: '+15%',
    vsSimilarPosts: '+10%'
  }
}
```

#### Creator Dashboard

```javascript
const CreatorAnalytics = {
  userId: string,
  period: '7days' | '30days' | '90days',
  
  // Overall metrics
  summary: {
    totalPosts: 24,
    totalImpressions: 125000,
    totalEngagement: 8500,
    avgEngagementRate: 0.068,
    followerGrowth: +123
  },
  
  // Content performance
  topPosts: [
    { postId, title, impressions, engagement, score },
    // Top 10
  ],
  
  lowPosts: [
    { postId, title, impressions, engagement, score, issues: ['Low relevance', 'Posted at off-peak time'] },
    // Bottom 5
  ],
  
  // Audience insights
  audience: {
    demographics: { /* age, role, level, location */ },
    interests: ['Mathematics', 'Science', 'Programming'],
    engagementPatterns: {
      mostActiveDay: 'Monday',
      mostActiveTime: '19:00',
      avgSessionTime: 15 // minutes
    }
  },
  
  // Growth trends
  growth: {
    followers: [
      { date: '2026-01-20', count: 450 },
      { date: '2026-01-21', count: 465 },
      // Daily data
    ],
    engagement: [ /* daily engagement */ ],
    reach: [ /* daily reach */ ]
  },
  
  // Recommendations
  recommendations: [
    {
      type: 'timing',
      suggestion: 'Post between 18:00-20:00 for 35% more engagement',
      impact: '+35% engagement'
    },
    {
      type: 'content',
      suggestion: 'Add more video content - your videos get 2x more engagement',
      impact: '+100% engagement'
    },
    {
      type: 'topics',
      suggestion: 'Your audience is interested in "Machine Learning" - create content about it',
      impact: 'Potential +50% reach'
    }
  ]
}
```

---

## 💻 Implementation

### Database Schema (Additions)

```prisma
// Track all user actions for algorithm
model UserAction {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  action        ActionType
  targetType    String   // 'post', 'course', 'user', 'quiz'
  targetId      String
  
  // Context
  dwellTime     Int?     // seconds
  completion    Float?   // 0-1 for videos, quizzes
  deviceType    String?  // mobile, desktop, tablet
  referrer      String?  // where they came from
  
  // Metadata
  metadata      Json?    // Additional data
  
  createdAt     DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([targetId, targetType])
}

enum ActionType {
  VIEW
  LIKE
  COMMENT
  SHARE
  SAVE
  CLICK
  ENROLL
  START_QUIZ
  COMPLETE_QUIZ
  DOWNLOAD
  FOLLOW
  HIDE
  REPORT
  SKIP
}

// User interest profile
model UserInterest {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  topic         String
  weight        Float    @default(0) // 0-100
  
  lastUpdated   DateTime @updatedAt
  
  @@unique([userId, topic])
  @@index([userId])
}

// Post performance metrics
model PostAnalytics {
  id            String   @id @default(cuid())
  postId        String   @unique
  post          Post     @relation(fields: [postId], references: [id])
  
  // Reach
  impressions   Int      @default(0)
  uniqueViews   Int      @default(0)
  reach         Int      @default(0)
  
  // Engagement
  likes         Int      @default(0)
  comments      Int      @default(0)
  shares        Int      @default(0)
  saves         Int      @default(0)
  clicks        Int      @default(0)
  
  // Educational
  enrollments   Int      @default(0)
  quizStarts    Int      @default(0)
  quizCompletions Int    @default(0)
  downloads     Int      @default(0)
  
  // Time
  totalDwellTime Int     @default(0) // seconds
  avgDwellTime   Float   @default(0)
  
  // Calculated
  engagementRate Float   @default(0)
  algorithmScore Float   @default(0)
  
  updatedAt     DateTime @updatedAt
}

// Feed cache for performance
model FeedCache {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  
  posts         Json     // Array of post IDs with scores
  
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  
  @@index([userId, expiresAt])
}
```

### API Endpoints

```typescript
// Get personalized feed
GET /api/feed?limit=20&offset=0

// Track user action
POST /api/actions
{
  action: 'like' | 'view' | 'enroll' | ...,
  targetType: 'post' | 'course' | ...,
  targetId: string,
  metadata?: {
    dwellTime?: number,
    completion?: number
  }
}

// Get post analytics
GET /api/analytics/post/:postId

// Get creator analytics
GET /api/analytics/creator/:userId?period=30days

// Get user interests
GET /api/users/:userId/interests

// Update feed preferences
PUT /api/feed/preferences
{
  contentTypes: ['video', 'article'],
  topics: ['math', 'science'],
  difficulty: 'intermediate'
}
```

---

## 🤖 Machine Learning

### Phase 1: Rule-Based Algorithm (Now)
Use the weighted scoring system described above.

### Phase 2: Collaborative Filtering (3-6 months)
```python
# "Users who liked X also liked Y"
from surprise import SVD, Dataset, Reader

# Build recommendation model
reader = Reader(rating_scale=(1, 5))
data = Dataset.load_from_df(user_ratings[['userId', 'postId', 'rating']], reader)

model = SVD(n_factors=100, n_epochs=20)
model.fit(data.build_full_trainset())

# Predict interest
prediction = model.predict(userId, postId)
```

### Phase 3: Deep Learning (6-12 months)
```python
# Neural network for content recommendation
import tensorflow as tf

model = tf.keras.Sequential([
  # User embedding
  tf.keras.layers.Embedding(num_users, 64, input_length=1),
  
  # Content embedding
  tf.keras.layers.Embedding(num_posts, 64, input_length=1),
  
  # Combine
  tf.keras.layers.Flatten(),
  tf.keras.layers.Concatenate(),
  
  # Deep layers
  tf.keras.layers.Dense(128, activation='relu'),
  tf.keras.layers.Dropout(0.3),
  tf.keras.layers.Dense(64, activation='relu'),
  tf.keras.layers.Dense(1, activation='sigmoid')
])

# Train on user interactions
model.compile(optimizer='adam', loss='binary_crossentropy')
model.fit([user_ids, post_ids], interactions, epochs=10)
```

### Phase 4: Reinforcement Learning (12+ months)
Learn optimal content ordering through continuous A/B testing and user feedback.

---

## 📊 A/B Testing Framework

```javascript
const ABTest = {
  id: 'feed_algorithm_v2',
  name: 'New Engagement Weights',
  variants: [
    {
      id: 'control',
      weight: 0.5,
      config: {
        engagementWeight: 0.4,
        relevanceWeight: 0.3,
        qualityWeight: 0.2,
        recencyWeight: 0.1
      }
    },
    {
      id: 'variant_a',
      weight: 0.5,
      config: {
        engagementWeight: 0.3,
        relevanceWeight: 0.4, // Boost relevance
        qualityWeight: 0.2,
        recencyWeight: 0.1
      }
    }
  ],
  
  metrics: [
    'avgEngagementRate',
    'avgSessionTime',
    'enrollmentConversion',
    'returnRate'
  ],
  
  duration: 14, // days
  minSampleSize: 10000
}

// Assign users to variants
function assignVariant(userId, testId) {
  const hash = hashUserId(userId + testId)
  const tests = getActiveTests()
  const test = tests.find(t => t.id === testId)
  
  let cumulative = 0
  for (const variant of test.variants) {
    cumulative += variant.weight
    if (hash < cumulative) {
      return variant
    }
  }
}
```

---

## 🎯 Success Metrics

### Platform Health
- **Average Engagement Rate**: Target 10%+
- **Average Session Time**: Target 20+ minutes
- **Return Rate (D7)**: Target 60%+
- **Content Consumption**: Target 15 posts per session

### Content Quality
- **Relevance Score**: Target 75%+ users say content is relevant
- **Discovery Success**: Target 20%+ engagement on discovery posts
- **Conversion Rate**: Target 5%+ enrollment from course posts

### Creator Success
- **Reach Predictability**: ±20% variance in post performance
- **Audience Growth**: Target 10% monthly growth for active creators
- **Creator Satisfaction**: Target 4.5/5 rating on analytics tools

---

## 🚀 Implementation Roadmap

### Phase 1: Basic Algorithm (Weeks 1-4)
- [ ] Implement engagement tracking
- [ ] Build basic scoring system
- [ ] Create user interest profiles
- [ ] Simple feed ranking
- [ ] Basic analytics dashboard

### Phase 2: Enhanced Personalization (Weeks 5-8)
- [ ] Relevance scoring
- [ ] Content diversity
- [ ] Discovery content
- [ ] Improved analytics
- [ ] A/B testing framework

### Phase 3: Machine Learning (Months 3-6)
- [ ] Collaborative filtering
- [ ] Predictive modeling
- [ ] Advanced recommendations
- [ ] Real-time adjustments

### Phase 4: AI-Powered (Months 6-12)
- [ ] Deep learning models
- [ ] Natural language processing
- [ ] Image/video understanding
- [ ] Reinforcement learning

---

## 📞 Next Steps

1. ✅ Review this algorithm design
2. 🛠️ Set up tracking infrastructure
3. 📊 Implement basic analytics
4. 🎯 Launch rule-based algorithm
5. 📈 Collect data for ML models
6. 🤖 Train and deploy ML models

---

**Last Updated:** January 27, 2026  
**Status:** Ready for Implementation  
**Priority:** P1 - High (Critical for engagement)

---

**Making learning personal, engaging, and effective through intelligent algorithms! 🎓🤖**
