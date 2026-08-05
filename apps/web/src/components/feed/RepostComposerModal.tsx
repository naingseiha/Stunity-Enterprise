'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Repeat2, X } from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';

interface RepostComposerModalProps {
  open: boolean;
  postId: string;
  authorName: string;
  previewTitle?: string;
  previewContent?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const MAX_LEN = 500;

export default function RepostComposerModal({
  open,
  postId,
  authorName,
  previewTitle,
  previewContent,
  onClose,
  onSuccess,
}: RepostComposerModalProps) {
  const t = useTranslations('common');
  const tFeed = useTranslations('feed');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const close = () => {
    if (submitting) return;
    setComment('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${FEED_SERVICE_URL}/posts/${postId}/repost`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: comment.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || tFeed('repostOwnError'));
        return;
      }
      setComment('');
      onSuccess?.();
      onClose();
    } catch {
      setError(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={close}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10">
          <button type="button" onClick={close} className="text-sm font-semibold text-gray-500 hover:text-gray-800">
            {t('cancel')}
          </button>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Repeat2 className="w-4 h-4" />
            {tFeed('postCard.repost')}
          </h3>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : tFeed('postCard.repost')}
          </button>
        </div>

        <div className="p-4 space-y-3">
          <textarea
            value={comment}
            onChange={(e) => {
              if (e.target.value.length <= MAX_LEN) setComment(e.target.value);
            }}
            placeholder={tFeed('repostCommentPlaceholder')}
            rows={3}
            autoFocus
            className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/30"
          />
          <div className="text-right text-[11px] text-gray-400">{comment.length}/{MAX_LEN}</div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Repeat2 className="w-3.5 h-3.5" />
              <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{authorName}</span>
            </div>
            {previewTitle ? (
              <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{previewTitle}</p>
            ) : null}
            {previewContent ? (
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mt-0.5">{previewContent}</p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </div>

        <button type="button" className="sr-only" onClick={close} aria-hidden>
          <X />
        </button>
      </div>
    </div>
  );
}
