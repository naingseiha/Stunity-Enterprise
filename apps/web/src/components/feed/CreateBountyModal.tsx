'use client';

import { useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { createBounty } from '@/lib/api/bounties';

const SUBJECTS = [
  { label: 'Mathematics', value: 'mathematics', color: '#0284C7' },
  { label: 'Physics', value: 'physics', color: '#4F46E5' },
  { label: 'Chemistry', value: 'chemistry', color: '#9333EA' },
  { label: 'Biology', value: 'biology', color: '#16A34A' },
  { label: 'English', value: 'english', color: '#EA580C' },
  { label: 'History', value: 'history', color: '#CA8A04' },
];

const MIN_XP = 50;
const MAX_XP = 500;
const XP_STEP = 50;

interface CreateBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (bountyId: string) => void;
}

export default function CreateBountyModal({
  isOpen,
  onClose,
  onCreated,
}: CreateBountyModalProps) {
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [question, setQuestion] = useState('');
  const [bountyXp, setBountyXp] = useState(100);
  const [durationHours, setDurationHours] = useState(6);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subject = SUBJECTS[subjectIdx];
  const canPost = question.trim().length >= 20 && bountyXp >= MIN_XP;

  const durationOptions = useMemo(() => [2, 6, 12, 24], []);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!canPost || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createBounty({
        subject: subject.label,
        subjectColor: subject.color,
        questionText: question.trim(),
        bountyXp,
        durationHours,
      });
      setQuestion('');
      onCreated?.(result.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to post bounty');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Post a Bounty Question</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Subject</p>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s, i) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSubjectIdx(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    i === subjectIdx
                      ? 'text-white border-transparent'
                      : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                  style={i === subjectIdx ? { backgroundColor: s.color } : undefined}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Your Question</p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              placeholder="Explain what you're stuck on (at least 20 characters)…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">XP at Stake</p>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={bountyXp <= MIN_XP}
                onClick={() => setBountyXp((v) => Math.max(MIN_XP, v - XP_STEP))}
                className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 text-lg font-bold disabled:opacity-40"
              >
                −
              </button>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{bountyXp} XP</span>
              <button
                type="button"
                disabled={bountyXp >= MAX_XP}
                onClick={() => setBountyXp((v) => Math.min(MAX_XP, v + XP_STEP))}
                className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 text-lg font-bold disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Open for</p>
            <div className="flex gap-2">
              {durationOptions.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setDurationHours(h)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border ${
                    durationHours === h
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={!canPost || submitting}
            onClick={handleSubmit}
            className="w-full py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Post Bounty (−{bountyXp} XP)
          </button>
        </div>
      </div>
    </div>
  );
}
