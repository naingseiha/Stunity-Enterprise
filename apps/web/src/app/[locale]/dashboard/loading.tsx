'use client';

import PageSkeleton from '@/components/layout/PageSkeleton';

export default function DashboardLoading() {
  return <PageSkeleton type="dashboard" showFilters={false} />;
}
