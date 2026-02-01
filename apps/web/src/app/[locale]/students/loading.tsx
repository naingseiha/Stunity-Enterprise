'use client';

import PageSkeleton from '@/components/layout/PageSkeleton';

export default function StudentsLoading() {
  return <PageSkeleton type="table" showFilters={true} />;
}
