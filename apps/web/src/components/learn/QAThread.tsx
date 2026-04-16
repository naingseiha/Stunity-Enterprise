import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, User, CheckCircle, Clock } from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';

interface QAUser {
  firstName: string;
  lastName: string;
  role: string;
}

interface QAAnswer {
  id: string;
  body: string;
  userId: string;
  isInstructor: boolean;
  createdAt: string;
  user: QAUser;
}

interface QAThread {
  id: string;
  title: string;
  body: string;
  isResolved: boolean;
  createdAt: string;
  user: QAUser;
  _count?: { answers: number };
  answers?: QAAnswer[];
}

interface QAThreadListProps {
  courseId: string;
  lessonId: string;
}

export function QAThreadList({ courseId, lessonId }: QAThreadListProps) {
  const [threads, setThreads] = useState<QAThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<QAThread | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [answerBody, setAnswerBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchThreads = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/qa?itemId=${lessonId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const loadThreadDetail = async (threadId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${LEARN_SERVICE_URL}/courses/qa/${threadId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedThread(data.thread);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;

    try {
      setPosting(true);
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/qa`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ title: newTitle, body: newBody, itemId: lessonId })
      });

      if (res.ok) {
        setNewTitle('');
        setNewBody('');
        setIsCreating(false);
        fetchThreads();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const handlePostAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerBody.trim() || !selectedThread) return;

    try {
      setPosting(true);
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${LEARN_SERVICE_URL}/courses/qa/${selectedThread.id}/answers`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ body: answerBody })
      });

      if (res.ok) {
        setAnswerBody('');
        loadThreadDetail(selectedThread.id);
        fetchThreads(); // update counts
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8 text-slate-500 dark:text-slate-400">
        <FeedInlineLoader size="md" />
      </div>
    );
  }

  // ─── THREAD DETAIL VIEW ───
  if (selectedThread) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedThread(null)}
          className="text-sm font-medium text-sky-600 transition-colors hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
        >
          &larr; Back to all questions
        </button>

        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{selectedThread.title}</h2>
          <div className="mb-6 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {selectedThread.user?.firstName} {selectedThread.user?.lastName}
            </span>
            <span>&bull;</span>
            <span>{new Date(selectedThread.createdAt).toLocaleDateString()}</span>
            {selectedThread.isResolved && (
              <>
                <span>&bull;</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                  <CheckCircle className="w-3 h-3" /> Resolved
                </span>
              </>
            )}
          </div>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-300">{selectedThread.body}</p>
        </div>

        <div className="ml-4 space-y-4 border-l-2 border-slate-200 pl-5 dark:border-white/10">
          <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">
            {selectedThread.answers?.length || 0} Answers
          </h3>
          
          {selectedThread.answers?.map(ans => (
            <div key={ans.id} className={`rounded-[22px] border p-5 ${ans.isInstructor ? 'border-sky-200 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/60'}`}>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
                  <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {ans.user?.firstName} {ans.user?.lastName}
                    </span>
                    {ans.isInstructor && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                        Instructor
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(ans.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{ans.body}</p>
            </div>
          ))}

          <form onSubmit={handlePostAnswer} className="mt-6 border-t border-slate-200 pt-6 dark:border-white/10">
            <textarea
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
              rows={3}
              placeholder="Write your answer..."
              value={answerBody}
              onChange={(e) => setAnswerBody(e.target.value)}
              required
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={posting || !answerBody.trim()}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {posting ? 'Posting...' : 'Post Answer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─── THREAD LIST VIEW ───
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Discussion ({threads.length})</h2>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-300"
        >
          {isCreating ? 'Cancel' : 'Ask a Question'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateThread} className="mb-6 space-y-4 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <input
            type="text"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
            placeholder="Question Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <textarea
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
            rows={4}
            placeholder="Provide details about your question..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={posting}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {posting ? 'Posting...' : 'Post Question'}
            </button>
          </div>
        </form>
      )}

      {threads.length === 0 && !isCreating ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <MessageSquare className="mx-auto mb-3 h-12 w-12 text-slate-400 dark:text-slate-500" />
          <h3 className="mb-1 font-medium text-slate-900 dark:text-white">No questions yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Be the first to ask a question about this lesson.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map(thread => (
            <button
              key={thread.id}
              onClick={() => {
                setSelectedThread(thread);
                loadThreadDetail(thread.id);
              }}
              className="group w-full rounded-[24px] border border-slate-200/80 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-white/20"
            >
              <div className="mb-2 flex items-start justify-between">
                <h3 className="font-bold text-slate-900 transition-colors group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
                  {thread.title}
                </h3>
                <div className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                  <MessageSquare className="w-3 h-3" />
                  <span>{thread._count?.answers || 0}</span>
                </div>
              </div>
              <p className="mb-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{thread.body}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {thread.user?.firstName} {thread.user?.lastName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(thread.createdAt).toLocaleDateString()}
                </span>
                {thread.isResolved && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                    <CheckCircle className="w-3 h-3" /> Resolved
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
