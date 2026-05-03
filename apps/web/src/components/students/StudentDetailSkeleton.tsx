'use client';

const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent';

export default function StudentDetailSkeleton() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 px-4 pb-12 pt-8 dark:bg-gray-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
      <div className="pointer-events-none absolute -left-16 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10" />
      <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-500/10" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className={`h-10 w-36 rounded-full bg-white/80 shadow-sm ring-1 ring-slate-200/70 dark:bg-gray-900/80 dark:ring-gray-800/70 ${shimmer}`} />

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-3 rounded-[2rem] border border-slate-200/60 bg-white/85 p-8 shadow-xl shadow-slate-200/35 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/85 dark:shadow-black/20">
            <div className="flex flex-col items-center text-center">
              <div className={`h-6 w-32 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
              <div className="mt-8 flex flex-col items-center gap-6">
                <div className={`h-40 w-40 rounded-[2rem] bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                <div className="space-y-4 w-full">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`h-3 w-20 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                    <div className={`h-8 w-40 rounded-xl bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                    <div className={`h-5 w-32 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                  </div>
                  <div className="flex justify-center gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`h-8 w-16 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 shadow-xl shadow-slate-200/40 backdrop-blur-2xl xl:col-span-9">
            <div className="flex flex-col">
              <div className={`h-32 w-full p-6 ${shimmer}`} />
              <div className="h-px w-full bg-slate-100 dark:bg-gray-800/50" />
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x dark:divide-gray-800/50">
                <div className={`h-28 p-6 ${shimmer}`} />
                <div className={`h-28 p-6 ${shimmer}`} />
              </div>
              <div className="h-px w-full bg-slate-100 dark:bg-gray-800/50" />
              <div className={`h-32 w-full p-6 ${shimmer}`} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[1.2rem] border border-slate-200/70 bg-white/85 p-5 shadow-lg shadow-slate-200/25 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className={`h-3 w-24 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                  <div className={`h-9 w-20 rounded-2xl bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                  <div className={`h-4 w-28 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                </div>
                <div className={`h-11 w-11 rounded-2xl bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {Array.from({ length: 3 }).map((_, sectionIdx) => (
            <div key={sectionIdx} className="overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-xl shadow-slate-200/30 dark:border-gray-800/60 dark:bg-gray-900/80">
              <div className="border-b border-slate-200/70 px-8 py-6 dark:border-gray-800/70">
                <div className={`h-3 w-28 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                <div className={`mt-3 h-8 w-40 rounded-2xl bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
              </div>
              <div className="grid gap-4 p-8 md:grid-cols-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-24 rounded-[1.25rem] bg-slate-100 dark:bg-gray-950/60 ${shimmer}`}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Academic Aside Skeleton */}
          <div className="rounded-[2rem] border border-slate-200/60 bg-white shadow-xl shadow-slate-200/30 dark:border-gray-800/60 dark:bg-gray-900/80">
            <div className="border-b border-slate-200/70 px-8 py-6 dark:border-gray-800/70">
              <div className={`h-3 w-32 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
              <div className={`mt-3 h-8 w-44 rounded-2xl bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
            </div>
            <div className="grid gap-4 p-8 md:grid-cols-2">
              <div className={`h-28 rounded-[1.25rem] bg-slate-100 dark:bg-gray-950/60 md:col-span-2 ${shimmer}`} />
              <div className={`h-28 rounded-[1.25rem] bg-slate-100 dark:bg-gray-950/60 ${shimmer}`} />
              <div className={`h-28 rounded-[1.25rem] bg-slate-100 dark:bg-gray-950/60 ${shimmer}`} />
              <div className={`h-28 rounded-[1.25rem] bg-slate-100 dark:bg-gray-950/60 md:col-span-2 ${shimmer}`} />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.35rem] border border-slate-200/60 bg-white/85 shadow-xl shadow-slate-200/30 dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-black/20">
          <div className="border-b border-slate-200/70 px-6 py-6 dark:border-gray-800/70 sm:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className={`h-3 w-28 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                <div className={`mt-3 h-8 w-48 rounded-2xl bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                <div className={`mt-3 h-4 w-64 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
              </div>
              <div className="flex gap-2">
                <div className={`h-10 w-28 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                <div className={`h-10 w-32 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6 sm:p-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[1.15rem] border border-slate-200/70 bg-slate-50/80 p-5 dark:border-gray-800/70 dark:bg-gray-950/50"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-11 w-11 rounded-2xl bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                    <div className="space-y-2">
                      <div className={`h-4 w-44 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                      <div className={`h-3 w-28 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                    </div>
                  </div>
                  <div className={`h-10 w-40 rounded-2xl bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                  <div className={`h-24 rounded-[1rem] bg-white dark:bg-gray-900/70 ${shimmer}`} />
                  <div className="hidden items-center justify-center md:flex">
                    <div className={`h-10 w-10 rounded-full bg-slate-200 dark:bg-gray-800 ${shimmer}`} />
                  </div>
                  <div className={`h-24 rounded-[1rem] bg-white dark:bg-gray-900/70 ${shimmer}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
