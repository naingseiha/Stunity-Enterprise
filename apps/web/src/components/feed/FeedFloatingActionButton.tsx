'use client';

import { Plus } from 'lucide-react';

interface FeedFloatingActionButtonProps {
  onPress: () => void;
  label?: string;
}

/**
 * Sky-gradient FAB matching native FloatingActionButton.
 * Positioned above the mobile bottom nav with safe-area offset.
 */
export default function FeedFloatingActionButton({
  onPress,
  label = 'Create post',
}: FeedFloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      className="feed-fab md:hidden fixed z-40 right-5 w-[58px] h-[58px] rounded-full flex items-center justify-center text-white shadow-[0_6px_20px_rgba(2,132,199,0.35)] active:scale-90 transition-transform duration-150"
      style={{
        background: 'linear-gradient(135deg, #7DD3FC 0%, #0EA5E9 50%, #0284C7 100%)',
        bottom: 'calc(var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px) + 16px)',
      }}
    >
      <Plus className="w-7 h-7" strokeWidth={2.5} />
    </button>
  );
}
