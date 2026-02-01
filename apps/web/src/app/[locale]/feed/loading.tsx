'use client';

import PageSkeleton from '@/components/layout/PageSkeleton';

export default function FeedLoading() {
  return <PageSkeleton type="cards" showFilters={false} />;
}
