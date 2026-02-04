export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skeleton Navigation */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-32" />
        </div>
        <div className="px-4 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      
      <div className="lg:ml-64 min-h-screen">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl animate-pulse" />
            <div>
              <div className="h-8 bg-white/30 rounded-lg w-48 mb-2 animate-pulse" />
              <div className="h-4 bg-white/20 rounded w-64 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Filter Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid md:grid-cols-5 gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
                    <div className="h-6 bg-gray-200 rounded w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1 h-8 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
