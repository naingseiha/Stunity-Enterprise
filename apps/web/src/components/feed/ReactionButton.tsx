'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { REACTIONS, REACTION_BY_TYPE, isReactionType, type ReactionType } from '@/lib/feed-reactions';

interface ReactionButtonProps {
  myReaction?: string | null;
  count?: number;
  onReact: (type: ReactionType) => void;
  /** Compact row style (icon + optional count) vs labeled detail action */
  variant?: 'compact' | 'labeled';
  className?: string;
  disabled?: boolean;
}

export default function ReactionButton({
  myReaction,
  count = 0,
  onReact,
  variant = 'labeled',
  className = '',
  disabled = false,
}: ReactionButtonProps) {
  const tFeed = useTranslations('feed');
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = isReactionType(myReaction) ? REACTION_BY_TYPE[myReaction] : null;
  const ActiveIcon = active?.icon ?? REACTIONS[0].icon;
  const activeColor = active?.color ?? undefined;
  const label = active ? tFeed(active.labelKey) : tFeed('postDetail.like');

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const clearHoverTimers = () => {
    if (hoverOpenTimer.current) {
      clearTimeout(hoverOpenTimer.current);
      hoverOpenTimer.current = null;
    }
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  useEffect(() => () => {
    clearLongPress();
    clearHoverTimers();
  }, []);

  const pick = (type: ReactionType) => {
    setOpen(false);
    setBurst(true);
    window.setTimeout(() => setBurst(false), 420);
    onReact(type);
  };

  const tap = () => {
    if (disabled) return;
    onReact((isReactionType(myReaction) ? myReaction : 'LIKE') as ReactionType);
    if (!myReaction) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 420);
    }
  };

  const onRootEnter = () => {
    if (disabled) return;
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
    // Desktop: brief hover opens picker (Facebook-style)
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hoverOpenTimer.current = setTimeout(() => setOpen(true), 420);
    }
  };

  const onRootLeave = () => {
    clearLongPress();
    if (hoverOpenTimer.current) {
      clearTimeout(hoverOpenTimer.current);
      hoverOpenTimer.current = null;
    }
    hoverCloseTimer.current = setTimeout(() => setOpen(false), 180);
  };

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onMouseEnter={onRootEnter}
      onMouseLeave={onRootLeave}
    >
      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 flex items-center gap-0.5 rounded-full bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 shadow-xl px-2 py-1.5"
          role="menu"
        >
          {REACTIONS.map((r) => {
            const Icon = r.icon;
            const selected = myReaction === r.type;
            return (
              <button
                key={r.type}
                type="button"
                role="menuitem"
                title={tFeed(r.labelKey)}
                onClick={() => pick(r.type)}
                className={`p-2 rounded-full transition-transform duration-150 hover:scale-125 ${
                  selected ? 'bg-black/5 dark:bg-white/10 scale-110' : ''
                }`}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: r.color }}
                  fill={selected && r.type === 'LIKE' ? r.color : 'none'}
                />
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={tap}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!disabled) setOpen(true);
        }}
        onMouseDown={() => {
          clearLongPress();
          longPressTimer.current = setTimeout(() => {
            if (!disabled) setOpen(true);
          }, 380);
        }}
        onMouseUp={clearLongPress}
        onTouchStart={() => {
          clearLongPress();
          longPressTimer.current = setTimeout(() => {
            if (!disabled) setOpen(true);
          }, 380);
        }}
        onTouchEnd={clearLongPress}
        className={`relative flex items-center justify-center gap-1.5 rounded-lg transition-all duration-200 hover:bg-black/[0.04] dark:hover:bg-white/5 disabled:opacity-50 ${
          variant === 'labeled'
            ? 'w-full flex-col sm:flex-row py-2.5 text-[11px] sm:text-xs font-semibold'
            : 'flex-1 py-2 text-xs font-medium'
        } ${active ? '' : 'text-gray-600 dark:text-gray-300'}`}
        style={activeColor ? { color: activeColor } : undefined}
        aria-label={label}
        aria-expanded={open}
      >
        <ActiveIcon
          className={`${variant === 'labeled' ? 'w-[18px] h-[18px]' : 'w-4 h-4'} transition-transform duration-200 ${
            burst || active ? 'scale-110' : ''
          }`}
          fill={
            active?.type === 'LIKE' || active?.type === 'CELEBRATE'
              ? activeColor || 'currentColor'
              : 'none'
          }
        />
        {variant === 'labeled' ? (
          <span className="truncate max-w-[72px]">{label}</span>
        ) : count > 0 ? (
          <span>{count}</span>
        ) : null}
      </button>
    </div>
  );
}
