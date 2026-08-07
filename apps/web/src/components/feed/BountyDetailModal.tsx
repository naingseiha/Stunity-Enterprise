'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import {
  fetchBountyReplies,
  submitBountyReply,
  type BountyReply,
} from '@/lib/api/bounties';
import type { FeynmanBounty } from '@/lib/feed-smart-scroll-types';

interface BountyDetailModalProps {
  isOpen: boolean;
  bounty: FeynmanBounty | null;
  mode: 'answers' | 'explain';
  onClose: () => void;
}

export default function BountyDetailModal({
  isOpen,
  bounty,
  mode,
  onClose,
}: BountyDetailModalProps) {
  const [replies, setReplies] = useState<BountyReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReplies = useCallback(async () => {
    if (!bounty?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBountyReplies(bounty.id);
      setReplies(data);
    } catch {
      setError('Failed to load answers');
    } finally {
      setLoading(false);
    }
  }, [bounty?.id]);

  useEffect(() => {
    if (isOpen && bounty?.id) {
      loadReplies();
      setDraft('');
    }
  }, [isOpen, bounty?.id, loadReplies]);

  if (!isOpen || !bounty) return null;

  const handleSubmit = async () => {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const reply = await submitBountyReply(bounty.id, draft.trim());
      if (reply) {
        setReplies((prev) => [reply, ...prev]);
        setDraft('');
      } else {
        setError('Failed to submit explanation');
      }
    } catch {
      setError('Failed to submit explanation');
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
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {mode === 'explain' ? 'Explain it' : 'Bounty answers'}
            </h2>
            <p className="text-xs text-gray-500">{bounty.subject} · +{bounty.bountyXp} XP</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{bounty.questionText}</p>

          {mode === 'explain' && (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder="Write a clear explanation a classmate could learn from…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              <button
                type="button"
                disabled={!draft.trim() || submitting}
                onClick={handleSubmit}
                className="w-full py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit explanation
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              Answers ({replies.length})
            </p>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              </div>
            ) : replies.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No answers yet. Be the first to explain!</p>
            ) : (
              <ul className="space-y-3">
                {replies.map((reply) => (
                  <li
                    key={reply.id}
                    className="rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        @{reply.tutor.name}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {reply.ahaCount} aha · {reply.format}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
