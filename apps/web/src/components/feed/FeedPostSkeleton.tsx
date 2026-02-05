'use client';

/**
 * FeedPostSkeleton - Beautiful shimmer skeleton for post cards
 * Uses Stunity design language with orange/amber accents
 */
export default function FeedPostSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div 
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse"
      style={{ 
        animationDelay: `${index * 100}ms`,
        opacity: 0,
        animation: `fadeInUp 0.5s ease-out ${index * 100}ms forwards`
      }}
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Avatar Skeleton */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 animate-shimmer" />
        
        {/* Author Info Skeleton */}
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-full animate-shimmer" />
          <div className="h-3 w-24 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-full animate-shimmer" />
        </div>
        
        {/* Badge Skeleton */}
        <div className="h-6 w-16 bg-gradient-to-r from-orange-50 via-orange-100 to-orange-50 rounded-full animate-shimmer" />
      </div>

      {/* Content Skeleton */}
      <div className="px-4 pb-3 space-y-2">
        <div className="h-4 w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded animate-shimmer" />
        <div className="h-4 w-5/6 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded animate-shimmer" />
        <div className="h-4 w-4/6 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded animate-shimmer" />
      </div>

      {/* Image Placeholder (50% chance) */}
      {index % 2 === 0 && (
        <div className="mx-4 mb-3 h-48 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 rounded-xl animate-shimmer" />
      )}

      {/* Action Bar Skeleton */}
      <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
        <div className="flex gap-6">
          <div className="h-8 w-16 bg-gray-100 rounded-full animate-shimmer" />
          <div className="h-8 w-16 bg-gray-100 rounded-full animate-shimmer" />
          <div className="h-8 w-16 bg-gray-100 rounded-full animate-shimmer" />
        </div>
        <div className="h-8 w-8 bg-gray-100 rounded-full animate-shimmer" />
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * FeedSkeletonList - Renders multiple skeleton posts
 */
export function FeedSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostSkeleton key={i} index={i} />
      ))}
    </div>
  );
}
