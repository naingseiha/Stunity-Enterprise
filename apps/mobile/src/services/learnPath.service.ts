/**
 * Learn path API — Duolingo-style curriculum practice (feed-service).
 *
 * Answers are submitted through the existing reels interaction endpoint
 * (itemType QUIZ_QUESTION) so XP, combo, SM-2 recall and answer persistence
 * all reuse the production pipeline.
 */

import { quizApi } from '@/api/client';
import { TopicSubject } from '@/services/topics.service';

export interface LearnerProfile {
  grade: string;
  subjects: Array<{
    id: string;
    code: string;
    name: string;
    nameEn: string | null;
    nameKh: string | null;
    grade: string;
  }>;
}

export type UnitState = 'locked' | 'unlocked' | 'completed' | 'no_content';

export interface LearnUnit {
  topicId: string;
  name: string;
  nameKh: string | null;
  order: number;
  skills: Array<{ topicId: string; name: string; nameKh: string | null }>;
  totalQuestions: number;
  correct: number;
  target: number;
  state: UnitState;
}

export interface LearnPath {
  subject: LearnerProfile['subjects'][number];
  targetPerUnit: number;
  units: LearnUnit[];
}

export interface PracticeQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  points: number;
  topicId: string | null;
  alreadyMastered: boolean;
}

export interface AnswerResult {
  success: boolean;
  attemptNumber: number;
  alreadyAnswered: boolean;
  comboCount?: number;
  comboBonus?: number;
  xpEarned?: number;
}

export const learnPathService = {
  async getProfile(): Promise<LearnerProfile | null> {
    const response = await quizApi.get('/learn/profile');
    return response.data?.data ?? null;
  },

  async saveProfile(grade: string, subjectIds: string[]): Promise<void> {
    await quizApi.put('/learn/profile', { grade, subjectIds });
  },

  async getPath(subjectId: string): Promise<LearnPath | null> {
    const response = await quizApi.get('/learn/path', { params: { subjectId } });
    return response.data?.data ?? null;
  },

  async getPractice(topicId: string, limit = 10): Promise<PracticeQuestion[]> {
    const response = await quizApi.get('/learn/practice', { params: { topicId, limit } });
    return response.data?.data?.questions ?? [];
  },

  /** Submit one answer through the reels pipeline (XP/combo/SM-2 included). */
  async submitAnswer(
    question: PracticeQuestion,
    chosenIndex: number,
  ): Promise<AnswerResult> {
    const correct = chosenIndex === question.correctIndex;
    // No xpEarned override — the server's BASE_XP_CORRECT default keeps the
    // Learn practice economy identical to answering the same card in reels.
    const response = await quizApi.post('/reels/interactions', {
      itemId: question.id,
      itemType: 'QUIZ_QUESTION',
      chosenIndex,
      correct,
    });
    return response.data ?? { success: false, attemptNumber: 0, alreadyAnswered: false };
  },
};

export type { TopicSubject };
