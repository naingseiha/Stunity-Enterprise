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
    positive: 'text-green-700 bg-green-50',
    negative: 'text-red-700 bg-red-50',
    neutral: 'text-gray-700 bg-gray-50',
  };

  const iconStyles = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
          {change && (
            <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${changeStyles[changeType]}`}>
              {changeType === 'positive' && '↑'}
              {changeType === 'negative' && '↓'}
              {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconStyles[iconColor as keyof typeof iconStyles]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
