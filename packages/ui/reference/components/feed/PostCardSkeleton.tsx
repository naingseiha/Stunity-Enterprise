export default function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 mb-3 animate-pulse">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-gray-200" />
        
        <div className="flex-1">
          {/* Name */}
          <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
          {/* Meta */}
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
        
        {/* Badge */}
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>

      {/* Content */}
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>

      {/* Image placeholder (optional) */}
      <div className="h-64 bg-gray-200 rounded-xl mb-3" />

      {/* Actions */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
        <div className="h-8 bg-gray-200 rounded-full w-16" />
        <div className="h-8 bg-gray-200 rounded-full w-16" />
        <div className="h-8 bg-gray-200 rounded-full w-16" />
      </div>
    </div>
  );
}
