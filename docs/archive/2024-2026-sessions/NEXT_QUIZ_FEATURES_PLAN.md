# Next Implementation Plan - Quiz Advanced Features

**Date:** February 12, 2026  
**Current Version:** v21.9  
**Next Version:** v22.0+

---

## Current Status: Quiz System 100% Complete ✅

The quiz system is fully functional with:
- ✅ Quiz creation with metadata (questions, time, scoring)
- ✅ Beautiful quiz feed cards with gradient design
- ✅ Quiz taking interface with timer and progress tracking
- ✅ Automatic grading for all question types
- ✅ Instant results display with detailed feedback
- ✅ Database storage of quizzes and attempts
- ✅ Backend API for submission and retrieval
- ✅ Instructor can view all student attempts

---

## Next Implementation Priorities

### 🔥 High Priority (1-3 hours each)

#### 1. Quiz Retake System (v22.0)
**Estimated Time:** 1-2 hours  
**Impact:** High - Students need to retake failed quizzes

**Features:**
- [ ] Add `allowRetakes` and `maxAttempts` fields to Quiz model
- [ ] Update QuizForm to include retake settings
- [ ] Check attempt count before allowing quiz start
- [ ] Show "Retake Quiz" button in results if allowed
- [ ] Display best score vs latest score
- [ ] Show attempt history (1st: 70%, 2nd: 85%, etc.)

**Files to Modify:**
- `packages/database/prisma/schema.prisma` - Add fields
- `apps/mobile/src/screens/feed/create-post/forms/QuizForm.tsx` - Settings
- `apps/mobile/src/screens/quiz/TakeQuizScreen.tsx` - Attempt check
- `apps/mobile/src/screens/quiz/QuizResultsScreen.tsx` - Retake button
- `services/feed-service/src/index.ts` - Validation logic

---

#### 2. Quiz Review Mode (v22.1)
**Estimated Time:** 1-2 hours  
**Impact:** High - Students want to review past attempts

**Features:**
- [ ] Create QuizReviewScreen component
- [ ] Read-only quiz navigation
- [ ] Show user's answers vs correct answers
- [ ] Display explanations if provided
- [ ] Color-code correct (green) and incorrect (red) answers
- [ ] Navigate from "View Attempt" button

**Files to Create:**
- `apps/mobile/src/screens/quiz/QuizReviewScreen.tsx` - New screen

**Files to Modify:**
- `apps/mobile/src/screens/quiz/QuizResultsScreen.tsx` - Add review button
- `apps/mobile/src/components/feed/PostCard.tsx` - Add "Review" for past attempts

---

#### 3. Quiz Analytics Dashboard (v22.2)
**Estimated Time:** 2-3 hours  
**Impact:** High - Instructors need insights

**Features:**
- [ ] Create QuizAnalyticsScreen for instructors
- [ ] Display statistics (total attempts, pass rate, avg score)
- [ ] Show student list with scores
- [ ] Question difficulty analysis (% correct per question)
- [ ] Time spent analysis
- [ ] Export to CSV functionality
- [ ] Filter by date range, pass/fail

**Files to Create:**
- `apps/mobile/src/screens/quiz/QuizAnalyticsScreen.tsx` - New screen

**API Endpoints to Add:**
- `GET /quizzes/:id/analytics` - Aggregate statistics
- `GET /quizzes/:id/question-analysis` - Per-question stats

---

### 📊 Medium Priority (3-5 hours each)

#### 4. Grade Integration (v22.3)
**Estimated Time:** 3-4 hours  
**Impact:** Medium - Useful for academic tracking

**Features:**
- [ ] Link quiz scores to gradebook system
- [ ] Automatic grade entry when quiz posted in class
- [ ] Weighted scoring (quiz worth X% of final grade)
- [ ] Gradebook view with quiz scores
- [ ] Export grades to CSV
- [ ] Grade override capability

**Files to Modify:**
- `services/grade-service/src/index.ts` - Grade entry API
- Add gradebook UI screens

---

#### 5. Advanced Quiz Question Features (v22.4)
**Estimated Time:** 4-5 hours  
**Impact:** Medium - Enhanced quiz capabilities

**Features:**
- [ ] Image support in questions (upload + display)
- [ ] Math equation rendering (LaTeX or MathJax)
- [ ] Multiple correct answers for MC
- [ ] Partial credit scoring
- [ ] Question explanation field (shown after answer)
- [ ] Hints system (deduct points for using hint)

**Files to Modify:**
- `apps/mobile/src/screens/feed/create-post/forms/QuizForm.tsx` - Question builder
- `apps/mobile/src/screens/quiz/TakeQuizScreen.tsx` - Display logic
- Database schema - Add fields

---

#### 6. Quiz Randomization (v22.5)
**Estimated Time:** 2-3 hours  
**Impact:** Medium - Prevents cheating

**Features:**
- [ ] Random question order setting
- [ ] Random option order for MC questions
- [ ] Question pool (select N from M questions)
- [ ] Different versions for each student
- [ ] Seed-based randomization (consistent per attempt)

**Files to Modify:**
- Quiz model - Add settings
- TakeQuizScreen - Shuffle logic
- Backend - Store question order per attempt

---

### 🎯 Low Priority (Nice to Have)

#### 7. Timed Questions
- Individual time limits per question
- Auto-advance when time expires
- Time pressure indicator

#### 8. Quiz Categories/Tags
- Categorize quizzes by subject
- Filter quizzes in feed
- Search by category

#### 9. Quiz Templates
- Save quiz as template
- Duplicate existing quiz
- Pre-built quiz formats

#### 10. Collaborative Quizzes
- Team quizzes (students work together)
- Peer review of answers
- Discussion after quiz

---

## Recommended Implementation Order

**Week 1:**
1. Quiz Retake System (v22.0) - 1-2 hours
2. Quiz Review Mode (v22.1) - 1-2 hours
3. Quiz Analytics Dashboard (v22.2) - 2-3 hours

**Week 2:**
4. Grade Integration (v22.3) - 3-4 hours
5. Advanced Question Features (v22.4) - 4-5 hours

**Week 3:**
6. Quiz Randomization (v22.5) - 2-3 hours
7. Polish and bug fixes

---

## Database Schema Changes Needed

### For Retake System (v22.0)
```prisma
model Quiz {
  // ... existing fields
  allowRetakes      Boolean  @default(true)
  maxAttempts       Int?     // null = unlimited
  showCorrectAnswers Boolean @default(true)
}
```

### For Question Enhancements (v22.4)
```prisma
model Quiz {
  questions Json // Update format to include:
  // {
  //   id, text, type, options, correctAnswer, points,
  //   imageUrl?: string,
  //   explanation?: string,
  //   hint?: string,
  //   partialCredit?: boolean,
  //   multipleCorrect?: boolean
  // }
}
```

### For Analytics (v22.2)
```prisma
model QuizAttempt {
  // ... existing fields
  timeSpent    Int?     // seconds
  startedAt    DateTime @default(now())
  questionTimes Json?   // {questionId: seconds}
}
```

---

## API Endpoints to Add

### Retake System
- `GET /quizzes/:id/can-retake` - Check if user can retake
- `POST /quizzes/:id/reset` - Clear user's attempts (admin only)

### Analytics
- `GET /quizzes/:id/analytics` - Full statistics
- `GET /quizzes/:id/question-stats` - Per-question analysis
- `GET /quizzes/:id/export` - CSV export

### Review Mode
- `GET /quizzes/:id/attempts/:attemptId/review` - Get attempt with correct answers

---

## Testing Checklist for Next Features

### Retake System
- [ ] Student can retake after failing
- [ ] Max attempts enforced
- [ ] Best score displayed
- [ ] Attempt history shown
- [ ] Retake button appears only when allowed

### Review Mode
- [ ] Past attempts viewable
- [ ] Read-only navigation works
- [ ] Correct answers highlighted
- [ ] Explanations display
- [ ] Navigation from results screen

### Analytics
- [ ] Instructor sees all attempts
- [ ] Statistics calculate correctly
- [ ] Charts/graphs display
- [ ] CSV export works
- [ ] Filters apply correctly

---

## Success Metrics

**Retake System:**
- Students can retake failed quizzes
- Attempt limits enforced
- User experience smooth and clear

**Review Mode:**
- Students can review all past attempts
- Clear visual feedback on answers
- Helpful for learning from mistakes

**Analytics:**
- Instructors gain actionable insights
- Identify struggling students
- Adjust teaching based on data

---

## Notes

- All features should maintain the clean, professional UI style
- Maintain backward compatibility with existing quizzes
- Add comprehensive error handling
- Write documentation for each feature
- Test on both iOS and Android
- Consider offline mode support
- Optimize database queries for large quiz attempts

---

**Ready to Start:** Quiz Retake System (v22.0)  
**Estimated Time:** 1-2 hours  
**Files Ready:** All infrastructure in place, just need to add settings and logic
