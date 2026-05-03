'use client';

import React from 'react';

const TeacherDetailSkeleton = () => {
  const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent";

  return (
    <div className="mx-auto max-w-7xl animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="h-96 rounded-[2rem] bg-white dark:bg-gray-900/80 xl:col-span-3 border border-slate-200 dark:border-gray-800/60" />
        <div className="h-96 rounded-[2rem] bg-white dark:bg-gray-900/80 xl:col-span-9 border border-slate-200 dark:border-gray-800/60" />
      </div>

      {/* Metrics Skeleton */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-[1.4rem] bg-white dark:bg-gray-900/80 border border-slate-200 dark:border-gray-800/60" />
        ))}
      </div>

      {/* Dynamic Sections Skeleton */}
      <div className="mt-8 space-y-6">
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
          <div 
            key={sectionIndex}
            className="overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800/50 px-8 py-6">
              <div className="h-8 w-48 rounded-xl bg-slate-100 dark:bg-gray-800" />
              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-gray-800" />
            </div>
            <div className="grid gap-4 p-8 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, fieldIndex) => (
                <div
                  key={fieldIndex}
                  className="h-24 rounded-[1.25rem] bg-slate-50 dark:bg-gray-950/40"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherDetailSkeleton;
