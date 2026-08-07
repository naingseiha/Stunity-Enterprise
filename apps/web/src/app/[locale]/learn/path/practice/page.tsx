"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { ArrowLeft, Check, X, RefreshCw, Trophy, Star } from "lucide-react";
import { learnPathApi, PracticeQuestion } from "@/lib/api/learnPath";
import { MarkdownMathView } from "@/components/learn/MarkdownMathView";
import UnifiedNavigation from "@/components/UnifiedNavigation";

function PracticeInner() {
  const params = useParams();
  const locale = (params?.locale as string) || "km";
  const isKm = locale === "km";
  const search = useSearchParams();
  const router = useRouter();

  const topicId = search.get("topicId") || undefined;
  const subjectId = search.get("subjectId") || undefined;
  const title = search.get("title") || (isKm ? "លំហាត់" : "Practice");
  const minDifficulty = search.get("minDifficulty")
    ? Number(search.get("minDifficulty"))
    : undefined;
  const maxDifficulty = search.get("maxDifficulty")
    ? Number(search.get("maxDifficulty"))
    : undefined;

  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoadError(false);
    setQuestions(null);
    setIndex(0);
    setChosen(null);
    setRevealed(false);
    setCorrectCount(0);
    setXpTotal(0);
    setFinished(false);
    try {
      const qs = await learnPathApi.getPractice(
        { topicId, subjectId },
        10,
        minDifficulty != null || maxDifficulty != null
          ? { minDifficulty, maxDifficulty }
          : undefined
      );
      setQuestions(qs);
      if (qs.length === 0) setLoadError(true);
    } catch {
      setLoadError(true);
      setQuestions([]);
    }
  }, [topicId, subjectId, minDifficulty, maxDifficulty]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const q = questions?.[index] ?? null;
  const total = questions?.length ?? 0;

  const pick = async (optIndex: number) => {
    if (!q || revealed || submitting) return;
    setChosen(optIndex);
    setRevealed(true);
    setSubmitting(true);
    const correct = optIndex === q.correctIndex;
    if (correct) setCorrectCount((c) => c + 1);
    try {
      const result = await learnPathApi.submitAnswer(q, optIndex);
      if (result?.xpEarned) setXpTotal((x) => x + Number(result.xpEarned));
      else if (correct) setXpTotal((x) => x + (q.points || 10));
    } catch {
      if (correct) setXpTotal((x) => x + (q.points || 10));
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
    setRevealed(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <UnifiedNavigation />
      <div className="max-w-lg mx-auto px-4 pt-[max(env(safe-area-inset-top),16px)] md:pt-8 pb-[max(env(safe-area-inset-bottom),24px)]">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/learn`)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {isKm ? "ត្រឡប់" : "Back"}
        </button>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-black text-slate-900 dark:text-white truncate pr-3">
            {title}
          </h1>
          {!finished && total > 0 && (
            <span className="text-xs font-bold text-slate-500 shrink-0">
              {index + 1}/{total}
            </span>
          )}
        </div>

        {!finished && total > 0 && (
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all"
              style={{ width: `${((index + (revealed ? 1 : 0)) / total) * 100}%` }}
            />
          </div>
        )}

        {questions === null ? (
          <div className="py-20 flex justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        ) : loadError || total === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 mb-4">
              {isKm ? "មិនមានសំណួរសម្រាប់លំហាត់នេះ" : "No practice questions available"}
            </p>
            <button
              type="button"
              onClick={loadQuestions}
              className="text-sky-600 font-bold text-sm inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              {isKm ? "ព្យាយាមម្តងទៀត" : "Retry"}
            </button>
          </div>
        ) : finished ? (
          <div className="text-center py-10">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
              <Trophy className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
              {isKm ? "បញ្ចប់លំហាត់!" : "Session complete!"}
            </h2>
            <p className="text-slate-500 mb-6">
              {correctCount}/{total} {isKm ? "ត្រឹមត្រូវ" : "correct"}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold mb-8">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              +{xpTotal} XP
            </div>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <button
                type="button"
                onClick={loadQuestions}
                className="py-3 rounded-2xl font-bold text-sm bg-sky-500 text-white"
              >
                {isKm ? "ហាត់ម្តងទៀត" : "Practice again"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/${locale}/learn`)}
                className="py-3 rounded-2xl font-bold text-sm bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                {isKm ? "ត្រឡប់ទៅផ្លូវសិក្សា" : "Back to path"}
              </button>
            </div>
          </div>
        ) : q ? (
          <div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-4 shadow-sm">
              <div className="prose prose-sm dark:prose-invert max-w-none font-medium text-slate-900 dark:text-slate-100">
                <MarkdownMathView text={q.text} />
              </div>
            </div>

            <div className="space-y-2.5">
              {q.options.map((opt, i) => {
                let style =
                  "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-300";
                if (revealed) {
                  if (i === q.correctIndex)
                    style = "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15";
                  else if (i === chosen)
                    style = "border-red-400 bg-red-50 dark:bg-red-500/15";
                  else style = "border-slate-200 dark:border-slate-700 opacity-60";
                } else if (chosen === i) {
                  style = "border-sky-500 bg-sky-50 dark:bg-sky-500/10";
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={revealed}
                    onClick={() => pick(i)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition active:scale-[0.99] ${style}`}
                  >
                    <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100 pt-0.5">
                      <MarkdownMathView text={opt} />
                    </span>
                    {revealed && i === q.correctIndex && (
                      <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    )}
                    {revealed && i === chosen && i !== q.correctIndex && (
                      <X className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div className="mt-4 space-y-3">
                {q.explanation && (
                  <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 text-sm text-slate-700 dark:text-slate-200">
                    <MarkdownMathView text={q.explanation} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={next}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-bold shadow-md"
                >
                  {index + 1 >= total
                    ? isKm
                      ? "មើលលទ្ធផល"
                      : "See results"
                    : isKm
                      ? "បន្ត"
                      : "Next"}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PracticeSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
        </div>
      }
    >
      <PracticeInner />
    </Suspense>
  );
}
