# 🎯 Next Steps: Phase 1.2 - Leaderboard & Competition

**Estimated Time:** 4-5 hours  
**Priority:** High  
**Dependencies:** Phase 1.1 (Live Quiz Mode) ✅ COMPLETE

---

## 📋 **Overview**

Build a comprehensive **Leaderboard & Competition System** that tracks user performance, enables friendly competition, and gamifies the learning experience.

---

## 🎯 **Goals**

1. **Global Leaderboards** - See top performers across the platform
2. **XP & Levels** - Gain experience and level up
3. **Challenge System** - Compete with friends directly
4. **Stats Dashboard** - Personal performance tracking

---

## 🏗️ **Implementation Plan**

### **1. Backend (Analytics Service)**

#### **Database Schema (Prisma)**
```prisma
model UserStats {
  id            String   @id @default(cuid())
  userId        String   @unique
  xp            Int      @default(0)
  level         Int      @default(1)
  totalQuizzes  Int      @default(0)
  totalPoints   Int      @default(0)
  correctAnswers Int     @default(0)
  totalAnswers  Int      @default(0)
  winStreak     Int      @default(0)
  bestStreak    Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model QuizAttempt {
  id           String   @id @default(cuid())
  userId       String
  quizId       String
  score        Int
  totalPoints  Int
  accuracy     Float
  timeSpent    Int      // seconds
  rank         Int?     // if multiplayer
  xpEarned     Int
  createdAt    DateTime @default(now())
}

model Challenge {
  id           String   @id @default(cuid())
  challengerId String
  opponentId   String
  quizId       String
  status       String   // 'pending', 'active', 'completed'
  challengerScore Int?
  opponentScore   Int?
  winnerId     String?
  createdAt    DateTime @default(now())
  expiresAt    DateTime
}
```

#### **API Endpoints (8 new)**
```
GET  /stats/:userId                    - Get user stats
POST /stats/record-attempt             - Record quiz attempt & award XP
GET  /leaderboard/global               - Global leaderboard (all-time)
GET  /leaderboard/school/:schoolId     - School leaderboard
GET  /leaderboard/weekly                - Weekly leaders
POST /challenge/create                 - Challenge a friend
POST /challenge/:id/accept             - Accept challenge
GET  /challenge/my-challenges          - Get user's challenges
```

### **2. Mobile Screens (4 new)**

#### **LeaderboardScreen.tsx**
- Tabs: Global / School / Weekly
- User ranking display
- Filter options
- Search users
- View profile on tap

#### **StatsScreen.tsx**
- Personal dashboard
- XP progress bar
- Level badge
- Stats cards:
  - Total quizzes taken
  - Average score
  - Best streak
  - Win rate
- Recent activity
- Achievement badges

#### **ChallengeScreen.tsx**
- Challenge friend flow
- Select quiz
- Send challenge
- View pending challenges
- Active challenges list

#### **ChallengeResultScreen.tsx**
- Head-to-head comparison
- Winner celebration
- Stats breakdown
- Rematch button

### **3. UI Components**

#### **XPProgressBar.tsx**
```typescript
- Current XP / Next Level
- Animated fill
- Level badge
- Sparkle effects on level up
```

#### **LeaderboardCard.tsx**
```typescript
- Rank badge (1st/2nd/3rd special)
- User avatar
- Username
- XP/Score
- Trend indicator (↑↓)
```

#### **StatCard.tsx**
```typescript
- Icon
- Value (large number)
- Label
- Trend percentage
- Color coding
```

---

## 🎨 **Design System**

### **Colors**
- **XP Bar:** `#10b981` → `#059669` (Emerald gradient)
- **Level Badge:** `#fbbf24` (Gold)
- **Challenge:** `#8b5cf6` (Purple)
- **Win:** `#10b981` (Green)
- **Loss:** `#ef4444` (Red)

### **XP & Level Formula**
```javascript
// XP per level increases exponentially
xpForLevel = (level) => 100 * Math.pow(1.5, level - 1)

// XP earned from quiz
baseXP = 50
bonusXP = (score / totalPoints) * 50  // 0-50 bonus
speedBonus = timeBonus * 10            // 0-10 for speed
xpEarned = baseXP + bonusXP + speedBonus
```

---

## 📝 **Implementation Steps**

### **Step 1: Database Setup (30 min)**
- [ ] Create Prisma schema
- [ ] Run migration
- [ ] Seed initial data

### **Step 2: Backend APIs (2 hours)**
- [ ] User stats endpoints
- [ ] Leaderboard endpoints
- [ ] Challenge system endpoints
- [ ] XP calculation logic
- [ ] Level up logic

### **Step 3: Mobile Screens (2 hours)**
- [ ] LeaderboardScreen
- [ ] StatsScreen
- [ ] ChallengeScreen
- [ ] ChallengeResultScreen

### **Step 4: Integration (1 hour)**
- [ ] Connect screens to navigation
- [ ] Update quiz results to record attempts
- [ ] Award XP after quiz completion
- [ ] Show level up animation
- [ ] Update profile with level badge

### **Step 5: Testing (30 min)**
- [ ] Test leaderboard updates
- [ ] Test XP calculations
- [ ] Test challenge flow
- [ ] Test edge cases

---

## 🧪 **Testing Scenarios**

### **Leaderboard:**
- Load global leaderboard
- Filter by school
- View weekly leaders
- Search for user
- Pagination

### **XP System:**
- Complete quiz → earn XP
- Level up → show animation
- View progress bar
- Check XP history

### **Challenges:**
- Send challenge
- Accept challenge
- Decline challenge
- Complete challenge
- View results

---

## 🚀 **After Phase 1.2**

### **Phase 1.3: Learning Streaks (3-4 hours)**
- Daily quiz streaks
- Achievement system
- Badge collection
- Streak freeze power-up

### **Phase 1.4: Enhanced Results (2-3 hours)**
- Performance breakdown
- Detailed analytics
- Share to feed
- Comparison with previous attempts

---

## 📊 **Success Metrics**

- [ ] Leaderboard loads in <500ms
- [ ] XP updates instantly after quiz
- [ ] Challenges send within 2 seconds
- [ ] Stats dashboard accurate
- [ ] Level up animation smooth (60fps)

---

## 💡 **Pro Tips**

1. **Cache Leaderboards:** Update every 5 minutes to reduce load
2. **Batch XP Updates:** Use transactions for atomicity
3. **Challenge Expiry:** Set 24-hour expiration
4. **Leaderboard Pagination:** 50 users per page
5. **XP Animations:** Use Animated API for smooth transitions

---

## 🎉 **Expected Outcome**

Users will be able to:
- ✅ See their rank among peers
- ✅ Track XP and level progression
- ✅ Challenge friends to quiz duels
- ✅ View detailed performance stats
- ✅ Compete for top positions
- ✅ Feel motivated to improve

---

**Ready to start?** Let's build Phase 1.2! 🚀

---

**Current Phase:** 1.1 ✅ COMPLETE  
**Next Phase:** 1.2 (this document)  
**After That:** 1.3 Learning Streaks

