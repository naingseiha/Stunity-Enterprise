'use client';

import { useState, useEffect } from 'react';
import { getActiveAnnouncements, PlatformAnnouncement } from '@/lib/api/super-admin';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    getActiveAnnouncements()
      .then((res) => res?.data && setAnnouncements(res.data))
      .catch(() => {});
  }, []);

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const priorityStyles: Record<string, string> = {
    URGENT: 'bg-red-50 border-red-200 text-red-800',
    WARNING: 'bg-amber-50 border-amber-200 text-amber-800',
    INFO: 'bg-stunity-primary-50 border-stunity-primary-200 text-stunity-primary-800',
  };

  const priorityIcons: Record<string, typeof Info> = {
    URGENT: AlertCircle,
    WARNING: AlertTriangle,
    INFO: Info,
  };

  return (
    <div className="space-y-2 px-4 py-2 bg-gray-50/50 border-b border-gray-200">
      {visible.map((a) => {
        const Icon = priorityIcons[a.priority] || Info;
        const style = priorityStyles[a.priority] || priorityStyles.INFO;
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${style}`}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{a.title}</p>
              <p className="text-sm mt-1 opacity-90">{a.content}</p>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
              className="p-1 rounded hover:bg-black/10 shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
