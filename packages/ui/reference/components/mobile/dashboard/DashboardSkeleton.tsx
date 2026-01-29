export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-20 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-4 pt-8 pb-24 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="h-8 bg-white/20 rounded-lg w-32 mb-2"></div>
              <div className="h-4 bg-white/10 rounded w-24"></div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl"></div>
          </div>

          {/* Quick Stats Grid Skeleton */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30">
                <div className="h-3 bg-white/20 rounded w-16 mb-2"></div>
                <div className="h-8 bg-white/30 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search Card Skeleton */}
      <div className="px-4 -mt-16 relative z-20 mb-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 h-16"></div>
      </div>

      {/* Performance Indicator Skeleton */}
      <div className="px-4 mb-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="h-4 bg-green-200 rounded w-32 mb-2"></div>
              <div className="h-8 bg-green-300 rounded w-24"></div>
            </div>
            <div>
              <div className="h-3 bg-green-200 rounded w-16 mb-2"></div>
              <div className="h-6 bg-green-300 rounded w-12"></div>
            </div>
          </div>
          <div className="h-2 bg-green-200 rounded-full w-full"></div>
        </div>
      </div>

      {/* Grade Tabs Skeleton */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-shrink-0 h-16 bg-white rounded-xl border border-gray-200 w-24"></div>
          ))}
        </div>
      </div>

      {/* Horizontal Class Cards Skeleton */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 bg-gray-200 rounded w-32"></div>
          <div className="h-6 bg-gray-100 rounded-full w-16"></div>
        </div>
        <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
          <div className="flex gap-4 pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-80 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gray-200 p-4 h-28"></div>
                {/* Body */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </div>
                    <div className="h-2.5 bg-gray-200 rounded-full w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
