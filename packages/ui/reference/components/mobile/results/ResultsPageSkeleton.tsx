"use client";

interface ResultsPageSkeletonProps {
  count?: number;
}

export default function ResultsPageSkeleton({ count = 5 }: ResultsPageSkeletonProps) {
  return (
    <div className="px-5 pt-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-md border-l-4 border-gray-200 border-y border-r border-gray-100/80 p-4 animate-pulse"
        >
          {/* Top Row */}
          <div className="flex items-center gap-3 mb-3">
            {/* Rank Badge */}
            <div className="w-[60px] h-12 bg-gray-200 rounded-[14px]"></div>

            {/* Name & Class */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>

            {/* Grade Badge */}
            <div className="w-12 h-12 bg-gray-200 rounded-[14px]"></div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((j) => (
              <div
                key={j}
                className="bg-gray-50 border-2 border-gray-100 rounded-[12px] p-2"
              >
                <div className="h-2 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
