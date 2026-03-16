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
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-500/10',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 ring-1 ring-purple-500/10',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-500/10',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-500/10',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 ring-1 ring-cyan-500/10',
    red: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 ring-1 ring-rose-500/10',
  };

  const cardContent = (
    <div className="flex items-center gap-5">
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${iconStyles[iconColor as keyof typeof iconStyles]} transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-black text-slate-800 dark:text-white group-hover:text-stunity-primary-600 dark:group-hover:text-stunity-primary-400 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 font-medium">
          {description}
        </p>
      </div>
      <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-all duration-300">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  );

  const className = "w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/50 p-6 shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 dark:hover:shadow-black/60 hover:border-blue-500/20 dark:hover:border-blue-500/30 transition-all duration-500 text-left group block relative overflow-hidden";

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
