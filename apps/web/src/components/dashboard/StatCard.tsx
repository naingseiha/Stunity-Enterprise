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
  const changeStyles = {
    positive: 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/30',
    negative: 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
    neutral: 'text-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800',
  };

  const iconStyles = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200/80 dark:border-gray-700 p-6 shadow-sm hover:shadow-md hover:border-slate-300/80 dark:hover:border-gray-600 transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 truncate" title={subtitle}>{subtitle}</p>
          )}
          {change && (
            <div className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${changeStyles[changeType]}`}>
              {changeType === 'positive' && '↑'}
              {changeType === 'negative' && '↓'}
              {change}
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 p-3 rounded-xl ${iconStyles[iconColor as keyof typeof iconStyles]}`}>
          <Icon className="w-6 h-6" aria-hidden />
        </div>
      </div>
    </div>
  );
}
