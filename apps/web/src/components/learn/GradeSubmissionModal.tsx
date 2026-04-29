'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { TokenManager } from '@/lib/api/auth';

export interface SubmissionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  profilePictureUrl: string | null;
}

export interface AssignmentSubmission {
  id: string;
  userId: string;
  submissionText: string | null;
  submissionUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RESUBMISSION_REQUIRED';
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  user: SubmissionUser | null;
}

interface GradeSubmissionModalProps {
  open: boolean;
  submission: AssignmentSubmission | null;
  maxScore: number;
  passingScore: number;
  onClose: () => void;
  onSaved: (submission: AssignmentSubmission) => void;
}

export default function GradeSubmissionModal({
  open,
  submission,
  maxScore,
  passingScore,
  onClose,
  onSaved,
}: GradeSubmissionModalProps) {
    const autoT = useTranslations();
  const [score, setScore] = useState<number>(passingScore);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !submission) return;
    setScore(submission.score ?? passingScore);
    setFeedback(submission.feedback ?? '');
    setError(null);
  }, [open, submission, passingScore]);

  const canSave = useMemo(() => {
    return Number.isFinite(score) && score >= 0 && score <= maxScore;
  }, [score, maxScore]);

  if (!open || !submission) return null;

  const displayName = submission.user
    ? `${submission.user.firstName} ${submission.user.lastName}`.trim()
    : submission.userId;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        setError('You are not authenticated. Please sign in again.');
        return;
      }

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/submissions/${submission.id}/grade`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score: Math.round(score),
          feedback: feedback.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || 'Failed to save grade.');
        return;
      }

      onSaved(data.submission as AssignmentSubmission);
      onClose();
    } catch {
      setError('Network error while grading submission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider"><AutoI18nText i18nKey="auto.web.components_learn_GradeSubmissionModal.k_b6ae2ae9" /></p>
            <h3 className="text-lg font-bold text-gray-900">{displayName}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 font-semibold uppercase mb-1"><AutoI18nText i18nKey="auto.web.components_learn_GradeSubmissionModal.k_27a3f7ef" /></p>
            <p className="text-sm font-medium text-gray-800 break-all">
              {submission.submissionUrl || submission.fileUrl || submission.submissionText || 'No content submitted'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-[11px] uppercase font-bold text-blue-500"><AutoI18nText i18nKey="auto.web.components_learn_GradeSubmissionModal.k_6d213ad1" /></p>
              <p className="text-xl font-black text-blue-700">{maxScore}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-[11px] uppercase font-bold text-amber-600"><AutoI18nText i18nKey="auto.web.components_learn_GradeSubmissionModal.k_55c56a35" /></p>
              <p className="text-xl font-black text-amber-700">{passingScore}</p>
            </div>
            <div className={`p-3 rounded-xl border ${score >= passingScore ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <p className={`text-[11px] uppercase font-bold ${score >= passingScore ? 'text-emerald-600' : 'text-rose-600'}`}><AutoI18nText i18nKey="auto.web.components_learn_GradeSubmissionModal.k_9768559a" /></p>
              <p className={`text-xl font-black ${score >= passingScore ? 'text-emerald-700' : 'text-rose-700'}`}>
                {score >= passingScore ? 'Pass' : 'Needs Work'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2"><AutoI18nText i18nKey="auto.web.components_learn_GradeSubmissionModal.k_7a82b686" /></label>
            <input
              type="number"
              min={0}
              max={maxScore}
              value={score}
              onChange={(event) => setScore(Number(event.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1"><AutoI18nText i18nKey="auto.web.components_learn_GradeSubmissionModal.k_abdc42a9" /> {maxScore}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2"><AutoI18nText i18nKey="auto.web.components_learn_GradeSubmissionModal.k_edb03e0a" /></label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder={autoT("auto.web.components_learn_GradeSubmissionModal.k_958eb30c")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <AutoI18nText i18nKey="auto.web.components_learn_GradeSubmissionModal.k_b1f53188" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Grade'}
          </button>
        </div>
      </div>
    </div>
  );
}
