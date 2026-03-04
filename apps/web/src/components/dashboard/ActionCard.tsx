import { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  onClick?: () => void;
  href?: string;
}

export default function ActionCard({
  title,
  description,
  icon: Icon,
  iconColor,
  onClick,
  href,
}: ActionCardProps) {
  const iconStyles = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
    cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  };

  const cardContent = (
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${iconStyles[iconColor as keyof typeof iconStyles]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
    </div>
  );

  const className = "w-full bg-white dark:bg-gray-800 rounded-xl border border-slate-200/80 dark:border-gray-700 p-4 shadow-sm hover:shadow hover:border-slate-300/80 dark:hover:border-gray-600 transition-all text-left group block";

  if (href) {
    return (
      <Link href={href} prefetch={true} className={className}>
        {cardContent}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {cardContent}
    </button>
  );
}
