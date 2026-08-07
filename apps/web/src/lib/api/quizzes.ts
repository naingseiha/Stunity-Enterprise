import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';

export interface BrowseQuizItem {
  id: string;
  postId?: string | null;
  title: string;
  description?: string | null;
  subject?: string | null;
  courseCode?: string | null;
  difficulty?: string | null;
  questionCount?: number;
  timeLimit?: number | null;
  points?: number | null;
  category?: string | null;
}

export async function browseQuizzes(params: {
  courseCode?: string;
  examOnly?: boolean;
  limit?: number;
  page?: number;
  search?: string;
} = {}): Promise<BrowseQuizItem[]> {
  const token = TokenManager.getAccessToken();
  if (!token) return [];
  try {
    const qs = new URLSearchParams();
    if (params.courseCode) qs.set('courseCode', params.courseCode);
    if (params.examOnly) qs.set('examOnly', 'true');
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.page) qs.set('page', String(params.page));
    if (params.search) qs.set('search', params.search);
    const res = await fetch(`${FEED_SERVICE_URL}/quizzes?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data ?? []) as BrowseQuizItem[];
  } catch {
    return [];
  }
}
