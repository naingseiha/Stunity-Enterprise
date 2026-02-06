'use client';

/**
 * ProfileSkeleton - Education-themed skeleton loader for profile pages
 * 
 * Matches the actual profile layout with:
 * - Larger cover photo area (h-56 md:h-72)
 * - Profile card with avatar, name, stats
 * - Content sections with shimmer animations
 * - Stunity orange/amber color scheme
 */
export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/50 via-white to-amber-50/30">
      {/* Navigation placeholder */}
      <div className="h-16 bg-white border-b border-gray-100 shadow-sm" />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Main Profile Card */}
        <div 
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          style={{
            animation: 'fadeInUp 0.5s ease-out forwards',
          }}
        >
          {/* Cover Photo Skeleton - Larger height */}
          <div 
            className="relative h-56 md:h-72 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #fb923c 100%)',
            }}
          >
            {/* Shimmer overlay */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmerCover 2s ease-in-out infinite',
              }}
            />
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full animate-pulse" />
          </div>

          {/* Profile Content */}
          <div className="px-6 pb-6">
            {/* Avatar - Overlapping cover */}
            <div className="relative -mt-20 md:-mt-24 mb-4">
              <div 
                className="w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-white shadow-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #fdba74 0%, #f97316 100%)',
                  animation: 'pulseAvatar 2s ease-in-out infinite',
                }}
              >
                <div 
                  className="w-full h-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s ease-in-out infinite',
                  }}
                />
              </div>
              {/* Badge skeleton */}
              <div className="absolute -bottom-1 left-16 w-28 h-5 bg-gradient-to-r from-orange-200 to-amber-200 rounded-full animate-pulse" />
            </div>

            {/* Name and Info */}
            <div className="space-y-3">
              {/* Name */}
              <div 
                className="h-8 w-64 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
              {/* Headline */}
              <div 
                className="h-5 w-80 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-md"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite 0.1s',
                }}
              />
              {/* Location */}
              <div 
                className="h-4 w-48 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-md"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite 0.2s',
                }}
              />
              {/* Connections */}
              <div 
                className="h-4 w-32 bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100 rounded-md"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite 0.3s',
                }}
              />

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 mt-4 pt-2">
                <div 
                  className="h-9 w-24 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                  style={{
                    animation: 'pulseButton 1.5s ease-in-out infinite',
                  }}
                />
                <div 
                  className="h-9 w-36 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full border border-gray-200"
                  style={{
                    animation: 'pulseButton 1.5s ease-in-out infinite 0.1s',
                  }}
                />
                <div 
                  className="h-9 w-28 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full border border-gray-200"
                  style={{
                    animation: 'pulseButton 1.5s ease-in-out infinite 0.2s',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Skeleton */}
        <div 
          className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-3 p-1"
          style={{
            animation: 'fadeInUp 0.5s ease-out 0.1s forwards',
            opacity: 0,
          }}
        >
          <div className="flex gap-1 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i}
                className="h-10 flex-1 min-w-[80px] bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-lg"
                style={{
                  backgroundSize: '200% 100%',
                  animation: `shimmer 1.5s ease-in-out infinite ${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          {/* Main Content - Left/Center */}
          <div className="md:col-span-2 space-y-3">
            {/* About Section */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              style={{
                animation: 'fadeInUp 0.5s ease-out 0.2s forwards',
                opacity: 0,
              }}
            >
              <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                <div className="h-6 w-20 bg-gradient-to-r from-gray-200 to-gray-100 rounded-md animate-pulse" />
                <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
              </div>
              <div className="p-6 space-y-3">
                <div 
                  className="h-4 w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded"
                  style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }}
                />
                <div 
                  className="h-4 w-5/6 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded"
                  style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite 0.1s' }}
                />
                <div 
                  className="h-4 w-4/6 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded"
                  style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite 0.2s' }}
                />
              </div>
            </div>

            {/* Activity Section */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              style={{
                animation: 'fadeInUp 0.5s ease-out 0.3s forwards',
                opacity: 0,
              }}
            >
              <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                <div className="h-6 w-24 bg-gradient-to-r from-gray-200 to-gray-100 rounded-md animate-pulse" />
                <div className="h-4 w-20 bg-orange-100 rounded-md animate-pulse" />
              </div>
              <div className="p-6">
                <div className="flex gap-4 mb-4">
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>

            {/* Experience Section */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              style={{
                animation: 'fadeInUp 0.5s ease-out 0.4s forwards',
                opacity: 0,
              }}
            >
              <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                <div className="h-6 w-28 bg-gradient-to-r from-gray-200 to-gray-100 rounded-md animate-pulse" />
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
                  <div className="h-4 w-16 bg-orange-100 rounded-md animate-pulse mt-2" />
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 flex gap-4">
                    <div 
                      className="w-14 h-14 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex-shrink-0"
                      style={{ animation: 'pulseAvatar 2s ease-in-out infinite' }}
                    />
                    <div className="flex-1 space-y-2">
                      <div 
                        className="h-5 w-40 bg-gradient-to-r from-gray-200 to-gray-100 rounded"
                        style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }}
                      />
                      <div 
                        className="h-4 w-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded"
                        style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite 0.1s' }}
                      />
                      <div 
                        className="h-3 w-48 bg-gradient-to-r from-gray-100 to-gray-50 rounded"
                        style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite 0.2s' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            {/* Stats Card */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              style={{
                animation: 'fadeInUp 0.5s ease-out 0.25s forwards',
                opacity: 0,
              }}
            >
              <div className="h-5 w-28 bg-gradient-to-r from-gray-200 to-gray-100 rounded-md animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center">
                    <div 
                      className="h-8 w-12 mx-auto bg-gradient-to-br from-orange-200 to-amber-200 rounded-lg mb-2"
                      style={{ animation: 'pulseButton 1.5s ease-in-out infinite' }}
                    />
                    <div className="h-3 w-16 mx-auto bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Card */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              style={{
                animation: 'fadeInUp 0.5s ease-out 0.35s forwards',
                opacity: 0,
              }}
            >
              <div className="h-5 w-20 bg-gradient-to-r from-gray-200 to-gray-100 rounded-md animate-pulse mb-4" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i}
                    className="h-7 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full"
                    style={{ 
                      width: `${60 + i * 15}px`,
                      animation: `pulseButton 1.5s ease-in-out infinite ${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Achievements Card */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              style={{
                animation: 'fadeInUp 0.5s ease-out 0.45s forwards',
                opacity: 0,
              }}
            >
              <div className="h-5 w-28 bg-gradient-to-r from-gray-200 to-gray-100 rounded-md animate-pulse mb-4" />
              <div className="flex gap-3">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className="w-12 h-12 bg-gradient-to-br from-amber-200 to-orange-300 rounded-xl"
                    style={{ animation: `pulseAvatar 2s ease-in-out infinite ${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
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
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @keyframes shimmerCover {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @keyframes pulseAvatar {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes pulseButton {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(0.98);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * ProfileContentSkeleton - Skeleton for individual content sections
 */
export function ProfileContentSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i}
          className="h-4 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded"
          style={{
            width: `${100 - i * 15}%`,
            backgroundSize: '200% 100%',
            animation: `shimmer 1.5s ease-in-out infinite ${i * 0.1}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
