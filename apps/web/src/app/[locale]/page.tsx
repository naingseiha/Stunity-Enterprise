'use client';

// Stunity landing — product-led, tool-first SaaS home.
// One account, three surfaces: Social feed · School management (when linked to
// a school) · AI creator Tools (Lesson Planner, Slides, Exam …) that anyone can
// open and try before signing up.
//
// Copy is bilingual via a locale-keyed dictionary so it can be iterated quickly;
// migrate into next-intl messages once the wording settles.

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  GraduationCap,
  CreditCard,
  LayoutGrid,
  Menu,
  MessagesSquare,
  Presentation,
  School,
  Sparkles,
  Users,
  Wand2,
  X,
} from 'lucide-react';

type Lang = 'en' | 'km';

const T = {
  en: {
    nav: { tools: 'Tools', social: 'Social', schools: 'For Schools', pricing: 'Pricing' },
    login: 'Log in',
    getStarted: 'Get started free',
    heroBadge: 'One account · Social · School · AI tools',
    heroTitle: 'Teach, connect, and create —\nall in one place',
    heroSub:
      'Stunity blends a social learning network, full school management, and AI creator tools. Open any tool and start working now — create an account only when you want to save.',
    heroCtaTools: 'Try tools free',
    heroCtaToolsHint: 'No signup needed',
    heroCtaSchool: 'Register your school',
    toolsTitle: 'Powerful tools — use them instantly',
    toolsSub: 'No account required to start. Sign in later to save, share, and sync.',
    live: 'Live',
    soon: 'Soon',
    open: 'Open tool',
    pillarsTitle: 'One account, everything connected',
    pillarsSub:
      'The same login powers your social profile, your school workspace, and your personal creator tools.',
    pillarSocialT: 'Social learning',
    pillarSocialD: 'A feed built for learning — posts, polls, quizzes, clubs, and reels that keep students engaged.',
    pillarSchoolT: 'School management',
    pillarSchoolD:
      'Link to a school to unlock grades, attendance, timetables, classes, and reports — tenant-isolated and MoEYS-ready.',
    pillarToolsT: 'AI creator tools',
    pillarToolsD: 'Generate lesson plans, exams, and slides in minutes — yours to keep, no school required.',
    howTitle: 'Start in seconds',
    how1T: 'Open a tool',
    how1D: 'Jump straight into the Lesson Planner or any tool — no barrier.',
    how2T: 'Create your work',
    how2D: 'Build a MoEYS lesson plan, exam, or slide deck with AI assistance.',
    how3T: 'Save when ready',
    how3D: 'Sign up to keep your work, join the social feed, or connect a school.',
    pricingTitle: 'Simple pricing',
    pricingSub: 'Tools are free to try. Pay only when your school scales.',
    perMonth: '/mo',
    free: 'Free',
    plans: [
      { name: 'Creator', price: 'Free', feats: ['All AI tools', 'Social feed', 'Personal library'], cta: 'Start free', highlight: false },
      { name: 'School Basic', price: '$29', feats: ['Up to 200 students', 'Grades & attendance', 'Timetables'], cta: 'Start trial', highlight: true },
      { name: 'School Pro', price: '$79', feats: ['Unlimited students', 'Analytics & reports', 'Priority support'], cta: 'Start trial', highlight: false },
      { name: 'Enterprise', price: 'Custom', feats: ['Multi-campus', 'SSO & SLA', 'Dedicated success'], cta: 'Contact us', highlight: false },
    ],
    ctaTitle: 'Ready to build your first lesson?',
    ctaSub: 'Open the Lesson Planner — it’s free and takes seconds.',
    footerTagline: 'Social learning · School management · AI tools',
  },
  km: {
    nav: { tools: 'ឧបករណ៍', social: 'សង្គម', schools: 'សម្រាប់សាលា', pricing: 'តម្លៃ' },
    login: 'ចូល',
    getStarted: 'ចាប់ផ្តើមឥតគិតថ្លៃ',
    heroBadge: 'Account តែមួយ · សង្គម · សាលា · ឧបករណ៍ AI',
    heroTitle: 'បង្រៀន ភ្ជាប់ និងបង្កើត —\nក្នុងកន្លែងតែមួយ',
    heroSub:
      'Stunity រួមបញ្ចូលបណ្តាញសិក្សាសង្គម ប្រព័ន្ធគ្រប់គ្រងសាលា និងឧបករណ៍ AI។ បើកឧបករណ៍ណាមួយ ហើយចាប់ផ្តើមធ្វើការភ្លាម — បង្កើត Account តែពេលអ្នកចង់រក្សាទុក។',
    heroCtaTools: 'សាកល្បងឧបករណ៍ឥតគិតថ្លៃ',
    heroCtaToolsHint: 'មិនបាច់ចុះឈ្មោះ',
    heroCtaSchool: 'ចុះឈ្មោះសាលា',
    toolsTitle: 'ឧបករណ៍ដ៏មានឥទ្ធិពល — ប្រើបានភ្លាមៗ',
    toolsSub: 'មិនបាច់ Account ដើម្បីចាប់ផ្តើម។ ចូលពេលក្រោយដើម្បីរក្សាទុក ចែករំលែក និង sync។',
    live: 'ដំណើរការ',
    soon: 'ឆាប់ៗ',
    open: 'បើកឧបករណ៍',
    pillarsTitle: 'Account តែមួយ ភ្ជាប់អ្វីៗទាំងអស់',
    pillarsSub: 'Login តែមួយ ប្រើបានទាំង profile សង្គម កន្លែងធ្វើការសាលា និងឧបករណ៍ផ្ទាល់ខ្លួន។',
    pillarSocialT: 'សិក្សាសង្គម',
    pillarSocialD: 'Feed សម្រាប់ការសិក្សា — ប្រកាស ការបោះឆ្នោត quiz ក្លឹប និង reels ដែលទាក់ទាញសិស្ស។',
    pillarSchoolT: 'គ្រប់គ្រងសាលា',
    pillarSchoolD:
      'ភ្ជាប់ជាមួយសាលា ដើម្បីបើកពិន្ទុ វត្តមាន កាលវិភាគ ថ្នាក់ និងរបាយការណ៍ — ដាច់ដោយឡែក និងតាមស្តង់ដារ MoEYS។',
    pillarToolsT: 'ឧបករណ៍ AI',
    pillarToolsD: 'បង្កើតកិច្ចតែងការ វិញ្ញាសា និងស្លាយក្នុងរយៈពេលប៉ុន្មាននាទី — ជារបស់អ្នក មិនបាច់សាលា។',
    howTitle: 'ចាប់ផ្តើមក្នុងរយៈពេលប៉ុន្មានវិនាទី',
    how1T: 'បើកឧបករណ៍',
    how1D: 'ចូលទៅ Lesson Planner ឬឧបករណ៍ណាមួយផ្ទាល់ — គ្មានឧបសគ្គ។',
    how2T: 'បង្កើតការងារ',
    how2D: 'បង្កើតកិច្ចតែងការ MoEYS វិញ្ញាសា ឬស្លាយ ដោយមាន AI ជំនួយ។',
    how3T: 'រក្សាទុកពេលរួចរាល់',
    how3D: 'ចុះឈ្មោះដើម្បីរក្សាការងារ ចូលរួម feed សង្គម ឬភ្ជាប់សាលា។',
    pricingTitle: 'តម្លៃសាមញ្ញ',
    pricingSub: 'ឧបករណ៍សាកល្បងឥតគិតថ្លៃ។ បង់ប្រាក់តែពេលសាលាអ្នករីកធំ។',
    perMonth: '/ខែ',
    free: 'ឥតគិតថ្លៃ',
    plans: [
      { name: 'អ្នកបង្កើត', price: 'ឥតគិតថ្លៃ', feats: ['ឧបករណ៍ AI ទាំងអស់', 'Feed សង្គម', 'បណ្ណាល័យផ្ទាល់ខ្លួន'], cta: 'ចាប់ផ្តើម', highlight: false },
      { name: 'សាលា មូលដ្ឋាន', price: '$29', feats: ['សិស្សរហូត ២០០', 'ពិន្ទុ និងវត្តមាន', 'កាលវិភាគ'], cta: 'សាកល្បង', highlight: true },
      { name: 'សាលា Pro', price: '$79', feats: ['សិស្សគ្មានកំណត់', 'វិភាគ និងរបាយការណ៍', 'ជំនួយអាទិភាព'], cta: 'សាកល្បង', highlight: false },
      { name: 'សហគ្រាស', price: 'តាមតម្រូវ', feats: ['ច្រើនសាខា', 'SSO & SLA', 'ក្រុមជំនួយដាច់ដោយឡែក'], cta: 'ទាក់ទងយើង', highlight: false },
    ],
    ctaTitle: 'ត្រៀមបង្កើតកិច្ចតែងការដំបូងហើយឬនៅ?',
    ctaSub: 'បើក Lesson Planner — ឥតគិតថ្លៃ ហើយចំណាយពេលប៉ុន្មានវិនាទី។',
    footerTagline: 'សិក្សាសង្គម · គ្រប់គ្រងសាលា · ឧបករណ៍ AI',
  },
} satisfies Record<Lang, unknown>;

export default function HomePage() {
  const locale = useLocale();
  const lang: Lang = locale === 'km' ? 'km' : 'en';
  const c = T[lang];
  const [menuOpen, setMenuOpen] = useState(false);
  const isKm = lang === 'km';
  const fontKh = isKm ? "'Battambang', sans-serif" : undefined;

  const tools = [
    { icon: Wand2, name: isKm ? 'កិច្ចតែងការបង្រៀន' : 'Lesson Planner', desc: isKm ? 'កិច្ចតែងការ MoEYS ពេញលេញ' : 'Full MoEYS lesson plans', href: `/${locale}/tools/lesson-planner`, live: true, hue: 'from-orange-500 to-amber-600' },
    { icon: FileText, name: isKm ? 'វិញ្ញាសាប្រឡង' : 'Exam Builder', desc: isKm ? 'បង្កើតវិញ្ញាសាស្វ័យប្រវត្តិ' : 'Auto-generate exams', href: `/${locale}/tools/exam`, live: true, hue: 'from-rose-500 to-pink-600' },
    { icon: Presentation, name: isKm ? 'ស្លាយបង្ហាញ' : 'Slides', desc: isKm ? 'ស្លាយបង្រៀនពី AI' : 'AI teaching decks', href: '#', live: false, hue: 'from-violet-500 to-indigo-600' },
    { icon: BookOpen, name: isKm ? 'សៀវភៅកិច្ចតែងការ' : 'Lesson Book', desc: isKm ? 'ចងក្រងជាសៀវភៅ' : 'Compile into a book', href: '#', live: false, hue: 'from-emerald-500 to-teal-600' },
    { icon: CreditCard, name: isKm ? 'ប័ណ្ណសិស្ស' : 'Student Cards', desc: isKm ? 'រចនាប័ណ្ណសម្គាល់' : 'Design ID cards', href: '#', live: false, hue: 'from-sky-500 to-cyan-600' },
    { icon: GraduationCap, name: isKm ? 'វិញ្ញាបនបត្រ' : 'Certificates', desc: isKm ? 'វិញ្ញាបនបត្រកិត្តិយស' : 'Award certificates', href: '#', live: false, hue: 'from-yellow-500 to-orange-500' },
  ];

  const pillars = [
    { icon: MessagesSquare, t: c.pillarSocialT, d: c.pillarSocialD, tint: 'bg-cyan-50 text-cyan-600' },
    { icon: School, t: c.pillarSchoolT, d: c.pillarSchoolD, tint: 'bg-indigo-50 text-indigo-600' },
    { icon: Sparkles, t: c.pillarToolsT, d: c.pillarToolsD, tint: 'bg-orange-50 text-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: fontKh }}>
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <img src="/Stunity.png" alt="Stunity" className="h-8 w-auto" />
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <a href="#tools" className="text-sm font-medium text-slate-600 hover:text-slate-900">{c.nav.tools}</a>
            <a href="#pillars" className="text-sm font-medium text-slate-600 hover:text-slate-900">{c.nav.social}</a>
            <a href="#pillars" className="text-sm font-medium text-slate-600 hover:text-slate-900">{c.nav.schools}</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">{c.nav.pricing}</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href={`/${locale}/auth/login`} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 sm:block">
              {c.login}
            </Link>
            <Link
              href={`/${locale}/register-school`}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              {c.getStarted}
            </Link>
            <button onClick={() => setMenuOpen((v) => !v)} className="rounded-lg p-2 text-slate-600 md:hidden" aria-label="Menu">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-100 px-4 py-3 md:hidden">
            {[c.nav.tools, c.nav.social, c.nav.pricing].map((l, i) => (
              <a key={i} href={['#tools', '#pillars', '#pricing'][i]} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">
                {l}
              </a>
            ))}
            <Link href={`/${locale}/auth/login`} className="block py-2 text-sm font-medium text-slate-700">{c.login}</Link>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/50 via-cyan-100/40 to-transparent blur-3xl" />
          <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-orange-100/50 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm">
              <Sparkles size={14} /> {c.heroBadge}
            </span>
            <h1 className="mt-5 whitespace-pre-line text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {c.heroTitle}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">{c.heroSub}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/${locale}/tools/lesson-planner`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:opacity-95"
              >
                <Wand2 size={19} /> {c.heroCtaTools}
              </Link>
              <Link
                href={`/${locale}/register-school`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <School size={19} /> {c.heroCtaSchool}
              </Link>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <Check size={14} className="text-emerald-500" /> {c.heroCtaToolsHint}
            </p>
          </div>

          {/* product mockup */}
          <div className="relative">
            <HeroMockup isKm={isKm} />
          </div>
        </div>
      </section>

      {/* ── Tools ── */}
      <section id="tools" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{c.toolsTitle}</h2>
          <p className="mt-3 text-slate-600">{c.toolsSub}</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const Card = (
              <div
                className={`group relative flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition ${
                  tool.live ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60' : 'opacity-80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.hue} text-white shadow-md`}>
                    <Icon size={24} />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tool.live ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {tool.live ? c.live : c.soon}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{tool.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{tool.desc}</p>
                {tool.live && (
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 opacity-0 transition group-hover:opacity-100">
                    {c.open} <ArrowRight size={15} />
                  </span>
                )}
              </div>
            );
            return tool.live ? (
              <Link key={tool.name} href={tool.href}>{Card}</Link>
            ) : (
              <div key={tool.name}>{Card}</div>
            );
          })}
        </div>
      </section>

      {/* ── Pillars ── */}
      <section id="pillars" className="border-y border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{c.pillarsTitle}</h2>
            <p className="mt-3 text-slate-600">{c.pillarsSub}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.t} className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${p.tint}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-xl font-bold">{p.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.d}</p>
                </div>
              );
            })}
          </div>

          {/* how it works */}
          <div className="mt-16">
            <h3 className="text-center text-2xl font-bold">{c.howTitle}</h3>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {[
                { n: 1, t: c.how1T, d: c.how1D, icon: LayoutGrid },
                { n: 2, t: c.how2T, d: c.how2D, icon: Wand2 },
                { n: 3, t: c.how3T, d: c.how3D, icon: Users },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.n} className="relative text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25">
                      <Icon size={26} />
                    </div>
                    <div className="mt-2 text-xs font-bold text-indigo-500">{String(s.n).padStart(2, '0')}</div>
                    <h4 className="mt-1 text-lg font-bold">{s.t}</h4>
                    <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-600">{s.d}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{c.pricingTitle}</h2>
          <p className="mt-3 text-slate-600">{c.pricingSub}</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {c.plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                p.highlight ? 'border-indigo-500 bg-white shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500' : 'border-slate-100 bg-white shadow-sm'
              }`}
            >
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">{p.price}</span>
                {p.price.startsWith('$') && <span className="text-sm text-slate-400">{c.perMonth}</span>}
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check size={16} className="mt-0.5 flex-none text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/register-school`}
                className={`mt-6 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${
                  p.highlight ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-cyan-500 px-8 py-14 text-center shadow-2xl shadow-indigo-500/30">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <h2 className="text-3xl font-bold text-white sm:text-4xl">{c.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">{c.ctaSub}</p>
          <Link
            href={`/${locale}/tools/lesson-planner`}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
          >
            <Wand2 size={19} /> {c.heroCtaTools}
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/Stunity.png" alt="Stunity" className="h-7 w-auto" />
            <span className="text-sm text-slate-400">· {c.footerTagline}</span>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Stunity</p>
        </div>
      </footer>
    </div>
  );
}

// ── Hero product mockup (mini MoEYS lesson plan) ──────────────────────
function HeroMockup({ isKm }: { isKm: boolean }) {
  return (
    <div className="relative mx-auto max-w-md">
      <div className="absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/50">
        {/* window bar */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[11px] font-medium text-slate-400">{isKm ? 'កិច្ចតែងការ · Lesson Planner' : 'Lesson Planner'}</span>
        </div>
        {/* paper */}
        <div className="bg-white p-6" style={{ fontFamily: "'Battambang', sans-serif" }}>
          <div className="border-b-2 border-slate-800 pb-3 text-center">
            <div className="text-[10px] text-slate-500">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div className="text-[10px] text-slate-500">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
            <div className="mx-auto mt-2 h-0.5 w-8 rounded bg-orange-500" />
            <div className="mt-2 text-base font-bold text-slate-800" style={{ fontFamily: "'Koulen', sans-serif" }}>
              ការបូកប្រភាគ
            </div>
            <div className="mt-2 flex justify-center gap-1.5">
              <span className="rounded bg-orange-100 px-2 py-0.5 text-[9px] font-bold text-orange-700">គណិតវិទ្យា</span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700">ថ្នាក់ទី៧</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">៥០ នាទី</span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="text-xs font-bold text-orange-700" style={{ fontFamily: "'Koulen', sans-serif" }}>១. គោលបំណង</div>
            <div className="h-2 w-[92%] rounded bg-slate-100" />
            <div className="h-2 w-[78%] rounded bg-slate-100" />
            <div className="mt-3 text-xs font-bold text-orange-700" style={{ fontFamily: "'Koulen', sans-serif" }}>៣. ដំណើរការបង្រៀន</div>
            <div className="overflow-hidden rounded border border-slate-100">
              <div className="flex bg-orange-50/70 text-[8px] text-orange-800">
                <div className="flex-1 border-r border-slate-100 px-2 py-1">ដំណាក់កាល</div>
                <div className="flex-1 px-2 py-1">សកម្មភាព</div>
              </div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex border-t border-slate-50 text-[8px]">
                  <div className="flex-1 border-r border-slate-100 px-2 py-1.5"><div className="h-1.5 w-12 rounded bg-slate-100" /></div>
                  <div className="flex-1 px-2 py-1.5"><div className="h-1.5 w-20 rounded bg-slate-100" /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* floating AI badge */}
      <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-xl">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white">
          <Sparkles size={15} />
        </span>
        <span className="text-xs font-semibold text-slate-700">{isKm ? 'បង្កើតដោយ AI' : 'Generated by AI'}</span>
      </div>
    </div>
  );
}
