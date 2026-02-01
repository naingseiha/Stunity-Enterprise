'use client';

import { ReactNode } from 'react';
import UnifiedNavigation from '@/components/UnifiedNavigation';

// Shimmer effect for skeleton loading
const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent';

interface PageSkeletonProps {
  user?: any;
  school?: any;
  type?: 'table' | 'cards' | 'form' | 'dashboard';
  showFilters?: boolean;
}

/**
 * PageSkeleton Component
 * 
 * Standard loading skeleton for pages - always shows navigation
 * to maintain layout consistency during loading
 */
export default function PageSkeleton({
  user,
  school,
  type = 'table',
  showFilters = true,
}: PageSkeletonProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation user={user} school={school} />
      
      {/* Main Content - Left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 bg-gray-200 rounded-xl ${shimmer}`} />
                <div>
                  <div className={`h-8 w-48 bg-gray-200 rounded-lg mb-2 ${shimmer}`} />
                  <div className={`h-4 w-64 bg-gray-200 rounded ${shimmer}`} />
                </div>
              </div>
              <div className={`h-12 w-36 bg-gray-200 rounded-xl ${shimmer}`} />
            </div>
          </div>

          {/* Filters Skeleton */}
          {showFilters && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-wrap gap-4">
                <div className={`h-10 w-48 bg-gray-200 rounded-lg ${shimmer}`} />
                <div className={`h-10 w-36 bg-gray-200 rounded-lg ${shimmer}`} />
                <div className={`h-10 w-36 bg-gray-200 rounded-lg ${shimmer}`} />
                <div className={`h-10 w-24 bg-gray-200 rounded-lg ml-auto ${shimmer}`} />
              </div>
            </div>
          )}

          {/* Content Skeleton based on type */}
          {type === 'table' && <TableSkeleton />}
          {type === 'cards' && <CardsSkeleton />}
          {type === 'form' && <FormSkeleton />}
          {type === 'dashboard' && <DashboardSkeleton />}
        </main>
      </div>
    </div>
  );
}

/**
 * Table Skeleton
 */
function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`h-4 w-20 bg-gray-200 rounded ${shimmer}`} />
          ))}
        </div>
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
          <div className={`w-10 h-10 bg-gray-200 rounded-full ${shimmer}`} />
          <div className={`h-4 w-24 bg-gray-200 rounded ${shimmer}`} />
          <div className={`h-4 w-32 bg-gray-200 rounded ${shimmer}`} />
          <div className={`h-4 w-20 bg-gray-200 rounded ${shimmer}`} />
          <div className={`h-4 w-24 bg-gray-200 rounded ${shimmer}`} />
          <div className={`h-4 w-20 bg-gray-200 rounded ${shimmer}`} />
          <div className="ml-auto flex gap-2">
            <div className={`w-8 h-8 bg-gray-200 rounded ${shimmer}`} />
            <div className={`w-8 h-8 bg-gray-200 rounded ${shimmer}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Cards Skeleton
 */
function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 bg-gray-200 rounded-lg ${shimmer}`} />
            <div className="flex-1">
              <div className={`h-5 w-32 bg-gray-200 rounded mb-2 ${shimmer}`} />
              <div className={`h-3 w-24 bg-gray-200 rounded ${shimmer}`} />
            </div>
          </div>
          <div className="space-y-3">
            <div className={`h-4 w-full bg-gray-200 rounded ${shimmer}`} />
            <div className={`h-4 w-3/4 bg-gray-200 rounded ${shimmer}`} />
            <div className={`h-4 w-1/2 bg-gray-200 rounded ${shimmer}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Form Skeleton
 */
function FormSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className={`h-4 w-24 bg-gray-200 rounded mb-2 ${shimmer}`} />
            <div className={`h-10 w-full bg-gray-200 rounded-lg ${shimmer}`} />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <div className={`h-10 w-24 bg-gray-200 rounded-lg ${shimmer}`} />
        <div className={`h-10 w-32 bg-gray-200 rounded-lg ${shimmer}`} />
      </div>
    </div>
  );
}

/**
 * Dashboard Skeleton
 */
function DashboardSkeleton() {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className={`h-3 w-16 bg-gray-200 rounded mb-2 ${shimmer}`} />
                <div className={`h-8 w-20 bg-gray-200 rounded ${shimmer}`} />
              </div>
              <div className={`w-12 h-12 bg-gray-200 rounded-lg ${shimmer}`} />
            </div>
          </div>
        ))}
      </div>
      
      {/* Table */}
      <TableSkeleton />
    </>
  );
}

/**
 * Inline Content Skeleton (for use inside BlurLoader)
 */
export function ContentSkeleton({ type = 'table' }: { type?: 'table' | 'cards' | 'form' }) {
  if (type === 'table') return <TableSkeleton />;
  if (type === 'cards') return <CardsSkeleton />;
  if (type === 'form') return <FormSkeleton />;
  return null;
}
