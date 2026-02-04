'use client';

import UnifiedNavigation from '@/components/UnifiedNavigation';

// Shimmer effect for skeleton loading
const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation />
      
      <div className="lg:ml-64 min-h-screen">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 bg-white/20 rounded-2xl ${shimmer}`} />
            <div>
              <div className={`h-8 bg-white/30 rounded-lg w-48 mb-2 ${shimmer}`} />
              <div className={`h-4 bg-white/20 rounded w-64 ${shimmer}`} />
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Filter Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className={`h-4 bg-gray-200 rounded w-24 mb-2 ${shimmer}`} />
                  <div className={`h-10 bg-gray-100 rounded-lg ${shimmer}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            {[
              'from-blue-500 to-blue-600',
              'from-green-500 to-green-600', 
              'from-emerald-500 to-teal-600',
              'from-orange-500 to-red-500'
            ].map((gradient, i) => (
              <div key={i} className={`bg-gradient-to-br ${gradient} rounded-2xl p-5`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`h-3 bg-white/30 rounded w-20 mb-2 ${shimmer}`} />
                    <div className={`h-8 bg-white/40 rounded w-16 ${shimmer}`} />
                  </div>
                  <div className={`w-12 h-12 bg-white/20 rounded-xl ${shimmer}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Charts Grid Skeleton */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border p-6">
                <div className={`h-6 bg-gray-200 rounded w-40 mb-4 ${shimmer}`} />
                <div className={`h-[300px] bg-gray-100 rounded-lg ${shimmer}`} />
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
              <div className={`h-6 bg-gray-200 rounded w-48 ${shimmer}`} />
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <div className={`w-8 h-8 bg-gray-200 rounded-full ${shimmer}`} />
                  <div className={`w-10 h-10 bg-gray-200 rounded-full ${shimmer}`} />
                  <div className="flex-1">
                    <div className={`h-4 bg-gray-200 rounded w-32 mb-1 ${shimmer}`} />
                    <div className={`h-3 bg-gray-100 rounded w-24 ${shimmer}`} />
                  </div>
                  <div className={`h-6 bg-gray-200 rounded w-16 ${shimmer}`} />
                  <div className={`h-6 bg-gray-200 rounded-full w-20 ${shimmer}`} />
                  <div className={`h-6 bg-gray-200 rounded-full w-16 ${shimmer}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
