"use client";

interface StudentListSkeletonProps {
  viewMode?: "table" | "grid";
  count?: number;
}

export default function StudentListSkeleton({
  viewMode = "table",
  count = 10,
}: StudentListSkeletonProps) {
  const skeletonItems = Array.from({ length: count }, (_, i) => i);

  if (viewMode === "grid") {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {skeletonItems.map((index) => (
            <div
              key={index}
              className="border-2 border-gray-200 rounded-xl p-5 animate-pulse"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-7 w-16 bg-gray-300 rounded-full"></div>
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="px-5 py-4 text-left bg-slate-50">
                <div className="h-4 bg-gray-300 rounded w-12"></div>
              </th>
              <th className="px-5 py-4 text-left bg-blue-50">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
              </th>
              <th className="px-5 py-4 text-left bg-rose-50">
                <div className="h-4 bg-gray-300 rounded w-32"></div>
              </th>
              <th className="px-5 py-4 text-left bg-purple-50">
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </th>
              <th className="px-5 py-4 text-left bg-emerald-50">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
              </th>
              <th className="px-5 py-4 text-left bg-amber-50">
                <div className="h-4 bg-gray-300 rounded w-28"></div>
              </th>
              <th className="px-5 py-4 text-center bg-cyan-50">
                <div className="h-4 bg-gray-300 rounded w-16 mx-auto"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {skeletonItems.map((index) => {
              const getColumnBg = (colIndex: number) => {
                const colors = [
                  "bg-slate-50",
                  "bg-blue-50",
                  "bg-rose-50",
                  "bg-purple-50",
                  "bg-emerald-50",
                  "bg-amber-50",
                  "bg-cyan-50",
                ];
                return colors[colIndex % colors.length];
              };

              return (
                <tr key={index} className="border-b border-gray-200 animate-pulse">
                  <td className={`px-5 py-4 ${getColumnBg(0)}`}>
                    <div className="h-4 bg-gray-300 rounded w-8"></div>
                  </td>
                  <td className={`px-5 py-4 ${getColumnBg(1)}`}>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  </td>
                  <td className={`px-5 py-4 ${getColumnBg(2)}`}>
                    <div className="h-4 bg-gray-300 rounded w-40"></div>
                  </td>
                  <td className={`px-5 py-4 ${getColumnBg(3)}`}>
                    <div className="h-6 bg-gray-300 rounded-full w-20"></div>
                  </td>
                  <td className={`px-5 py-4 ${getColumnBg(4)}`}>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  </td>
                  <td className={`px-5 py-4 ${getColumnBg(5)}`}>
                    <div className="h-4 bg-gray-300 rounded w-32"></div>
                  </td>
                  <td className={`px-5 py-4 ${getColumnBg(6)}`}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-9 w-9 bg-gray-300 rounded-lg"></div>
                      <div className="h-9 w-9 bg-gray-300 rounded-lg"></div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
