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
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    red: 'bg-red-100 text-red-600',
  };

  const cardContent = (
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${iconStyles[iconColor as keyof typeof iconStyles]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
    </div>
  );

  const className = "w-full bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:scale-[1.01] transition-all text-left group block";

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
