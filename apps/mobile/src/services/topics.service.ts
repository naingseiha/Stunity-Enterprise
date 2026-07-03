/**
 * Topic taxonomy API — curriculum subjects/topics for the quiz-authoring
 * topic picker (and later the Learn Screen skill tree).
 *
 * Reads from feed-service:
 *   GET /topics/subjects?grade=…  — subjects that have topics
 *   GET /topics?subjectId=…      — topic tree (units → skills) for a subject
 */

import { quizApi } from '@/api/client';

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

export interface TopicNode {
  id: string;
  name: string;
  nameKh: string | null;
  order: number;
  children: TopicNode[];
}

export const topicsService = {
  async getSubjects(grade?: string): Promise<TopicSubject[]> {
    const response = await quizApi.get('/topics/subjects', {
      params: grade ? { grade } : undefined,
    });
    return response.data?.data ?? [];
  },

  async getTopics(subjectId: string): Promise<TopicNode[]> {
    const response = await quizApi.get('/topics', { params: { subjectId } });
    return response.data?.data ?? [];
  },
};
