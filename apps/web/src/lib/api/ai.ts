import { TokenManager } from '@/lib/api/auth';
import { AI_SERVICE_URL } from '@/lib/api/config';

export async function askTutor(params: {
  question: string;
  locale: 'km' | 'en';
  grade?: string;
  subjectName?: string;
  topicName?: string;
  miniLesson?: string | null;
  formulaSheet?: Array<{ expr: string; noteKh?: string }> | null;
}): Promise<{ explanation: string } | null> {
  const token = TokenManager.getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${AI_SERVICE_URL}/ai/tutor/ask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.data ?? data) as { explanation: string };
  } catch {
    return null;
  }
}
