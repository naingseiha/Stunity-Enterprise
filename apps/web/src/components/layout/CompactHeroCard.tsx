import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface CompactHeroCardProps {
  eyebrow: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  breadcrumbs?: ReactNode;
  chips?: ReactNode;
  actions?: ReactNode;
  chipsPosition?: 'side' | 'below';
  backgroundClassName?: string;
  glowClassName?: string;
  eyebrowClassName?: string;
  iconShellClassName?: string;
}

export default function CompactHeroCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  breadcrumbs,
  chips,
  actions,
  chipsPosition = 'side',
  backgroundClassName = 'bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_42%,#eef2ff_100%)]',
  glowClassName = 'bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_58%)]',
  eyebrowClassName = 'text-slate-500',
  iconShellClassName = 'bg-slate-950 text-white',
}: CompactHeroCardProps) {
  return (
    <div
      className={`relative h-full overflow-hidden rounded-[1.75rem] border border-white/70 dark:border-gray-800/70 p-5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] sm:p-6 ${backgroundClassName}`}
    >
      <div className={`absolute inset-y-0 right-0 w-72 ${glowClassName}`} />
      <div className="relative flex h-full flex-col">
        {breadcrumbs ? <div className="mb-4">{breadcrumbs}</div> : null}

        <div className="mt-2 flex flex-1 flex-col gap-5 md:flex-row md:items-stretch md:justify-between">
          <div className="flex max-w-3xl flex-1 flex-col">
            <div className="flex items-center gap-4">
              <div className={`rounded-[1.2rem] px-4 py-4 shadow-[0_16px_30px_rgba(15,23,42,0.16)] dark:shadow-[0_16px_30px_rgba(0,0,0,0.4)] ${iconShellClassName}`}>
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <p className={`text-[11px] font-black uppercase tracking-[0.32em] ${eyebrowClassName}`}>{eyebrow}</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-[2.2rem]">{title}</h1>
              </div>
            </div>

            {description ? (
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-gray-300">
                {description}
              </p>
            ) : null}

            {actions ? <div className="mt-auto pt-6 flex flex-wrap gap-3">{actions}</div> : null}

            {chips && chipsPosition === 'below' ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">{chips}</div>
            ) : null}
          </div>

          {chips && chipsPosition === 'side' ? <div className="flex flex-wrap items-center gap-2">{chips}</div> : null}
        </div>
      </div>
    </div>
  );
}
