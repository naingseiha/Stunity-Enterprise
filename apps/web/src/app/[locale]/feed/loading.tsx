'use client';

import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';

/**
 * FeedLoading - Next.js loading state for feed page
 * Uses Twitter-style smooth zoom animation with Stunity logo
 */
export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <FeedInlineLoader size="lg" />
    </div>
  );
}
