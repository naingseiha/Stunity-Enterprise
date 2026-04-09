import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';

export default function LearnLessonLoading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <FeedInlineLoader size="lg" />
    </div>
  );
}
