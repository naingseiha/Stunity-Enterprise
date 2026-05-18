'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Gem,
  CheckCircle2,
  Lightbulb,
  Eye,
  Layers,
  ArrowDownCircle,
  CheckCircle,
  Flame,
  BarChart3,
  Loader2,
  Star,
} from 'lucide-react';

export interface EducationalValue {
  accuracy: number;
  helpfulness: number;
  clarity: number;
  depth: number;
  difficulty: 'too_easy' | 'just_right' | 'too_hard' | null;
  recommend: boolean;
}

interface EducationalValueModalProps {
  isOpen: boolean;
  postType: string;
  onClose: () => void;
  onSubmit: (value: EducationalValue) => Promise<void>;
  isSubmitting?: boolean;
}

const DIMENSIONS: { key: keyof Omit<EducationalValue, 'difficulty' | 'recommend'>; icon: any; labelKey: string; color: string; hoverBg: string }[] = [
  { key: 'accuracy', icon: CheckCircle2, labelKey: 'feed.educationalValue.accuracy', color: 'text-emerald-500', hoverBg: 'hover:text-emerald-500' },
  { key: 'helpfulness', icon: Lightbulb, labelKey: 'feed.educationalValue.helpfulness', color: 'text-sky-500', hoverBg: 'hover:text-sky-500' },
  { key: 'clarity', icon: Eye, labelKey: 'feed.educationalValue.clarity', color: 'text-blue-500', hoverBg: 'hover:text-blue-500' },
  { key: 'depth', icon: Layers, labelKey: 'feed.educationalValue.depth', color: 'text-purple-500', hoverBg: 'hover:text-purple-500' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'too_easy', labelKey: 'feed.educationalValue.easy', icon: ArrowDownCircle, color: 'text-emerald-500 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900', activeColor: 'border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
  { value: 'just_right', labelKey: 'feed.educationalValue.justRight', icon: CheckCircle, color: 'text-sky-500 border-sky-200 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-900', activeColor: 'border-sky-500 ring-2 ring-sky-500/20 text-sky-600 dark:text-sky-400' },
  { value: 'too_hard', labelKey: 'feed.educationalValue.hard', icon: Flame, color: 'text-rose-500 border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900', activeColor: 'border-rose-500 ring-2 ring-rose-500/20 text-rose-600 dark:text-rose-400' },
] as const;

const INITIAL_VALUE: EducationalValue = {
  accuracy: 0,
  helpfulness: 0,
  clarity: 0,
  depth: 0,
  difficulty: null,
  recommend: false,
};

export default function EducationalValueModal({
  isOpen,
  postType,
  onClose,
  onSubmit,
  isSubmitting = false,
}: EducationalValueModalProps) {
  const t = useTranslations();
  const [value, setValue] = useState<EducationalValue>(INITIAL_VALUE);
  const [hoveredStars, setHoveredStars] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen) {
      setValue(INITIAL_VALUE);
      setHoveredStars({});
    }
  }, [isOpen]);

  const handleRate = useCallback((key: keyof EducationalValue, rating: number) => {
    setValue((prev) => ({ ...prev, [key]: rating }));
  }, []);

  const handleDifficulty = useCallback((diff: EducationalValue['difficulty']) => {
    setValue((prev) => ({ ...prev, difficulty: diff }));
  }, []);

  const handleRecommend = useCallback(() => {
    setValue((prev) => ({ ...prev, recommend: !prev.recommend }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    await onSubmit(value);
  }, [value, onSubmit, isSubmitting]);

  const handleClose = useCallback(() => {
    setValue(INITIAL_VALUE);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const isComplete =
    value.accuracy > 0 &&
    value.helpfulness > 0 &&
    value.clarity > 0 &&
    value.depth > 0;

  const averageRating = isComplete
    ? ((value.accuracy + value.helpfulness + value.clarity + value.depth) / 4).toFixed(1)
    : '0.0';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col transform transition-all duration-300 scale-100 border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shadow-sm">
              <Gem className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {t('feed.educationalValue.title')}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {t('feed.educationalValue.rateSubtitle')}{' '}
                <span className="font-semibold text-purple-500">
                  {t(`feed.postTypes.${postType?.toLowerCase() || 'article'}`)}
                </span>
                ?
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Ratings */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* Star Ratings Section */}
          <div className="space-y-4">
            {DIMENSIONS.map((dim) => {
              const IconComponent = dim.icon;
              const currentRating = value[dim.key] as number;
              const hoverRating = hoveredStars[dim.key] || 0;

              return (
                <div
                  key={dim.key}
                  className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/30 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400`}>
                      <IconComponent className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t(dim.labelKey)}
                    </span>
                  </div>

                  {/* Stars Row */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = star <= (hoverRating || currentRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoveredStars((prev) => ({ ...prev, [dim.key]: star }))}
                          onMouseLeave={() => setHoveredStars((prev) => ({ ...prev, [dim.key]: 0 }))}
                          onClick={() => handleRate(dim.key, star)}
                          className="p-1 focus:outline-none transition-transform active:scale-95 duration-100"
                        >
                          <Star
                            className={`w-5.5 h-5.5 transition-all duration-150 ${
                              isActive
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]'
                                : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Difficulty Selection */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('feed.educationalValue.difficulty')}
            </h3>
            <div className="flex gap-3">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const active = value.difficulty === opt.value;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleDifficulty(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 hover:scale-[1.02] ${
                      active
                        ? opt.activeColor
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-700'
                    }`}
                  >
                    <OptIcon className="w-4 h-4" />
                    <span>{t(opt.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Peer Recommendation Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRecommend}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-300 ${
                value.recommend
                  ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400'
                  : 'border-gray-200 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  value.recommend
                    ? 'border-purple-500 bg-purple-500 text-white'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {value.recommend && <span className="text-[10px] font-bold">✓</span>}
              </div>
              <span className="text-sm font-semibold text-left">
                {t('feed.educationalValue.recommend')}
              </span>
            </button>
          </div>
        </div>

        {/* Footer Summary & Submit */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col gap-3">
          {isComplete && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 animate-slideDown">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span>
                {t('feed.educationalValue.averageRating')}{' '}
                <span className="font-extrabold text-purple-600 dark:text-purple-400">
                  {averageRating}/5.0
                </span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all duration-300 ${
              isComplete && !isSubmitting
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 hover:shadow-purple-500/20 active:scale-[0.98]'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <Gem className="w-4 h-4" />
                <span>{t('feed.educationalValue.submit')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
