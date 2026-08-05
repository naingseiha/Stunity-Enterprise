export default function PostDetailLoading() {
  return (
    <div className="min-h-screen bg-[#F3F2EF] dark:bg-gray-950">
      <div className="sticky top-0 z-20 h-14 border-b border-black/5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md" />
      <main className="max-w-[680px] mx-auto px-3 sm:px-4 py-4 space-y-3">
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-black/5 dark:border-white/5 overflow-hidden animate-pulse">
          <div className="p-4 flex gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3.5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-800/80" />
            </div>
          </div>
          <div className="px-4 pb-4 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3.5 w-full rounded bg-gray-100 dark:bg-gray-800/80" />
            <div className="h-3.5 w-5/6 rounded bg-gray-100 dark:bg-gray-800/80" />
          </div>
          <div className="h-56 bg-gray-100 dark:bg-gray-800/60" />
          <div className="px-4 py-3 border-t border-black/5 dark:border-white/5 flex gap-6">
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-14 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-black/5 dark:border-white/5 p-4 space-y-4 animate-pulse">
          <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-800" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="flex-1 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
