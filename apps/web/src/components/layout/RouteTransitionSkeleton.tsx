'use client';

const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent';

export default function RouteTransitionSkeleton({
  type = 'table',
  showFilters = true,
}: {
  type?: 'table' | 'cards' | 'form' | 'dashboard';
  showFilters?: boolean;
}) {
  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      <div className="lg:ml-64 min-h-full">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 bg-gray-200 dark:bg-gray-800 rounded-xl ${shimmer}`} />
                <div>
                  <div className={`h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-2 ${shimmer}`} />
                  <div className={`h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
                </div>
              </div>
              <div className={`h-12 w-36 bg-gray-200 dark:bg-gray-800 rounded-xl ${shimmer}`} />
            </div>
          </div>

          {showFilters && (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
              <div className="flex flex-wrap gap-4">
                <div className={`h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg ${shimmer}`} />
                <div className={`h-10 w-36 bg-gray-200 dark:bg-gray-800 rounded-lg ${shimmer}`} />
                <div className={`h-10 w-36 bg-gray-200 dark:bg-gray-800 rounded-lg ${shimmer}`} />
                <div className={`h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg ml-auto ${shimmer}`} />
              </div>
            </div>
          )}

          {type === 'table' && <TableSkeleton />}
          {type === 'cards' && <CardsSkeleton />}
          {type === 'form' && <FormSkeleton />}
          {type === 'dashboard' && <DashboardSkeleton />}
        </main>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-3">
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
          ))}
        </div>
      </div>

      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
          <div className={`w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full ${shimmer}`} />
          <div className={`h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
          <div className={`h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
          <div className={`h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
          <div className={`h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
          <div className={`h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
          <div className="ml-auto flex gap-2">
            <div className={`w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
            <div className={`w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-lg ${shimmer}`} />
            <div className="flex-1">
              <div className={`h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2 ${shimmer}`} />
              <div className={`h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
            </div>
          </div>
          <div className="space-y-3">
            <div className={`h-4 w-full bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
            <div className={`h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
            <div className={`h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className={`h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-2 ${shimmer}`} />
            <div className={`h-10 w-full bg-gray-200 dark:bg-gray-800 rounded-lg ${shimmer}`} />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <div className={`h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg ${shimmer}`} />
        <div className={`h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg ${shimmer}`} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className={`h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded mb-2 ${shimmer}`} />
                <div className={`h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded ${shimmer}`} />
              </div>
              <div className={`w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-lg ${shimmer}`} />
            </div>
          </div>
        ))}
      </div>

      <TableSkeleton />
    </>
  );
}
