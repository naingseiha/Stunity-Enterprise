'use client';

import PageSkeleton from '@/components/layout/PageSkeleton';

export default function TimetableLoading() {
  return <PageSkeleton type="table" showFilters={true} />;
}
