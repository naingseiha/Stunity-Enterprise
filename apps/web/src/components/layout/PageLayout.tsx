'use client';

import { ReactNode } from 'react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';

interface PageLayoutProps {
  children: ReactNode;
  user?: any;
  school?: any;
  onLogout?: () => void;
}

/**
 * PageLayout Component
 * 
 * Standard page layout for all app pages with:
 * - Unified navigation (sidebar + top bar)
 * - Proper margin for sidebar
 * - Consistent background color
 * - Smooth content animations
 */
export default function PageLayout({
  children,
  user,
  school,
  onLogout,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900/50">
      <UnifiedNavigation user={user} school={school} onLogout={onLogout} />
      <div className="lg:ml-64 min-h-screen bg-slate-50 dark:bg-gray-900/50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            {children}
          </AnimatedContent>
        </main>
      </div>
    </div>
  );
}

/**
 * PageHeader Component
 * 
 * Consistent page header with title, subtitle, and optional action button
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  breadcrumb?: ReactNode;
}

export function PageHeader({ title, subtitle, icon, action, breadcrumb }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumb && (
        <div className="mb-4">
          {breadcrumb}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-slate-200/80 dark:border-gray-700 shadow-sm [&>svg]:text-stunity-primary-600 dark:[&>svg]:text-stunity-primary-400">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-slate-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

/**
 * PageCard Component
 * 
 * Standard card container for page content
 */
interface PageCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageCard({ children, className = '', noPadding = false }: PageCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200/80 dark:border-gray-700 ${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
}

/**
 * PageSection Component
 * 
 * Section wrapper with optional title
 */
interface PageSectionProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function PageSection({ children, title, className = '' }: PageSectionProps) {
  return (
    <AnimatedContent animation="slide-up" delay={100}>
      <div className={className}>
        {title && (
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{title}</h2>
        )}
        {children}
      </div>
    </AnimatedContent>
  );
}
