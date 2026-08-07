/**
 * Learn path API — mirrors apps/mobile/src/services/learnPath.service.ts
 * Backed by feed-service (quiz) routes under FEED_SERVICE_URL.
 */

import { TokenManager } from "@/lib/api/auth";
import { FEED_SERVICE_URL, ANALYTICS_SERVICE_URL } from "@/lib/api/config";

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

export type UnitState = "locked" | "unlocked" | "completed" | "no_content";

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
  hasLesson: boolean;
  difficultyCounts: Partial<Record<1 | 2 | 3 | 4 | 5, number>>;
}

export interface LearnPath {
  subject: LearnerProfile["subjects"][number];
  targetPerUnit: number;
  units: LearnUnit[];
}

export interface UnitLesson {
  id: string;
  name: string;
  nameKh: string | null;
  miniLesson: string | null;
  miniLessonKh: string | null;
  formulaSheet: Array<{ expr: string; noteKh?: string }> | null;
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

export interface TopicSubject {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  nameKh: string | null;
  grade: string;
  category: string;
  topicCount: number;
}

export interface PerformanceStatsSummary {
  xp: number;
  level: number;
  xpProgress: number;
  xpToNextLevel: number;
  currentStreak: number;
  weekActivity?: boolean[];
  studiedToday?: boolean;
}

async function authFetch(url: string, init?: RequestInit) {
  return TokenManager.fetchWithAuth(url, init);
}

export const learnPathApi = {
  async getProfile(): Promise<LearnerProfile | null> {
    const res = await authFetch(`${FEED_SERVICE_URL}/learn/profile`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? null;
  },

  async saveProfile(grade: string, subjectIds: string[]): Promise<void> {
    const res = await authFetch(`${FEED_SERVICE_URL}/learn/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade, subjectIds }),
    });
    if (!res.ok) throw new Error("Failed to save learn profile");
  },

  async getPath(subjectId: string): Promise<LearnPath | null> {
    const res = await authFetch(
      `${FEED_SERVICE_URL}/learn/path?subjectId=${encodeURIComponent(subjectId)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? null;
  },

  async getLesson(topicId: string): Promise<UnitLesson | null> {
    const res = await authFetch(
      `${FEED_SERVICE_URL}/learn/lesson?topicId=${encodeURIComponent(topicId)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? null;
  },

  async getPractice(
    scope: { topicId?: string; subjectId?: string },
    limit = 10,
    difficultyBand?: { minDifficulty?: number; maxDifficulty?: number }
  ): Promise<PracticeQuestion[]> {
    const params = new URLSearchParams();
    if (scope.topicId) params.set("topicId", scope.topicId);
    if (scope.subjectId) params.set("subjectId", scope.subjectId);
    params.set("limit", String(limit));
    if (difficultyBand?.minDifficulty != null)
      params.set("minDifficulty", String(difficultyBand.minDifficulty));
    if (difficultyBand?.maxDifficulty != null)
      params.set("maxDifficulty", String(difficultyBand.maxDifficulty));

    const res = await authFetch(`${FEED_SERVICE_URL}/learn/practice?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.questions ?? [];
  },

  async submitAnswer(question: PracticeQuestion, chosenIndex: number) {
    const correct = chosenIndex === question.correctIndex;
    const res = await authFetch(`${FEED_SERVICE_URL}/reels/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: question.id,
        itemType: "QUIZ_QUESTION",
        chosenIndex,
        correct,
      }),
    });
    if (!res.ok) return { success: false, attemptNumber: 0, alreadyAnswered: false };
    return res.json();
  },

  async getSubjects(grade?: string): Promise<TopicSubject[]> {
    const qs = grade ? `?grade=${encodeURIComponent(grade)}` : "";
    const res = await authFetch(`${FEED_SERVICE_URL}/topics/subjects${qs}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data ?? [];
  },

  async getStatsSummary(userId: string): Promise<PerformanceStatsSummary | null> {
    try {
      const res = await authFetch(`${ANALYTICS_SERVICE_URL}/stats/${userId}/summary`);
      if (!res.ok) return null;
      const data = await res.json();
      const raw = data?.data ?? data;
      return {
        xp: Number(raw?.xp ?? 0),
        level: Number(raw?.level ?? 1),
        xpProgress: Number(raw?.xpProgress ?? 0),
        xpToNextLevel: Number(raw?.xpToNextLevel ?? 100),
        currentStreak: Number(raw?.currentStreak ?? 0),
        weekActivity: Array.isArray(raw?.weekActivity)
          ? raw.weekActivity
          : [false, false, false, false, false, false, false],
        studiedToday: Boolean(raw?.studiedToday),
      };
    } catch {
      return null;
    }
  },
};
