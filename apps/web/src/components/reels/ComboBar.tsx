'use client';

import { Flame, Layers } from 'lucide-react';

const COMBO_FILL_TARGET = 5;

interface ComboBarProps {
  combo: number;
  dueRecallCount?: number;
}

/** Native-parity top HUD — 5-segment flame combo + due-recall chip. */
export default function ComboBar({ combo, dueRecallCount = 0 }: ComboBarProps) {
  const filled = combo % COMBO_FILL_TARGET;
  const cycles = Math.floor(combo / COMBO_FILL_TARGET);

  return (
    <div
      className="absolute top-0 left-0 right-0 z-20 px-3"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
        paddingBottom: 12,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex-1 flex items-center gap-1 min-w-0">
          {Array.from({ length: COMBO_FILL_TARGET }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full overflow-hidden bg-white/15"
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: i < filled ? '100%' : '0%',
                  background: 'linear-gradient(90deg, #FDE047, #F59E0B, #EF4444)',
                  opacity: i < filled ? 1 : 0.2,
                }}
              />
            </div>
          ))}
        </div>

        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 flex-shrink-0">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-white text-xs font-bold tabular-nums">
            {combo}
            {cycles > 0 && (
              <span className="text-white/50 font-semibold"> · {cycles}× loot</span>
            )}
          </span>
        </div>

        {dueRecallCount > 0 && (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 flex-shrink-0">
            <Layers className="w-3 h-3 text-blue-400" />
            <span className="text-blue-300 text-[11px] font-bold">{dueRecallCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
