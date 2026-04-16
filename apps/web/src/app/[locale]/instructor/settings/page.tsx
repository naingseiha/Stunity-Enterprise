'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BookOpen,
  CalendarDays,
  FolderCog,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';

function ShortcutCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: any;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-slate-800 bg-slate-800/40 p-5 transition hover:border-slate-700 hover:bg-slate-800/60"
    >
      <div className="mb-4 inline-flex rounded-2xl bg-amber-500/10 p-3 text-amber-400">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </Link>
  );
}

export default function InstructorSettingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = TokenManager.getUserData();
    setUser(userData?.user || null);
  }, []);

  const initials = useMemo(() => {
    const first = user?.firstName?.[0] || '';
    const last = user?.lastName?.[0] || '';
    return `${first}${last}`.trim() || 'I';
  }, [user]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">Instructor Hub</p>
        <h1 className="mt-3 text-3xl font-black text-white">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Your instructor workspace shortcuts, profile snapshot, and configuration entry points live here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr,1.4fr]">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-xl font-black text-white shadow-lg shadow-amber-500/20">
              {initials}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Account</p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Instructor'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{user?.email || 'No email available in token payload'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-800/30 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Role</p>
              <p className="mt-2 text-lg font-bold text-white">{user?.role || 'TEACHER'}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-800/30 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Workspace</p>
              <p className="mt-2 text-sm text-slate-300">
                This hub is optimized for course creation, curriculum edits, grading, and instructor analytics.
              </p>
            </div>
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-amber-400" />
                <div>
                  <p className="font-bold text-white">Suggested next step</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Keep course-level tools in the instructor hub, and jump into school-wide configuration from the shortcuts on the right.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-xl font-black text-white">Workspace Shortcuts</h2>
            <p className="mt-2 text-sm text-slate-400">
              Fast access to the pages instructors usually need while preparing and publishing learning content.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ShortcutCard
              href={`/${locale}/instructor/courses`}
              title="My Courses"
              description="Return to your course catalog and open curriculum management."
              icon={BookOpen}
            />
            <ShortcutCard
              href={`/${locale}/learn/create`}
              title="Create Course"
              description="Launch the full course creation flow for a new draft or published course."
              icon={FolderCog}
            />
            <ShortcutCard
              href={`/${locale}/settings/academic-years`}
              title="Academic Years"
              description="Open school-wide cycle settings, promotion tools, and yearly administration."
              icon={CalendarDays}
            />
            <ShortcutCard
              href={`/${locale}/settings/subjects`}
              title="Subject Settings"
              description="Manage curriculum subjects and supporting academic configuration."
              icon={Settings}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-800/25 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-400">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instructor preferences</h3>
                <p className="text-sm text-slate-400">
                  Profile editing still lives in the broader platform profile/settings surfaces. This page keeps the instructor hub navigation functional and centralizes the most relevant destinations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
