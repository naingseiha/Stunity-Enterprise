'use client';

// Public Tools hub — the home for Stunity's AI creator tools.
// Works without an account: anonymous work is kept on-device (localStorage)
// and the user is invited to sign in to sync. Reachable from the landing page
// and from each tool's "All tools" exit.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  FileText,
  GraduationCap,
  Presentation,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { deleteDraft, listDrafts, type Draft } from './lib/drafts';

export default function ToolsHubPage() {
  const locale = useLocale();
  const isKm = locale === 'km';
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const fontKh = isKm ? "'Battambang', sans-serif" : undefined;

  useEffect(() => {
    setDrafts(listDrafts());
  }, []);

  const remove = (id: string) => {
    deleteDraft(id);
    setDrafts(listDrafts());
  };

  const t = {
    title: isKm ? 'ឧបករណ៍សម្រាប់គ្រូ' : 'Creator tools',
    sub: isKm
      ? 'បើកឧបករណ៍ណាមួយ ហើយចាប់ផ្តើមភ្លាម — មិនបាច់ Account។'
      : 'Open any tool and start instantly — no account needed.',
    login: isKm ? 'ចូល' : 'Log in',
    signup: isKm ? 'បង្កើតគណនី' : 'Sign up',
    yourWork: isKm ? 'ការងាររបស់អ្នក' : 'Your work',
    yourWorkSub: isKm
      ? 'រក្សាទុកក្នុងឧបករណ៍នេះ · ចូលដើម្បី sync គ្រប់ឧបករណ៍'
      : 'Saved on this device · sign in to sync across devices',
    empty: isKm ? 'មិនទាន់មានការងារនៅឡើយ។ បើកឧបករណ៍ខាងលើដើម្បីចាប់ផ្តើម។' : 'No saved work yet. Open a tool above to start.',
    open: isKm ? 'បើក' : 'Open',
    live: isKm ? 'ដំណើរការ' : 'Live',
    soon: isKm ? 'ឆាប់ៗ' : 'Soon',
  };

  const tools = [
    { icon: Wand2, name: isKm ? 'កិច្ចតែងការបង្រៀន' : 'Lesson Planner', desc: isKm ? 'កិច្ចតែងការ MoEYS ពេញលេញ' : 'Full MoEYS lesson plans', href: `/${locale}/tools/lesson-planner`, live: true, hue: 'from-orange-500 to-amber-600' },
    { icon: FileText, name: isKm ? 'វិញ្ញាសាប្រឡង' : 'Exam Builder', desc: isKm ? 'បង្កើតវិញ្ញាសាស្វ័យប្រវត្តិ' : 'Auto-generate exams', href: '#', live: false, hue: 'from-rose-500 to-pink-600' },
    { icon: Presentation, name: isKm ? 'ស្លាយបង្ហាញ' : 'Slides', desc: isKm ? 'ស្លាយបង្រៀនពី AI' : 'AI teaching decks', href: '#', live: false, hue: 'from-violet-500 to-indigo-600' },
    { icon: BookOpen, name: isKm ? 'សៀវភៅកិច្ចតែងការ' : 'Lesson Book', desc: isKm ? 'ចងក្រងជាសៀវភៅ' : 'Compile into a book', href: '#', live: false, hue: 'from-emerald-500 to-teal-600' },
    { icon: CreditCard, name: isKm ? 'ប័ណ្ណសិស្ស' : 'Student Cards', desc: isKm ? 'រចនាប័ណ្ណសម្គាល់' : 'Design ID cards', href: '#', live: false, hue: 'from-sky-500 to-cyan-600' },
    { icon: GraduationCap, name: isKm ? 'វិញ្ញាបនបត្រ' : 'Certificates', desc: isKm ? 'វិញ្ញាបនបត្រកិត្តិយស' : 'Award certificates', href: '#', live: false, hue: 'from-yellow-500 to-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900" style={{ fontFamily: fontKh }}>
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <img src="/Stunity.png" alt="Stunity" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}/auth/login`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              {t.login}
            </Link>
            <Link href={`/${locale}/register-school`} className="rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              {t.signup}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="flex items-center gap-2 text-indigo-600">
          <Sparkles size={16} />
          <span className="text-xs font-bold uppercase tracking-wide">Stunity Tools</span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="mt-2 text-slate-600">{t.sub}</p>

        {/* tool grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const card = (
              <div
                className={`group flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition ${
                  tool.live ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60' : 'opacity-80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.hue} text-white shadow-md`}>
                    <Icon size={24} />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tool.live ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {tool.live ? t.live : t.soon}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{tool.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{tool.desc}</p>
                {tool.live && (
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 opacity-0 transition group-hover:opacity-100">
                    {t.open} <ArrowRight size={15} />
                  </span>
                )}
              </div>
            );
            return tool.live ? <Link key={tool.name} href={tool.href}>{card}</Link> : <div key={tool.name}>{card}</div>;
          })}
        </div>

        {/* your work */}
        <div className="mt-14">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold">{t.yourWork}</h2>
              <p className="mt-1 text-sm text-slate-500">{t.yourWorkSub}</p>
            </div>
          </div>

          {drafts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
              {t.empty}
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <Wand2 size={18} />
                  </div>
                  <Link href={`/${locale}/tools/${d.tool}?draft=${d.id}`} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{d.title || (isKm ? 'គ្មានចំណងជើង' : 'Untitled')}</div>
                    <div className="truncate text-xs text-slate-400">
                      {[d.subject, d.grade].filter(Boolean).join(' · ') || d.tool}
                    </div>
                  </Link>
                  <button
                    onClick={() => remove(d.id)}
                    className="flex-none rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
