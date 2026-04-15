import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchThreads();
  }, [courseId, lessonId]);

  const fetchThreads = async () => {
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
  };

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
      <div className="flex justify-center p-8 text-gray-500">
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
          className="text-amber-500 hover:text-amber-400 text-sm font-medium"
        >
          &larr; Back to all questions
        </button>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-2">{selectedThread.title}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <span className="font-medium text-gray-300">
              {selectedThread.user?.firstName} {selectedThread.user?.lastName}
            </span>
            <span>&bull;</span>
            <span>{new Date(selectedThread.createdAt).toLocaleDateString()}</span>
            {selectedThread.isResolved && (
              <>
                <span>&bull;</span>
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle className="w-3 h-3" /> Resolved
                </span>
              </>
            )}
          </div>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedThread.body}</p>
        </div>

        <div className="space-y-4 ml-6 pl-6 border-l-2 border-gray-700">
          <h3 className="font-semibold text-white mb-4">
            {selectedThread.answers?.length || 0} Answers
          </h3>
          
          {selectedThread.answers?.map(ans => (
            <div key={ans.id} className={`bg-gray-800 rounded-xl p-5 border ${ans.isInstructor ? 'border-amber-500/30 bg-amber-500/5' : 'border-gray-700'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">
                      {ans.user?.firstName} {ans.user?.lastName}
                    </span>
                    {ans.isInstructor && (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">
                        Instructor
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{new Date(ans.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{ans.body}</p>
            </div>
          ))}

          <form onSubmit={handlePostAnswer} className="mt-6 pt-6 border-t border-gray-700">
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
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
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
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
        <h2 className="text-lg font-bold text-white">Discussion ({threads.length})</h2>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="text-amber-500 font-medium text-sm hover:underline"
        >
          {isCreating ? 'Cancel' : 'Ask a Question'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateThread} className="bg-gray-800 rounded-xl p-5 border border-gray-700 mb-6 space-y-4">
          <input
            type="text"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-amber-500"
            placeholder="Question Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-amber-500"
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
              className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Post Question'}
            </button>
          </div>
        </form>
      )}

      {threads.length === 0 && !isCreating ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <h3 className="text-white font-medium mb-1">No questions yet</h3>
          <p className="text-sm text-gray-400">Be the first to ask a question about this lesson.</p>
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
              className="w-full text-left bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-500 transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white group-hover:text-amber-500 transition-colors">
                  {thread.title}
                </h3>
                <div className="flex items-center gap-1 text-gray-400 text-xs whitespace-nowrap">
                  <MessageSquare className="w-3 h-3" />
                  <span>{thread._count?.answers || 0}</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2 mb-3">{thread.body}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {thread.user?.firstName} {thread.user?.lastName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(thread.createdAt).toLocaleDateString()}
                </span>
                {thread.isResolved && (
                  <span className="flex items-center gap-1 text-green-500">
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
