# Enhanced Post Creation System - Implementation Plan

**Date:** February 12, 2026  
**Status:** Ready for Implementation  
**Goal:** Support all post types with unique features and smooth UX

---

## 🎯 Overview

Currently, the CreatePostScreen supports basic post creation with:
- ✅ 6 post types (ARTICLE, QUESTION, ANNOUNCEMENT, POLL, COURSE, PROJECT)
- ✅ Basic poll functionality
- ✅ Media upload
- ✅ Content input

**What's Missing:**
- Unique features for each post type
- Quiz creation with questions/answers
- Question bounty system
- Course structure with lessons
- Project milestones
- Smooth animations and transitions

---

## 📋 Post Types & Their Unique Features

### 1. ARTICLE (Current: Basic ✅)
**Purpose:** Long-form educational content
**Features to Add:**
- Rich text editor with formatting
- Table of contents (auto-generated from headings)
- Reading time estimate
- Tags/categories

### 2. QUESTION (Current: Basic)
**Purpose:** Ask questions to the community
**Unique Features:**
- Question tags (topic, difficulty)
- Bounty system (reputation points)
- "Best Answer" selection
- Question status (Open, Answered, Closed)

**UI Components:**
```typescript
- Question title (required, 100 chars)
- Detailed description
- Tags selector (max 5)
- Bounty amount selector (0, 50, 100, 200, 500 points)
- Expected answer type (Text, Code, Multiple Choice)
```

### 3. QUIZ (Not implemented yet!)
**Purpose:** Interactive knowledge testing
**Unique Features:**
- Multiple questions
- Question types (Multiple Choice, True/False, Short Answer)
- Correct answers (private)
- Time limit (optional)
- Passing score
- Results visibility

**UI Components:**
```typescript
- Quiz title
- Quiz description
- Time limit selector (No limit, 5m, 10m, 15m, 30m, 1h)
- Passing score (%, default 70%)
- Questions list:
  - Question text
  - Question type selector
  - Options (for MC/TF)
  - Correct answer(s)
  - Points per question
  - Add/Remove question buttons
- Results visibility (Immediate, After submission, Manual)
```

### 4. POLL (Current: Basic ✅, Enhance)
**Purpose:** Quick opinion gathering
**Current Features:** ✅ Multiple options (2-6)
**Features to Add:**
- Poll duration (1 day, 3 days, 1 week, No end)
- Results visibility (While voting, After voting, After ending)
- Allow multiple selections
- Anonymous voting option

**Enhanced UI:**
```typescript
- Poll question
- Options (2-10)
- Duration selector
- Multiple selections toggle
- Anonymous voting toggle
- Results visibility selector
```

### 5. ANNOUNCEMENT (Current: Basic)
**Purpose:** Important updates
**Unique Features:**
- Importance level (Info, Important, Urgent, Critical)
- Priority badge color
- Auto-pin option
- Target audience selector
- Expiry date (optional)

**UI Components:**
```typescript
- Announcement title
- Importance level selector
  - Info (blue)
  - Important (orange)
  - Urgent (red)
  - Critical (red + animated)
- Pin to top toggle
- Target audience (Everyone, Students, Teachers, Parents)
- Expiry date picker (optional)
```

### 6. COURSE (Not fully implemented)
**Purpose:** Structured learning content
**Unique Features:**
- Course structure (modules/lessons)
- Difficulty level
- Duration estimate
- Prerequisites
- Learning objectives
- Enrollment tracking

**UI Components:**
```typescript
- Course title
- Short description
- Difficulty (Beginner, Intermediate, Advanced)
- Duration estimate
- Learning objectives (list)
- Course outline:
  - Module 1
    - Lesson 1.1
    - Lesson 1.2
  - Module 2
    - Lesson 2.1
- Enrollment options (Free, Paid, Approval required)
```

### 7. PROJECT (Not fully implemented)
**Purpose:** Collaborative projects
**Unique Features:**
- Project goals/milestones
- Team size
- Required skills
- Timeline
- Status tracking
- Collaboration requests

**UI Components:**
```typescript
- Project title
- Project description
- Goals (list)
- Timeline (start/end dates)
- Team size needed
- Required skills (tags)
- Status (Planning, Active, Completed)
- Collaboration type (Open, Invitation only)
```

### 8. EXAM (Database exists, not in UI)
**Purpose:** Formal assessments
**Features:** Similar to Quiz but:
- Stricter time limits
- No retry
- Higher stakes
- Proctoring options
- Grade weights

### 9. ASSIGNMENT (Database exists, not in UI)
**Purpose:** Homework/tasks
**Features:**
- Due date
- Submission type (Text, File, Link)
- Max submissions
- Grading rubric
- Late submission policy

---

## 🎨 Enhanced UI/UX Design

### Smooth Animations

**1. Type Selection Animation**
```typescript
// Animate when switching between post types
- Slide in/out transition (200ms)
- Fade effect for changing components
- Height transition for dynamic content
```

**2. Content Expansion**
```typescript
// Smooth height changes when adding:
- Poll options
- Quiz questions
- Project milestones
- Course lessons

Animation: Spring animation with bounce
Duration: 300ms
Easing: easeInOutQuart
```

**3. Submission Flow**
```typescript
// Post button animation sequence:
1. Scale down (0.95) on press
2. Show loading spinner (fade in)
3. Success checkmark animation (scale + rotation)
4. Confetti effect (optional)
5. Navigate back with slide animation
```

**4. Form Validation**
```typescript
// Real-time validation with smooth feedback:
- Input border color change (red/green)
- Shake animation for errors
- Checkmark icon for valid fields
- Error message slide down from top
```

### Layout Improvements

**1. Dynamic Header**
```typescript
// Header shows current post type with icon
- Animated icon change on type switch
- Progress indicator for multi-step forms
- Character/word counter for content
```

**2. Collapsible Sections**
```typescript
// Group related fields in collapsible sections:
- Basic Info (always expanded)
- Advanced Options (collapsible)
- Settings & Permissions (collapsible)
- Preview (collapsible)
```

**3. Step-by-Step for Complex Types**
```typescript
// For Quiz, Course, Project:
Step 1: Basic Info
Step 2: Content (Questions/Lessons/Milestones)
Step 3: Settings
Step 4: Review & Publish

Progress bar at top showing current step
```

---

## 🔧 Implementation Strategy

### Phase 1: Core Infrastructure (Day 1-2)

**1. Create Post Type Component System**
```typescript
// File: apps/mobile/src/components/post-creation/index.tsx

PostTypeForm.tsx           // Base component
├── ArticleForm.tsx        // Simple: title + content
├── QuestionForm.tsx       // NEW: title + description + tags + bounty
├── QuizForm.tsx           // NEW: multi-question with answers
├── PollForm.tsx           // ENHANCE: existing with duration/visibility
├── AnnouncementForm.tsx   // NEW: importance + target audience
├── CourseForm.tsx         // NEW: course structure + lessons
└── ProjectForm.tsx        // NEW: goals + timeline + team
```

**2. Add Animations Library**
```bash
# Install
npm install react-native-reanimated react-native-gesture-handler

# Already in Expo: ✅
- expo-haptics (for tactile feedback)
- LayoutAnimation (for smooth transitions)
```

**3. Create Shared Components**
```typescript
// apps/mobile/src/components/post-creation/shared/

TagSelector.tsx            // Multi-select tags
DurationPicker.tsx         // Duration selector
ImportanceSelector.tsx     // Visual importance levels
DateTimePicker.tsx         // Date/time selection
SkillsInput.tsx           // Skills/tags input with autocomplete
ProgressBar.tsx           // Step progress indicator
```

### Phase 2: Implement Each Post Type (Day 3-5)

**Priority Order:**
1. **Quiz** - Most requested, high educational value
2. **Question** - Community engagement
3. **Announcement** - Important for schools
4. **Poll** (enhance) - Already working, just add features
5. **Course** - Complex but valuable
6. **Project** - Collaboration feature

### Phase 3: Animations & Polish (Day 6-7)

**1. Add Type Transition Animations**
```typescript
// Use LayoutAnimation for smooth transitions
LayoutAnimation.configureNext(
  LayoutAnimation.create(
    300,
    LayoutAnimation.Types.easeInEaseOut,
    LayoutAnimation.Properties.opacity
  )
);
```

**2. Add Submission Flow**
```typescript
// Success animation sequence:
1. Scale button down
2. Show loading
3. Success animation
4. Navigate with transition
```

**3. Add Micro-interactions**
```typescript
// Small delightful details:
- Haptic feedback on every interaction
- Button press animations
- Input focus animations
- Error shake animations
```

### Phase 4: Backend Updates (Day 8-9)

**1. Database Schema Updates**
```prisma
// Add to schema.prisma

model Quiz {
  id              String    @id @default(cuid())
  postId          String    @unique
  post            Post      @relation(fields: [postId], references: [id])
  title           String
  description     String?
  timeLimit       Int?      // minutes
  passingScore    Int       @default(70) // percentage
  resultsVisibility QuizResultsVisibility @default(AFTER_SUBMISSION)
  questions       QuizQuestion[]
  submissions     QuizSubmission[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model QuizQuestion {
  id              String    @id @default(cuid())
  quizId          String
  quiz            Quiz      @relation(fields: [quizId], references: [id])
  questionText    String
  questionType    QuestionType
  options         String[]  // JSON array for MC questions
  correctAnswer   String    // Encrypted
  points          Int       @default(1)
  order           Int
  createdAt       DateTime  @default(now())
}

model QuestionBounty {
  id              String    @id @default(cuid())
  postId          String    @unique
  post            Post      @relation(fields: [postId], references: [id])
  bountyAmount    Int       // reputation points
  status          BountyStatus @default(OPEN)
  bestAnswerId    String?   // Comment ID
  createdAt       DateTime  @default(now())
  awardedAt       DateTime?
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  SHORT_ANSWER
}

enum QuizResultsVisibility {
  IMMEDIATE
  AFTER_SUBMISSION
  MANUAL
}

enum BountyStatus {
  OPEN
  ANSWERED
  AWARDED
  EXPIRED
}
```

**2. API Endpoints**
```typescript
// Feed Service additions:

// Quiz endpoints
POST   /posts/:postId/quiz                    // Create quiz with questions
GET    /posts/:postId/quiz                    // Get quiz details
POST   /posts/:postId/quiz/submit             // Submit quiz answers
GET    /posts/:postId/quiz/results            // Get quiz results
GET    /posts/:postId/quiz/leaderboard        // Get quiz leaderboard

// Question bounty endpoints
POST   /posts/:postId/bounty                  // Set bounty on question
POST   /posts/:postId/bounty/award/:commentId // Award bounty to answer
GET    /posts/:postId/bounty/status           // Check bounty status

// Poll enhancements
PUT    /posts/:postId/poll                    // Update poll settings
GET    /posts/:postId/poll/results            // Get detailed results
POST   /posts/:postId/poll/close              // Close poll early
```

---

## 📱 Mobile Implementation Details

### File Structure
```
apps/mobile/src/
├── screens/
│   └── feed/
│       ├── CreatePostScreen.tsx              ← REFACTOR THIS
│       └── create-post/                      ← NEW FOLDER
│           ├── CreatePostContainer.tsx       // Main container
│           ├── PostTypeSelector.tsx          // Type selection carousel
│           ├── forms/
│           │   ├── ArticleForm.tsx
│           │   ├── QuestionForm.tsx          // NEW
│           │   ├── QuizForm.tsx              // NEW
│           │   ├── PollForm.tsx              // ENHANCE
│           │   ├── AnnouncementForm.tsx      // NEW
│           │   ├── CourseForm.tsx            // NEW
│           │   └── ProjectForm.tsx           // NEW
│           ├── components/
│           │   ├── QuizQuestionInput.tsx
│           │   ├── TagSelector.tsx
│           │   ├── BountySelector.tsx
│           │   ├── ImportanceBadge.tsx
│           │   └── ProgressIndicator.tsx
│           └── animations/
│               ├── typeTransitions.ts
│               ├── submitAnimations.ts
│               └── hapticFeedback.ts
```

### Example: QuizForm Component
```typescript
// apps/mobile/src/screens/feed/create-post/forms/QuizForm.tsx

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { QuizQuestionInput } from '../components/QuizQuestionInput';
import { DurationPicker } from '@/components/common/DurationPicker';

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  points: number;
}

export function QuizForm({ onDataChange }) {
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: '', type: 'multiple_choice', options: ['', ''], correctAnswer: '', points: 1 }
  ]);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [passingScore, setPassingScore] = useState(70);
  const [resultsVisibility, setResultsVisibility] = useState('after_submission');

  const addQuestion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuestions([...questions, {
      id: Date.now().toString(),
      text: '',
      type: 'multiple_choice',
      options: ['', ''],
      correctAnswer: '',
      points: 1
    }]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  // Update parent component
  React.useEffect(() => {
    onDataChange({
      questions,
      timeLimit,
      passingScore,
      resultsVisibility,
    });
  }, [questions, timeLimit, passingScore, resultsVisibility]);

  return (
    <ScrollView>
      {/* Quiz Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiz Settings</Text>
        
        <DurationPicker
          label="Time Limit"
          value={timeLimit}
          onChange={setTimeLimit}
          options={[
            { label: 'No limit', value: null },
            { label: '5 minutes', value: 5 },
            { label: '10 minutes', value: 10 },
            { label: '15 minutes', value: 15 },
            { label: '30 minutes', value: 30 },
            { label: '1 hour', value: 60 },
          ]}
        />

        {/* Passing Score Slider */}
        {/* Results Visibility Selector */}
      </View>

      {/* Questions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
        
        {questions.map((question, index) => (
          <Animated.View
            key={question.id}
            entering={FadeIn}
            exiting={FadeOut}
          >
            <QuizQuestionInput
              question={question}
              index={index}
              onUpdate={(updates) => updateQuestion(question.id, updates)}
              onRemove={() => removeQuestion(question.id)}
              canRemove={questions.length > 1}
            />
          </Animated.View>
        ))}

        <TouchableOpacity onPress={addQuestion} style={styles.addButton}>
          <Text>+ Add Question</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

---

## ✅ Implementation Checklist

### Week 1: Foundation
- [ ] Refactor CreatePostScreen to use component-based architecture
- [ ] Create shared components (TagSelector, DurationPicker, etc.)
- [ ] Add animation utilities
- [ ] Set up type-specific form structure

### Week 2: Core Post Types
- [ ] Implement QuizForm with questions
- [ ] Implement QuestionForm with bounty
- [ ] Enhance PollForm with duration/visibility
- [ ] Implement AnnouncementForm with importance

### Week 3: Advanced Types & Backend
- [ ] Implement CourseForm with structure
- [ ] Implement ProjectForm with milestones
- [ ] Update database schema
- [ ] Create backend API endpoints

### Week 4: Polish & Testing
- [ ] Add all animations
- [ ] Test each post type thoroughly
- [ ] Fix bugs and edge cases
- [ ] Performance optimization
- [ ] User testing and feedback

---

## 🎯 Success Metrics

**User Experience:**
- Post creation completion rate > 90%
- Time to create post < 2 minutes (for simple types)
- User satisfaction score > 4.5/5

**Technical:**
- Smooth 60fps animations
- Zero crashes during post creation
- API response time < 500ms
- Image upload success rate > 95%

---

## 📚 Resources

**Design Inspiration:**
- Instagram Stories creation
- LinkedIn post types
- Notion content blocks
- Google Forms quiz builder

**Technical References:**
- React Native Reanimated docs
- Expo Haptics documentation
- iOS/Android design guidelines

---

**Ready to implement! Start with Phase 1. 🚀**
