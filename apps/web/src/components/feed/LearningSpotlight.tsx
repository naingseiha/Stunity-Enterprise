'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Video,
  Loader2,
  GraduationCap,
  Star,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';

interface SpotlightItem {
  id: string;
  type: 'course' | 'video' | 'article' | 'quiz';
  title: string;
  author: string;
  href: string;
}

interface FeaturedCourse {
  id: string;
  title: string;
  category?: string;
  tags?: string[];
  instructor?: {
    name?: string;
  };
}

const TYPE_ICONS = {
  course: GraduationCap,
  video: Video,
  article: FileText,
  quiz: Star,
};

const TYPE_COLORS = {
  course: 'from-[#F9A825] to-[#FFB74D]',
  video: 'from-rose-400 to-pink-400',
  article: 'from-teal-400 to-cyan-400',
  quiz: 'from-violet-400 to-purple-400',
};

const getFallbackItems = (locale: string): SpotlightItem[] => [
  {
    id: 'fallback-course',
    type: 'course',
    title: 'Explore Featured Courses',
    author: 'Stunity Learn',
    href: `/${locale}/learn`,
  },
  {
    id: 'fallback-path',
    type: 'article',
    title: 'Discover Learning Paths',
    author: 'Stunity Learn',
    href: `/${locale}/learn`,
  },
  {
    id: 'fallback-create',
    type: 'video',
    title: 'Create a New Course',
    author: 'Stunity Creator Hub',
    href: `/${locale}/learn/create`,
  },
];

const inferSpotlightType = (course: FeaturedCourse): SpotlightItem['type'] => {
  const combined = `${course.category || ''} ${(course.tags || []).join(' ')}`.toLowerCase();
  if (combined.includes('quiz')) return 'quiz';
  if (combined.includes('video')) return 'video';
  if (combined.includes('article')) return 'article';
  return 'course';
};

export default function LearningSpotlight() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const tFeed = useTranslations('feed');
  const [items, setItems] = useState<SpotlightItem[]>(() => getFallbackItems(locale));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchSpotlightItems = async () => {
      try {
        const response = await TokenManager.fetchWithAuth(
          `${FEED_SERVICE_URL}/courses?featured=true&limit=3`
        );

        if (!response.ok) {
          if (mounted) setItems(getFallbackItems(locale));
          return;
        }

        const data = await response.json();
        const courses = (data?.courses || []) as FeaturedCourse[];

        const mappedItems: SpotlightItem[] = courses.slice(0, 3).map((course) => ({
          id: String(course.id),
          type: inferSpotlightType(course),
          title: course.title,
          author: course.instructor?.name || 'Stunity',
          href: `/${locale}/learn/course/${course.id}`,
        }));

        if (mounted) {
          setItems(mappedItems.length > 0 ? mappedItems : getFallbackItems(locale));
        }
      } catch (error) {
        console.error('Error fetching learning spotlight:', error);
        if (mounted) setItems(getFallbackItems(locale));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Defer to avoid competing with the main feed fetch
    const timer = setTimeout(fetchSpotlightItems, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [locale]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{tFeed('widgets.learningSpotlight.title')}</h3>
      </div>

      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-3 py-2 flex items-start gap-2">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          items.map((item) => {
            const Icon = TYPE_ICONS[item.type];

            return (
              <Link
                key={item.id}
                href={item.href}
                className="px-3 py-2 flex items-start gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${TYPE_COLORS[item.type]}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-xs truncate">{item.title}</h4>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{item.author}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
        <Link href={`/${locale}/learn`} className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#F9A825] transition-colors">
          {tFeed('widgets.learningSpotlight.seeAll')} →
        </Link>
      </div>
    </div>
  );
}
