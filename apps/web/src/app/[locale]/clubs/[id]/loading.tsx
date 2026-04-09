import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';

export default function ClubDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <FeedInlineLoader size="lg" />
    </div>
  );
}
