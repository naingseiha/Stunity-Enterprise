'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Copy, Share2, X } from 'lucide-react';

interface ShareSheetProps {
  open: boolean;
  url: string;
  title?: string;
  onClose: () => void;
  onShared?: () => void;
}

export default function ShareSheet({ open, url, title, onClose, onShared }: ShareSheetProps) {
  const tFeed = useTranslations('feed');
  const t = useTranslations('common');
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onShared?.();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ url, title: title || 'Stunity' });
      onShared?.();
      onClose();
    } catch {
      // user cancelled
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{tFeed('postCard.shareTitle')}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-3 space-y-2">
          <button
            type="button"
            onClick={copy}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <span className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              {copied ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <Copy className="w-5 h-5 text-emerald-600" />
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                {copied ? tFeed('postDetail.copied') : tFeed('postCard.copyPostLink')}
              </span>
              <span className="block text-xs text-gray-500 truncate max-w-[220px]">{url}</span>
            </span>
          </button>

          {canNativeShare && (
            <button
              type="button"
              onClick={nativeShare}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <span className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-sky-600" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                  {tFeed('postCard.shareVia')}
                </span>
                <span className="block text-xs text-gray-500">{tFeed('postCard.shareViaSystem')}</span>
              </span>
            </button>
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
