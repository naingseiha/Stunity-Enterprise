# 🔌 Quiz System Integration Guide

**Quick reference for integrating the quiz taking system**

---

## 📋 Step-by-Step Integration

### 1. Add Screens to Navigation

```typescript
// In your main navigation stack (e.g., RootNavigator.tsx)

import { TakeQuizScreen, QuizResultsScreen } from '@/screens/quiz';

// Add to your stack navigator:
<Stack.Screen 
  name="TakeQuiz" 
  component={TakeQuizScreen}
  options={{ 
    headerShown: false,
    presentation: 'modal' // Optional: makes it feel like a focused experience
  }}
/>
<Stack.Screen 
  name="QuizResults" 
  component={QuizResultsScreen}
  options={{ 
    headerShown: false,
    presentation: 'card'
  }}
/>
```

---

### 2. Navigate from Quiz Post

```typescript
// In PostDetailScreen.tsx or FeedCard.tsx

const handleTakeQuiz = () => {
  navigation.navigate('TakeQuiz', {
    quiz: {
      id: post.quizData.id,
      title: post.title,
      description: post.content,
      questions: post.quizData.questions,
      timeLimit: post.quizData.timeLimit, // in minutes or null
      passingScore: post.quizData.passingScore, // percentage (e.g., 70)
      totalPoints: post.quizData.questions.reduce((sum, q) => sum + q.points, 0),
    }
  });
};

// Add a button to the quiz post:
<TouchableOpacity onPress={handleTakeQuiz} style={styles.takeQuizButton}>
  <Ionicons name="play-circle" size={20} color="#FFFFFF" />
  <Text style={styles.takeQuizText}>Take Quiz</Text>
</TouchableOpacity>
```

---

### 3. Backend API Integration

#### Endpoint: Submit Quiz
```typescript
// services/quiz/quiz.service.ts

interface SubmitQuizRequest {
  quizId: string;
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
}

interface SubmitQuizResponse {
  attemptId: string;
  score: number;
  pointsEarned: number;
  totalPoints: number;
  passed: boolean;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    pointsEarned: number;
  }>;
}

export async function submitQuiz(
  quizId: string, 
  answers: UserAnswer[]
): Promise<SubmitQuizResponse> {
  const response = await api.post(`/api/quizzes/${quizId}/submit`, {
    answers,
  });
  return response.data;
}
```

#### Update TakeQuizScreen:
```typescript
// In TakeQuizScreen.tsx, replace the submitQuiz function:

const submitQuiz = async () => {
  try {
    setIsSubmitting(true);
    
    // Call backend API
    const response = await quizService.submitQuiz(quiz.id, answers);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Navigate to results with response data
    navigation.navigate('QuizResults', {
      quiz,
      answers,
      score: response.score,
      passed: response.passed,
      attemptId: response.attemptId,
    });
  } catch (error) {
    Alert.alert(
      'Submission Error', 
      'Failed to submit quiz. Please try again.'
    );
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### 4. Type Definitions

```typescript
// types/quiz.types.ts

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface QuizQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // For multiple choice
  correctAnswer: string; // Index for MC, 'true'/'false' for T/F, text for short answer
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit: number | null; // minutes
  passingScore: number; // percentage (0-100)
  totalPoints: number;
  createdBy: string;
  createdAt: Date;
}

export interface UserAnswer {
  questionId: string;
  answer: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: UserAnswer[];
  score: number;
  pointsEarned: number;
  totalPoints: number;
  passed: boolean;
  startedAt: Date;
  submittedAt: Date;
  timeSpent: number; // seconds
}
```

---

### 5. Database Schema

```prisma
// packages/database/prisma/schema.prisma

model Quiz {
  id               String          @id @default(cuid())
  title            String
  description      String?
  questions        Json            // Array of QuizQuestion
  timeLimit        Int?            // in minutes
  passingScore     Int             // percentage
  totalPoints      Int
  resultsVisibility String         // IMMEDIATE, AFTER_SUBMISSION, MANUAL
  
  postId           String          @unique
  post             Post            @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  attempts         QuizAttempt[]
  
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
}

model QuizAttempt {
  id              String          @id @default(cuid())
  quizId          String
  quiz            Quiz            @relation(fields: [quizId], references: [id], onDelete: Cascade)
  
  userId          String
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  answers         Json            // Array of UserAnswer
  score           Int             // percentage
  pointsEarned    Int
  totalPoints     Int
  passed          Boolean
  
  startedAt       DateTime        @default(now())
  submittedAt     DateTime?
  timeSpent       Int?            // in seconds
  
  @@index([quizId, userId])
  @@index([userId])
}
```

---

### 6. Backend Controller

```typescript
// services/quiz-service/src/controllers/quiz.controller.ts

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';

export async function submitQuiz(req: Request, res: Response) {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id; // From auth middleware
    
    // Get quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Calculate score
    const questions = quiz.questions as QuizQuestion[];
    let pointsEarned = 0;
    
    const results = questions.map((question) => {
      const userAnswer = answers.find((a: UserAnswer) => a.questionId === question.id);
      const isCorrect = userAnswer?.answer === question.correctAnswer;
      
      if (isCorrect) {
        pointsEarned += question.points;
      }
      
      return {
        questionId: question.id,
        isCorrect,
        pointsEarned: isCorrect ? question.points : 0,
      };
    });
    
    const score = Math.round((pointsEarned / quiz.totalPoints) * 100);
    const passed = score >= quiz.passingScore;
    
    // Save attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        answers,
        score,
        pointsEarned,
        totalPoints: quiz.totalPoints,
        passed,
        submittedAt: new Date(),
      },
    });
    
    return res.json({
      attemptId: attempt.id,
      score,
      pointsEarned,
      totalPoints: quiz.totalPoints,
      passed,
      results,
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return res.status(500).json({ error: 'Failed to submit quiz' });
  }
}

// Route:
router.post('/api/quizzes/:quizId/submit', authenticate, submitQuiz);
```

---

### 7. Add to Post Creation Flow

```typescript
// In CreatePostScreen.tsx

const handlePost = async () => {
  try {
    setIsPosting(true);
    
    let postData: any = {
      type: postType,
      title,
      content,
      visibility,
      // ... other common fields
    };
    
    // Add quiz data if quiz type
    if (postType === 'QUIZ' && quizData) {
      postData.quizData = {
        questions: quizData.questions,
        timeLimit: quizData.timeLimit,
        passingScore: quizData.passingScore,
        resultsVisibility: quizData.resultsVisibility,
        totalPoints: quizData.questions.reduce((sum, q) => sum + q.points, 0),
      };
    }
    
    await createPost(postData);
    
    navigation.navigate('Feed');
  } catch (error) {
    Alert.alert('Error', 'Failed to create post');
  } finally {
    setIsPosting(false);
  }
};
```

---

### 8. Display Quiz in Feed

```typescript
// In FeedCard.tsx or PostCard.tsx

{post.type === 'QUIZ' && (
  <View style={styles.quizSection}>
    <View style={styles.quizHeader}>
      <Ionicons name="newspaper-outline" size={20} color="#EC4899" />
      <Text style={styles.quizTitle}>Quiz: {post.quizData.questions.length} Questions</Text>
    </View>
    
    <View style={styles.quizInfo}>
      <View style={styles.infoItem}>
        <Ionicons name="time-outline" size={16} color="#6B7280" />
        <Text style={styles.infoText}>
          {post.quizData.timeLimit ? `${post.quizData.timeLimit} min` : 'No limit'}
        </Text>
      </View>
      
      <View style={styles.infoItem}>
        <Ionicons name="star-outline" size={16} color="#6B7280" />
        <Text style={styles.infoText}>
          {post.quizData.totalPoints} points
        </Text>
      </View>
      
      <View style={styles.infoItem}>
        <Ionicons name="checkmark-circle-outline" size={16} color="#6B7280" />
        <Text style={styles.infoText}>
          Pass: {post.quizData.passingScore}%
        </Text>
      </View>
    </View>
    
    <TouchableOpacity 
      onPress={() => handleTakeQuiz(post)} 
      style={styles.takeQuizButton}
    >
      <Ionicons name="play-circle" size={20} color="#FFFFFF" />
      <Text style={styles.takeQuizText}>Take Quiz</Text>
    </TouchableOpacity>
  </View>
)}
```

---

### 9. Show Previous Attempts

```typescript
// Optional: Show if user has already taken the quiz

const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([]);

useEffect(() => {
  if (post.type === 'QUIZ') {
    fetchQuizAttempts(post.quizData.id);
  }
}, [post]);

const fetchQuizAttempts = async (quizId: string) => {
  const attempts = await quizService.getUserAttempts(quizId);
  setPreviousAttempts(attempts);
};

{previousAttempts.length > 0 && (
  <View style={styles.previousAttempts}>
    <Text style={styles.attemptsTitle}>Your Previous Attempts</Text>
    {previousAttempts.map((attempt) => (
      <View key={attempt.id} style={styles.attemptCard}>
        <View style={styles.attemptInfo}>
          <Text style={styles.attemptScore}>{attempt.score}%</Text>
          <Text style={styles.attemptDate}>
            {formatDate(attempt.submittedAt)}
          </Text>
        </View>
        <View style={[
          styles.attemptBadge,
          attempt.passed ? styles.passedBadge : styles.failedBadge
        ]}>
          <Text style={styles.attemptBadgeText}>
            {attempt.passed ? 'Passed' : 'Failed'}
          </Text>
        </View>
      </View>
    ))}
  </View>
)}
```

---

## ✅ Integration Checklist

- [ ] Add screens to navigation stack
- [ ] Create backend API endpoints
- [ ] Update database schema
- [ ] Add quiz submission service
- [ ] Connect TakeQuizScreen to API
- [ ] Update CreatePostScreen for quiz type
- [ ] Display quiz info in feed cards
- [ ] Add "Take Quiz" button
- [ ] Show previous attempts (optional)
- [ ] Test quiz creation flow
- [ ] Test quiz taking flow
- [ ] Test results display
- [ ] Test timer functionality
- [ ] Test on iOS
- [ ] Test on Android

---

## 🚀 Quick Start

1. **Copy screens to project:**
   ```
   cp quiz/* apps/mobile/src/screens/quiz/
   ```

2. **Add to navigation:**
   ```typescript
   import { TakeQuizScreen, QuizResultsScreen } from '@/screens/quiz';
   // Add to stack
   ```

3. **Create API endpoint:**
   ```typescript
   POST /api/quizzes/:quizId/submit
   ```

4. **Test it:**
   ```
   npm run dev
   ```

---

## 📚 Related Files

- `TakeQuizScreen.tsx` - Quiz taking interface
- `QuizResultsScreen.tsx` - Results display
- `QuizForm.tsx` - Quiz creation form
- `QuizQuestionInput.tsx` - Question editor

---

**Ready to integrate! Follow the steps above for a smooth setup.** ✅
