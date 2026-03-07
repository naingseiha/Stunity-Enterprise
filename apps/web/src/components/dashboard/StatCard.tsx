import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor: string;
  subtitle?: string;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor,
  subtitle,
}: StatCardProps) {
  const themes = {
    blue: 'from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-blue-200/50 dark:shadow-blue-900/20',
    purple: 'from-fuchsia-500 to-purple-600 dark:from-fuchsia-600 dark:to-purple-700 shadow-purple-200/50 dark:shadow-purple-900/20',
    green: 'from-emerald-400 to-teal-500 dark:from-emerald-500 dark:to-teal-600 shadow-emerald-200/50 dark:shadow-emerald-900/20',
    amber: 'from-orange-400 to-amber-500 dark:from-orange-500 dark:to-amber-600 shadow-amber-200/50 dark:shadow-amber-900/20',
  };

  const changeStyles = {
    positive: 'bg-white/20 text-white ring-1 ring-white/30',
    negative: 'bg-white/20 text-white ring-1 ring-white/30',
    neutral: 'bg-white/20 text-white ring-1 ring-white/30',
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl p-6 text-white bg-gradient-to-br ${themes[iconColor as keyof typeof themes]} shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1`}>
      {/* Decorative Sparkline SVG */}
      <div className="absolute bottom-0 right-0 left-0 h-24 opacity-20 transition-opacity group-hover:opacity-30">
        <svg viewBox="0 0 100 40" className="h-full w-full preserve-3d" preserveAspectRatio="none">
          <path
            d="M0 35 Q 15 32, 25 35 T 45 30 T 65 35 T 85 25 T 100 30 V 40 H 0 Z"
            fill="currentColor"
            className="text-white/40"
          />
          <path
            d="M0 35 Q 15 32, 25 35 T 45 30 T 65 35 T 85 25 T 100 30"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-white/60"
          />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/30">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white transition-colors" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white transition-colors delay-75" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white transition-colors delay-150" />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-4xl font-black tracking-tight tabular-nums">{value}</p>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-white/90 uppercase tracking-widest">{title}</p>
            {change && (
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-black ${changeStyles[changeType]}`}>
                {changeType === 'positive' && '+'}
                {change}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
    </div>
  );
}
