import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';

interface ReviewUser {
  firstName: string;
  lastName: string;
}

interface CourseReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: ReviewUser;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { rating: number; count: number; percentage: number }[];
}

export function CourseReviews({ courseId }: { courseId: string }) {
    const autoT = useTranslations();
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Submit state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [courseId]);

  const fetchReviews = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/reviews`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    try {
      setSubmitting(true);
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const res = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}/reviews`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ rating, comment })
      });

      if (res.ok) {
        setRating(0);
        setComment('');
        fetchReviews();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <FeedInlineLoader size="md" />
      </div>
    );
  }

  const renderStars = (count: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < Math.round(count) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} 
      />
    ));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.components_learn_CourseReviews.k_e62d18bb" /></h2>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-4 text-center">
          <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
            {stats?.averageRating || 0}
          </div>
          <div className="flex justify-center gap-1 mb-2">
            {renderStars(stats?.averageRating || 0)}
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">
            <AutoI18nText i18nKey="auto.web.components_learn_CourseReviews.k_efa3a2f7" />
          </p>
        </div>

        <div className="md:col-span-8 flex flex-col gap-2">
          {stats?.ratingDistribution.map(({ rating: star, percentage }) => (
            <div key={star} className="flex items-center gap-4">
              <div className="flex items-center gap-1 w-16 text-sm font-medium text-amber-500">
                {star}
                <Star className="w-3 h-3 fill-amber-500" />
              </div>
              <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-12 text-sm text-gray-500 dark:text-gray-400 text-right">
                {percentage}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* Submit Review */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4"><AutoI18nText i18nKey="auto.web.components_learn_CourseReviews.k_06ffb942" /></h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star className={`w-8 h-8 ${
                  star <= (hoverRating || rating) 
                    ? 'text-amber-400 fill-amber-400' 
                    : 'text-gray-200 dark:text-gray-700'
                }`} />
              </button>
            ))}
          </div>
          <textarea
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            rows={3}
            placeholder={autoT("auto.web.components_learn_CourseReviews.k_690845e2")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>

      {/* Review List */}
      <div className="space-y-6 pt-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
            <h3 className="text-gray-900 dark:text-white font-medium mb-1"><AutoI18nText i18nKey="auto.web.components_learn_CourseReviews.k_f0a9d13b" /></h3>
            <p className="text-sm text-gray-500 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.components_learn_CourseReviews.k_58c2199f" /></p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="border-b border-gray-100 dark:border-gray-800 pb-6 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 dark:text-white">
                    {review.user?.firstName} {review.user?.lastName}
                  </span>
                  <div className="flex gap-0.5 mt-1">
                    {renderStars(review.rating)}
                  </div>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.comment && (
                <p className="text-gray-700 dark:text-gray-300 mt-3 whitespace-pre-wrap leading-relaxed">
                  {review.comment}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
