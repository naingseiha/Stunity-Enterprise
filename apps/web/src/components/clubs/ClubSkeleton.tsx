'use client';

import { Users, FileText, Settings } from 'lucide-react';

/**
 * ClubSkeleton - Education-themed skeleton loader for club detail pages
 * 
 * Matches the actual club layout with:
 * - Cover photo area with club type badge
 * - Club info section with name, description, stats
 * - Content tabs (Posts, Members)
 * - Member list skeleton
 * - Stunity orange/amber color scheme
 */
export default function ClubSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
      {/* Cover Photo Skeleton */}
      <div 
        className="h-48 md:h-64 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
        }}
      >
        {/* Shimmer overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmerCover 2s ease-in-out infinite',
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Back button placeholder */}
        <div className="absolute top-4 left-4 w-24 h-8 bg-white/80 backdrop-blur-sm rounded-full animate-pulse" />
        
        {/* Settings button placeholder */}
        <div className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full animate-pulse" />
        
        {/* Club type badge */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5">
          <div className="w-5 h-5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full animate-pulse" />
          <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Club Info Card */}
        <div 
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 -mt-16 relative z-10"
          style={{
            animation: 'fadeInUp 0.5s ease-out forwards',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Club icon placeholder */}
            <div 
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center flex-shrink-0"
              style={{ animation: 'pulseAvatar 2s ease-in-out infinite' }}
            >
              <Users className="w-10 h-10 text-white/50" />
            </div>
            
            <div className="flex-1 space-y-3">
              {/* Club name */}
              <div 
                className="h-8 w-64 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
              {/* Description */}
              <div 
                className="h-4 w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite 0.1s',
                }}
              />
              <div 
                className="h-4 w-3/4 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite 0.2s',
                }}
              />
              
              {/* Stats row */}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-300" />
                  <div className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-300" />
                  <div className="w-12 h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <div 
                  className="h-10 w-28 bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl"
                  style={{ animation: 'pulseButton 1.5s ease-in-out infinite' }}
                />
                <div 
                  className="h-10 w-24 bg-gray-100 border border-gray-200 rounded-xl"
                  style={{ animation: 'pulseButton 1.5s ease-in-out infinite 0.1s' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div 
          className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 my-6 w-fit"
          style={{
            animation: 'fadeInUp 0.5s ease-out 0.1s forwards',
            opacity: 0,
          }}
        >
          <div className="h-10 w-24 bg-white rounded-lg shadow-sm animate-pulse" />
          <div className="h-10 w-28 bg-gray-50 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-gray-50 rounded-lg animate-pulse" />
        </div>

        {/* Content Area */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content - Posts */}
          <div className="md:col-span-2 space-y-4">
            {/* Create Post Box */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
              style={{
                animation: 'fadeInUp 0.5s ease-out 0.2s forwards',
                opacity: 0,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full animate-pulse" />
                <div className="flex-1 h-10 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Post Skeletons */}
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                style={{
                  animation: `fadeInUp 0.5s ease-out ${0.2 + i * 0.1}s forwards`,
                  opacity: 0,
                }}
              >
                {/* Post header */}
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-12 h-12 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full"
                    style={{ animation: 'pulseAvatar 2s ease-in-out infinite' }}
                  />
                  <div className="flex-1">
                    <div 
                      className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-100 rounded mb-1"
                      style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }}
                    />
                    <div 
                      className="h-3 w-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded"
                      style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite 0.1s' }}
                    />
                  </div>
                </div>
                {/* Post content */}
                <div className="space-y-2 mb-4">
                  <div 
                    className="h-4 w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded"
                    style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }}
                  />
                  <div 
                    className="h-4 w-5/6 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded"
                    style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite 0.1s' }}
                  />
                  <div 
                    className="h-4 w-2/3 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded"
                    style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite 0.2s' }}
                  />
                </div>
                {/* Post actions */}
                <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
                  <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar - Members */}
          <div className="space-y-4">
            {/* Members Card */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              style={{
                animation: 'fadeInUp 0.5s ease-out 0.25s forwards',
                opacity: 0,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-20 bg-gradient-to-r from-gray-200 to-gray-100 rounded animate-pulse" />
                <div className="h-4 w-8 bg-amber-100 rounded animate-pulse" />
              </div>
              
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full"
                      style={{ animation: `pulseAvatar 2s ease-in-out infinite ${i * 0.1}s` }}
                    />
                    <div className="flex-1">
                      <div 
                        className="h-4 w-24 bg-gradient-to-r from-gray-200 to-gray-100 rounded mb-1"
                        style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }}
                      />
                      <div 
                        className="h-3 w-16 bg-gradient-to-r from-gray-100 to-gray-50 rounded"
                        style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite 0.1s' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="h-9 w-full bg-gray-100 rounded-xl mt-4 animate-pulse" />
            </div>

            {/* About Card */}
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              style={{
                animation: 'fadeInUp 0.5s ease-out 0.35s forwards',
                opacity: 0,
              }}
            >
              <div className="h-5 w-16 bg-gradient-to-r from-gray-200 to-gray-100 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
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
 * ClubListSkeleton - Skeleton for the clubs list page
 */
export function ClubListSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-40 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-56 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-11 w-32 bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl animate-pulse" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          <div className="h-10 w-28 bg-white rounded-lg shadow-sm animate-pulse" />
          <div className="h-10 w-28 bg-gray-50 rounded-lg animate-pulse" />
        </div>

        {/* Club Type Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div 
              key={i}
              className="h-9 bg-white border border-gray-200 rounded-full animate-pulse"
              style={{ width: `${80 + i * 10}px` }}
            />
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{
                animation: `fadeInUp 0.5s ease-out ${i * 0.05}s forwards`,
                opacity: 0,
              }}
            >
              {/* Cover */}
              <div 
                className="h-24"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
                }}
              >
                <div 
                  className="w-full h-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s ease-in-out infinite',
                  }}
                />
              </div>
              {/* Content */}
              <div className="p-4">
                <div className="h-6 w-3/4 bg-gradient-to-r from-gray-200 to-gray-100 rounded mb-2 animate-pulse" />
                <div className="h-4 w-full bg-gray-100 rounded mb-1 animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-100 rounded mb-3 animate-pulse" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-10 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-16 bg-amber-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
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
      `}</style>
    </div>
  );
}
