export default function AdmissionsLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-slate-50 px-6 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="h-44 rounded-[1.8rem] bg-slate-200 dark:bg-gray-800" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-24 rounded-2xl bg-slate-200 dark:bg-gray-800" />)}
        </div>
        <div className="h-[480px] rounded-[1.5rem] bg-slate-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}
