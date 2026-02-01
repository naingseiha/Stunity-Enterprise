'use client';

import PageSkeleton from '@/components/layout/PageSkeleton';

export default function AttendanceLoading() {
  return <PageSkeleton type="table" showFilters={true} />;
}
