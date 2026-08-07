'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, RefreshCw } from 'lucide-react';
import { askTutor } from '@/lib/api/ai';
import { learnPathApi } from '@/lib/api/learnPath';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { MarkdownMathView } from '@/components/learn/MarkdownMathView';

interface TutorMessage {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  pending?: boolean;
  error?: boolean;
}

export default function TutorChatPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const isKm = locale === 'km';

  const topicId = search.get('topicId') || '';
  const title = search.get('title') || '';
  const grade = search.get('grade') || '';
  const subjectName = search.get('subjectName') || '';
  const subjectNameKh = search.get('subjectNameKh') || '';

  const [lesson, setLesson] = useState<Awaited<ReturnType<typeof learnPathApi.getLesson>>>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!topicId) {
      setLesson(null);
      return;
    }
    learnPathApi.getLesson(topicId).then(setLesson).catch(() => setLesson(null));
  }, [topicId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || sending) return;

    const userMsg: TutorMessage = { id: `u-${Date.now()}`, role: 'user', text: question };
    const pendingMsg: TutorMessage = {
      id: `t-${Date.now()}`,
      role: 'tutor',
      text: '',
      pending: true,
    };
    setInput('');
    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setSending(true);

    try {
      const isQuestionKh = isKm || /[\u1780-\u17FF]/.test(question);
      const response = await askTutor({
        question,
        locale: isQuestionKh ? 'km' : 'en',
        grade: grade || undefined,
        subjectName: isQuestionKh
          ? subjectNameKh || subjectName || undefined
          : subjectName || subjectNameKh || undefined,
        topicName: title || undefined,
        miniLesson: isQuestionKh
          ? lesson?.miniLessonKh || lesson?.miniLesson
          : lesson?.miniLesson || lesson?.miniLessonKh,
        formulaSheet: lesson?.formulaSheet,
      });

      const explanation =
        response?.explanation ||
        (isKm ? 'Sorry, I could not answer that.' : 'Sorry, I could not answer that.');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id ? { ...m, pending: false, text: explanation } : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? {
                ...m,
                pending: false,
                error: true,
                text: isKm ? 'មានបញ្ហា ព្យាយាមម្តងទៀត' : 'Something went wrong. Please retry.',
              }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const headerTitle = title || (isKm ? 'គ្រូ AI' : 'AI Tutor');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <UnifiedNavigation />
      <div
        className="flex flex-col flex-1 md:max-w-2xl md:mx-auto md:w-full"
        style={{
          paddingTop: 'calc(var(--top-bar-height) + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
          minHeight: '100dvh',
        }}
      >
        <header className="px-4 py-3 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-[var(--top-bar-height)] z-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wide">
              {isKm ? 'គ្រូ AI' : 'AI Tutor'}
            </p>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {headerTitle}
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {isKm ? 'Ask anything about this lesson' : 'Ask anything about this lesson'}
              </p>
              <p className="text-xs text-slate-500">
                {isKm
                  ? 'The tutor explains step-by-step, grounded in the lesson.'
                  : 'The tutor explains step-by-step, grounded in the lesson.'}
              </p>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-sky-500 text-white px-3.5 py-2.5 text-sm">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="max-w-[95%]">
                {m.pending ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {isKm ? 'កំពុងគិត…' : 'Thinking…'}
                  </div>
                ) : m.error ? (
                  <p className="text-sm text-rose-600">{m.text}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-100">
                    <MarkdownMathView text={m.text} />
                  </div>
                )}
              </div>
            ),
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              placeholder={isKm ? 'Ask a question…' : 'Ask a question…'}
              className="flex-1 resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-400/40 max-h-28"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || sending}
              className="w-11 h-11 rounded-full bg-sky-500 text-white flex items-center justify-center disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
