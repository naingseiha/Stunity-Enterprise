"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, ArrowRight, RefreshCw } from "lucide-react";
import { learnPathApi, UnitLesson } from "@/lib/api/learnPath";
import { MarkdownMathView } from "@/components/learn/MarkdownMathView";
import UnifiedNavigation from "@/components/UnifiedNavigation";

function LessonInner() {
  const params = useParams();
  const locale = (params?.locale as string) || "km";
  const isKm = locale === "km";
  const search = useSearchParams();
  const router = useRouter();
  const topicId = search.get("topicId") || "";
  const title = search.get("title") || (isKm ? "មេរៀន" : "Lesson");
  const grade = search.get("grade") || "";
  const subjectName = search.get("subjectName") || "";

  const [lesson, setLesson] = useState<UnitLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!topicId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await learnPathApi.getLesson(topicId);
        if (!cancelled) setLesson(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  const body = isKm
    ? lesson?.miniLessonKh || lesson?.miniLesson
    : lesson?.miniLesson || lesson?.miniLessonKh;

  const practiceHref = `/${locale}/learn/path/practice?topicId=${topicId}&title=${encodeURIComponent(
    title
  )}&grade=${grade}&subjectName=${encodeURIComponent(subjectName)}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <UnifiedNavigation />
      <div className="max-w-2xl mx-auto px-4 pt-[max(env(safe-area-inset-top),16px)] md:pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] md:pb-10">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/learn`)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {isKm ? "ត្រឡប់ទៅផ្លូវសិក្សា" : "Back to path"}
        </button>

        <div className="rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 p-5 text-white mb-5 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/80 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            {subjectName || (isKm ? "មេរៀន" : "Lesson")}
            {grade ? ` · ${isKm ? `ថ្នាក់ទី ${grade}` : `Grade ${grade}`}` : ""}
          </div>
          <h1 className="text-xl font-black">{title}</h1>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        ) : error || !lesson ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-3">
              {isKm ? "មិនមានមេរៀនសម្រាប់ឯកតានេះ" : "No lesson content for this unit"}
            </p>
            <Link href={practiceHref} className="text-sky-600 font-bold text-sm">
              {isKm ? "ទៅលំហាត់វិញ" : "Go to practice"}
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {body ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 prose prose-sm dark:prose-invert max-w-none">
                <MarkdownMathView text={body} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">{isKm ? "មិនទាន់មានអត្ថបទមេរៀន" : "No lesson text yet"}</p>
            )}

            {lesson.formulaSheet && lesson.formulaSheet.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-white">
                  {isKm ? "រូបមន្ត" : "Formulas"}
                </h3>
                <ul className="space-y-2">
                  {lesson.formulaSheet.map((f, i) => (
                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                      <code className="font-mono text-sky-700 dark:text-sky-400">{f.expr}</code>
                      {f.noteKh && isKm && (
                        <span className="block text-xs text-slate-500 mt-0.5">{f.noteKh}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 md:static md:mt-8 p-4 md:p-0 pb-[max(env(safe-area-inset-bottom),16px)] md:pb-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950">
          <Link
            href={practiceHref}
            className="flex items-center justify-center gap-2 w-full max-w-2xl mx-auto py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-bold shadow-lg"
          >
            {isKm ? "ចាប់ផ្តើមលំហាត់" : "Start practice"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnitLessonPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
        </div>
      }
    >
      <LessonInner />
    </Suspense>
  );
}
