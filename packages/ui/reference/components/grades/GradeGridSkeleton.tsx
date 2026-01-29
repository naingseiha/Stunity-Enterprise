/**
 * GradeGridSkeleton - Loading skeleton for the grade grid
 * Shows a realistic preview of the grade table while data is loading
 * Optimized for perceived performance
 */

export function GradeGridSkeleton() {
  // Generate skeleton rows (show 10 rows for preview)
  const skeletonRows = Array.from({ length: 10 }, (_, i) => i);
  // Generate skeleton columns (show 12 subject columns)
  const skeletonCols = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-purple-100 to-indigo-100 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 bg-gray-300 rounded w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-gray-300 rounded w-32"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 260px)" }}>
        <table className="w-full border-collapse">
          {/* Table Header Skeleton */}
          <thead className="sticky top-0 z-20 shadow-md">
            <tr>
              {/* Row number column */}
              <th className="sticky left-0 z-30 bg-gray-100 px-3 py-3 border-b-2 border-r border-gray-300 w-12">
                <div className="h-4 bg-gray-300 rounded w-8 mx-auto"></div>
              </th>
              {/* Student name column */}
              <th className="sticky left-12 z-30 bg-gray-100 px-4 py-3 border-b-2 border-r border-gray-300 min-w-[180px]">
                <div className="h-4 bg-gray-300 rounded w-32"></div>
              </th>
              {/* Gender column */}
              <th className="sticky left-[220px] z-30 bg-gray-100 px-3 py-3 border-b-2 border-r border-gray-300 w-14">
                <div className="h-4 bg-gray-300 rounded w-10 mx-auto"></div>
              </th>

              {/* Subject columns */}
              {skeletonCols.map((col) => (
                <th
                  key={col}
                  className="px-3 py-3 bg-gray-100 border-b-2 border-r border-gray-300 min-w-[70px]"
                >
                  <div className="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
                </th>
              ))}

              {/* Summary columns */}
              <th className="px-3 py-3 bg-blue-100 border-b-2 border-r border-gray-300 min-w-[70px]">
                <div className="h-4 bg-blue-300 rounded w-12 mx-auto"></div>
              </th>
              <th className="px-3 py-3 bg-green-100 border-b-2 border-r border-gray-300 min-w-[70px]">
                <div className="h-4 bg-green-300 rounded w-12 mx-auto"></div>
              </th>
              <th className="px-3 py-3 bg-yellow-100 border-b-2 border-r border-gray-300 min-w-[65px]">
                <div className="h-4 bg-yellow-300 rounded w-10 mx-auto"></div>
              </th>
              <th className="px-3 py-3 bg-indigo-100 border-b-2 border-r border-gray-300 min-w-[70px]">
                <div className="h-4 bg-indigo-300 rounded w-12 mx-auto"></div>
              </th>
              <th className="px-3 py-3 bg-red-100 border-b-2 border-r border-gray-300 w-12">
                <div className="h-4 bg-red-300 rounded w-8 mx-auto"></div>
              </th>
              <th className="px-3 py-3 bg-orange-100 border-b-2 border-gray-300 w-12">
                <div className="h-4 bg-orange-300 rounded w-8 mx-auto"></div>
              </th>
            </tr>
          </thead>

          {/* Table Body Skeleton */}
          <tbody>
            {skeletonRows.map((row, rowIndex) => {
              const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50";

              return (
                <tr key={row}>
                  {/* Row number */}
                  <td className={`sticky left-0 z-10 ${rowBg} px-3 py-2.5 border-b border-r border-gray-200`}>
                    <div className="h-4 bg-gray-300 rounded w-6 mx-auto"></div>
                  </td>

                  {/* Student name */}
                  <td className={`sticky left-12 z-10 ${rowBg} px-4 py-2.5 border-b border-r border-gray-200`}>
                    <div className="h-4 bg-gray-300 rounded w-40"></div>
                  </td>

                  {/* Gender */}
                  <td className={`sticky left-[220px] z-10 ${rowBg} px-3 py-2.5 border-b border-r border-gray-200`}>
                    <div className="h-7 w-7 bg-gray-300 rounded-full mx-auto"></div>
                  </td>

                  {/* Subject scores */}
                  {skeletonCols.map((col) => (
                    <td
                      key={col}
                      className={`px-2 py-2 border-b border-r border-gray-200 ${rowBg}`}
                    >
                      <div className="h-8 bg-gray-200 rounded w-12 mx-auto"></div>
                    </td>
                  ))}

                  {/* Summary cells */}
                  <td className={`px-3 py-2.5 border-b border-r border-gray-200 bg-blue-50/50`}>
                    <div className="h-4 bg-blue-300 rounded w-10 mx-auto"></div>
                  </td>
                  <td className={`px-3 py-2.5 border-b border-r border-gray-200 bg-green-50/50`}>
                    <div className="h-4 bg-green-300 rounded w-10 mx-auto"></div>
                  </td>
                  <td className={`px-2 py-2.5 border-b border-r border-gray-200 bg-yellow-50/50`}>
                    <div className="h-6 bg-yellow-300 rounded w-8 mx-auto"></div>
                  </td>
                  <td className={`px-3 py-2.5 border-b border-r border-gray-200 bg-indigo-50/50`}>
                    <div className="h-4 bg-indigo-300 rounded w-8 mx-auto"></div>
                  </td>
                  <td className={`px-3 py-2.5 border-b border-r border-gray-200 bg-red-50/50`}>
                    <div className="h-4 bg-red-300 rounded w-6 mx-auto"></div>
                  </td>
                  <td className={`px-3 py-2.5 border-b border-gray-200 bg-orange-50/50`}>
                    <div className="h-4 bg-orange-300 rounded w-6 mx-auto"></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Skeleton */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-300 rounded w-48"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    </div>
  );
}
