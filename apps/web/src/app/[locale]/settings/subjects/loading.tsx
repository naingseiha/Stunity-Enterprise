'use client';

import PageSkeleton from '@/components/layout/PageSkeleton';

export default function SubjectsLoading() {
  return <PageSkeleton type="table" showFilters={true} />;
}
