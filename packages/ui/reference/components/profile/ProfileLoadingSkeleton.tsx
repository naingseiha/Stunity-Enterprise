"use client";

import { motion } from "framer-motion";

export default function ProfileLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Cover Photo Skeleton */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-48 md:h-64 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 -mt-16 pb-8">
        {/* Profile Header Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar Skeleton */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 border-4 border-white shadow-lg relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </motion.div>
              {/* Ping effect */}
              <span className="absolute top-0 right-0 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500"></span>
              </span>
            </div>

            {/* Name and Bio Skeleton */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                {/* Name */}
                <div className="h-8 w-48 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                </div>
                {/* Headline */}
                <div className="h-5 w-64 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 rounded relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                </div>
              </div>

              {/* Bio lines */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
                </div>
                <div className="h-4 w-5/6 bg-gray-200 rounded relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
                </div>
                <div className="h-4 w-4/6 bg-gray-200 rounded relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Skeleton */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="text-center space-y-2">
                <div className="h-8 w-16 mx-auto bg-gradient-to-r from-indigo-200 to-purple-200 rounded-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                </div>
                <div className="h-3 w-20 mx-auto bg-gray-200 rounded relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Stats Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 shadow-md border-2 border-gray-100 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50 to-transparent animate-shimmer" />
              <div className="flex items-center gap-3 relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-12 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Content Sections Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Tabs Skeleton */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex gap-2 overflow-x-auto">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 w-28 bg-gray-200 rounded-lg relative overflow-hidden flex-shrink-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
                </div>
              ))}
            </div>
          </div>

          {/* Content Cards */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.1 }}
              className="bg-white rounded-2xl shadow-md p-6 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50 to-transparent animate-shimmer" />
              <div className="relative space-y-4">
                {/* Title */}
                <div className="h-6 w-40 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-lg" />
                {/* Content lines */}
                <div className="space-y-3">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-5/6 bg-gray-200 rounded" />
                  <div className="h-4 w-4/6 bg-gray-200 rounded" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Inline styles for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
