export default function CourseSubmissionsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4 animate-pulse">
        <div className="h-32 rounded-2xl bg-white border border-gray-200" />
        <div className="h-24 rounded-2xl bg-white border border-gray-200" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 rounded-2xl bg-white border border-gray-200" />
          <div className="h-24 rounded-2xl bg-white border border-gray-200" />
          <div className="h-24 rounded-2xl bg-white border border-gray-200" />
          <div className="h-24 rounded-2xl bg-white border border-gray-200" />
        </div>
        <div className="h-96 rounded-2xl bg-white border border-gray-200" />
      </div>
    </div>
  );
}
