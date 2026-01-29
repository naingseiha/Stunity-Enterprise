"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
      style={{
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
    />
  );
};

// Add shimmer animation to global CSS or use inline
export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-12 w-24 mb-2" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
};

export const SkeletonStatsCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-10 w-10 rounded-xl bg-white/30" />
        <Skeleton className="h-5 w-5 rounded bg-white/20" />
      </div>
      <Skeleton className="h-4 w-24 mb-1 bg-white/30" />
      <Skeleton className="h-10 w-16 mb-3 bg-white/40" />
      <Skeleton className="h-3 w-32 bg-white/30" />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex gap-4 items-center">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full max-w-xs" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonChart: React.FC = () => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <div className="flex items-end justify-between gap-2 h-48">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2">
            <Skeleton className="w-full rounded-t-lg" style={{ height: `${Math.random() * 80 + 20}%` }} />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-3xl shadow-2xl p-8">
        <Skeleton className="h-10 w-64 mb-2 bg-white/30" />
        <Skeleton className="h-5 w-96 mb-6 bg-white/20" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-16 w-32 rounded-xl bg-white/20" />
          <Skeleton className="h-16 w-32 rounded-xl bg-white/20" />
          <Skeleton className="h-16 w-32 rounded-xl bg-white/20" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonStatsCard />
        <SkeletonStatsCard />
        <SkeletonStatsCard />
        <SkeletonStatsCard />
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
};

export const SkeletonForm: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
      <Skeleton className="h-8 w-48 mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  );
};

// Add shimmer animation styles
if (typeof window !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `;
  document.head.appendChild(style);
}
