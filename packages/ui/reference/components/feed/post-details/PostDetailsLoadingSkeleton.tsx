"use client";

import { Loader2 } from "lucide-react";

export default function PostDetailsLoadingSkeleton() {
  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50 animate-fade-in">
      {/* Animated Header Skeleton */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full animate-pulse" />
          <div className="w-40 h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Scrollable Content with beautiful animations */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {/* Author Section Skeleton */}
          <div className="bg-white rounded-3xl shadow-lg p-6 animate-slide-up">
            <div className="flex items-center gap-4">
              {/* Animated Avatar with gradient */}
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded-full animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 animate-ping" style={{ animationDuration: '2s' }} />
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="w-48 h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" />
                <div className="w-32 h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" style={{ animationDelay: '0.1s' }} />
              </div>
              
              <div className="w-28 h-11 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Post Content Skeleton with staggered animations */}
          <div className="bg-white rounded-3xl shadow-lg p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {/* Title */}
            <div className="w-3/4 h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl mb-6 animate-shimmer" />
            
            {/* Content lines */}
            <div className="space-y-3 mb-6">
              <div className="w-full h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" style={{ animationDelay: '0.2s' }} />
              <div className="w-full h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" style={{ animationDelay: '0.3s' }} />
              <div className="w-4/5 h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" style={{ animationDelay: '0.4s' }} />
            </div>

            {/* Image placeholder with gradient */}
            <div className="relative w-full h-80 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-slow" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
              </div>
            </div>
          </div>

          {/* Engagement Bar Skeleton */}
          <div className="bg-white rounded-3xl shadow-lg p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-4">
              <div className="w-28 h-12 bg-gradient-to-r from-red-100 to-pink-100 rounded-xl animate-pulse" />
              <div className="w-28 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl animate-pulse" style={{ animationDelay: '0.1s' }} />
              <div className="w-28 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl animate-pulse" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>

          {/* Comments Section Skeleton */}
          <div className="bg-white rounded-3xl shadow-lg p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="w-40 h-7 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full mb-6 animate-shimmer" />
            
            {/* Comment items */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 mb-6 animate-fade-in" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="w-32 h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" />
                  <div className="w-full h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" />
                  <div className="w-3/4 h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" />
                </div>
              </div>
            ))}
          </div>

          {/* Loading indicator at bottom */}
          <div className="text-center py-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 rounded-full">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="text-sm font-medium text-indigo-900 animate-pulse">Loading post details...</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes shimmer-slow {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-shimmer {
          background-size: 2000px 100%;
          animation: shimmer 2s infinite linear;
        }

        .animate-shimmer-slow {
          animation: shimmer-slow 2s infinite linear;
        }

        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
