'use client';

// Enhanced skeleton loading components with shimmer effect

const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent';

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 space-y-4">
        <div className={`h-6 bg-gray-200 rounded w-3/4 ${shimmer}`}></div>
        <div className="space-y-3">
          <div className={`h-4 bg-gray-200 rounded w-full ${shimmer}`}></div>
          <div className={`h-4 bg-gray-200 rounded w-5/6 ${shimmer}`}></div>
          <div className={`h-4 bg-gray-200 rounded w-4/6 ${shimmer}`}></div>
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`w-10 h-10 bg-gray-200 rounded-full ${shimmer}`}></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`h-4 bg-gray-200 rounded w-24 ${shimmer}`}></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-2">
          <div className={`h-4 bg-gray-200 rounded w-32 ${shimmer}`}></div>
          <div className={`h-3 bg-gray-200 rounded w-24 ${shimmer}`}></div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`h-4 bg-gray-200 rounded w-16 ${shimmer}`}></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`h-4 bg-gray-200 rounded w-20 ${shimmer}`}></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex gap-2">
          <div className={`h-8 w-8 bg-gray-200 rounded ${shimmer}`}></div>
          <div className={`h-8 w-8 bg-gray-200 rounded ${shimmer}`}></div>
        </div>
      </td>
    </tr>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white">
      <div className={`w-12 h-12 bg-gray-200 rounded-full ${shimmer}`}></div>
      <div className="flex-1 space-y-2">
        <div className={`h-5 bg-gray-200 rounded w-48 ${shimmer}`}></div>
        <div className={`h-4 bg-gray-200 rounded w-32 ${shimmer}`}></div>
      </div>
      <div className={`h-10 w-24 bg-gray-200 rounded-lg ${shimmer}`}></div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}
