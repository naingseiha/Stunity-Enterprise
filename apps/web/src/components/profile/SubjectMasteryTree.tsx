'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Clock, GitBranch } from 'lucide-react';
import { fetchMasteryTree, type MasterySubject } from '@/lib/api/recall';
import { MASTERY_TREE_ENABLED } from '@/lib/feature-flags';

function masteryColor(pct: number) {
  if (pct >= 80) return '#16A34A';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

function MasteryBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.max(2, Math.min(100, pct))}%`,
          backgroundColor: masteryColor(pct),
        }}
      />
    </div>
  );
}

interface SubjectMasteryTreeProps {
  profileUserId?: string;
  currentUserId?: string;
  isKm?: boolean;
}

export default function SubjectMasteryTree({
  profileUserId,
  currentUserId,
  isKm = false,
}: SubjectMasteryTreeProps) {
  const isOwn =
    !!currentUserId && (!profileUserId || profileUserId === currentUserId || profileUserId === 'me');
  const [subjects, setSubjects] = useState<MasterySubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOwn || !MASTERY_TREE_ENABLED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchMasteryTree()
      .then((s) => {
        if (!cancelled) setSubjects(s);
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOwn]);

  const toggle = useCallback((subject: string) => {
    setExpanded((prev) => ({ ...prev, [subject]: !prev[subject] }));
  }, []);

  if (!isOwn || !MASTERY_TREE_ENABLED || loading || subjects.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-sky-500" />
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">
          {isKm ? 'ជំនាញតាមមុខវិជ្ជា' : 'Subject mastery'}
        </h3>
      </div>

      <div className="space-y-3">
        {subjects.map((subj) => {
          const open = !!expanded[subj.subject];
          return (
            <div key={subj.subject}>
              <button
                type="button"
                onClick={() => toggle(subj.subject)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="flex-1 text-sm font-bold text-gray-900 dark:text-white truncate">
                    {subj.label}
                  </p>
                  {subj.dueCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-[10px] font-bold text-amber-700">
                      <Clock className="w-3 h-3" />
                      {subj.dueCount} {isKm ? 'ដល់ពេល' : 'due'}
                    </span>
                  )}
                  <span
                    className="text-xs font-black tabular-nums"
                    style={{ color: masteryColor(subj.mastery) }}
                  >
                    {subj.mastery}%
                  </span>
                  {open ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <MasteryBar pct={subj.mastery} />
              </button>

              {open && (
                <div className="mt-2 ml-1 space-y-2 border-l-2 border-slate-100 dark:border-slate-700 pl-3">
                  {subj.topics.map((tp) => (
                    <div key={tp.label} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate mb-1">
                          {tp.label}
                        </p>
                        <MasteryBar pct={tp.mastery} />
                      </div>
                      <span
                        className="text-[11px] font-bold tabular-nums w-10 text-right"
                        style={{ color: masteryColor(tp.mastery) }}
                      >
                        {tp.mastery}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
