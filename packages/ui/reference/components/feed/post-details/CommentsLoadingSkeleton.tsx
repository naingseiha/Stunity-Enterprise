"use client";

export default function CommentsLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className="animate-slide-up" 
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {/* Comment Card */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex gap-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 animate-ping" style={{ animationDuration: '2s' }} />
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                {/* Author and time */}
                <div className="flex items-center gap-2">
                  <div className="w-24 h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" />
                  <div className="w-16 h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" style={{ animationDelay: '0.1s' }} />
                </div>

                {/* Comment text */}
                <div className="space-y-2">
                  <div className="w-full h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" style={{ animationDelay: '0.2s' }} />
                  <div className="w-4/5 h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer" style={{ animationDelay: '0.3s' }} />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="w-16 h-6 bg-gradient-to-r from-red-100 to-pink-100 rounded-full animate-pulse" />
                  <div className="w-16 h-6 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <div className="w-16 h-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-shimmer {
          background-size: 2000px 100%;
          animation: shimmer 2s infinite linear;
        }

        .animate-slide-up {
          opacity: 0;
          animation: slide-up 0.4s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
