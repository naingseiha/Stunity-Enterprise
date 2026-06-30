'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Menu,
  MessagesSquare,
  Presentation,
  School,
  Sparkles,
  X,
  CheckCircle2,
  Globe,
  Mail,
  MapPin,
  Zap,
  Star,
  Award,
} from 'lucide-react';

type Lang = 'en' | 'km';

/* ─────────────────────────────────────────────────────────────
   Custom Hook: useScrollReveal — IntersectionObserver
   ───────────────────────────────────────────────────────────── */
function useScrollReveal(threshold = 0.12) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const targets = el.querySelectorAll(
      '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale'
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [threshold]);

  return containerRef;
}

/* ─────────────────────────────────────────────────────────────
   Custom Hook: useCountUp — Animated number counter
   ───────────────────────────────────────────────────────────── */
function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTimestamp: number | null = null;
    const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = easeOutExpo(progress);
      setCount(Math.floor(easedProgress * end));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(step);
  }, [hasStarted, end, duration]);

  return { count, ref };
}

/* ─────────────────────────────────────────────────────────────
   Custom Hook: useNavbarScroll — Scroll-aware navbar
   ───────────────────────────────────────────────────────────── */
function useNavbarScroll() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return scrolled;
}

/* ─────────────────────────────────────────────────────────────
   Translations
   ───────────────────────────────────────────────────────────── */
const T = {
  en: {
    nav: { tools: 'AI Studio', social: 'Social Feed', schools: 'School OS', pricing: 'Pricing' },
    login: 'Log in',
    getStarted: 'Join for free',
    heroTitle: 'Discover modern educational\ndesign inspiration.',
    heroSub:
      'Featuring over 400,000+ MoEYS lesson plans, structured exams, and school management workflows — Updated weekly.',
    heroCtaPrimary: 'Launch AI Studio',
    heroCtaSecondary: 'Explore School OS',
    trustedBy: 'Trusted by innovative educational institutions at',
    libraryPre: 'A growing educational ecosystem of',
    stat1: '1,428',
    stat1Label: 'campuses',
    stat2: '621,500',
    stat2Label: 'lesson plans',
    stat3: '323,900',
    stat3Label: 'exam flows',
    patternsTitle: 'Explore powerful AI tools\nfor modern educators.',
    patternsSub: 'Everything you need to create, manage, and scale your educational institution.',
    tabAll: 'All Creative Tools',
    tabLessons: 'AI Lesson Planner',
    tabExams: 'Smart Exams',
    tabSocial: 'Social Learning',
    tabAnalytics: 'School Analytics',
    openWorkflow: 'Launch Tool Studio',
    pricingTitle: 'Simple, transparent pricing.',
    pricingSub: 'Save hours of curriculum creation with our complete suite.',
    monthly: 'Monthly',
    annual: 'Annual (Save 20%)',
    perMonth: '/month',
    free: 'Free',
    plans: [
      { name: 'Educator', priceMonthly: '$0', priceAnnual: '$0', desc: 'Save hours of curriculum research and generation.', feats: ['Unlimited AI Lesson Planner', 'Full access to Academic Social Feed', 'Personal cloud storage', 'MoEYS standard templates'], cta: 'Join for free', highlight: false },
      { name: 'School Basic', priceMonthly: '$29', priceAnnual: '$24', desc: 'For growing schools up to 200 students.', feats: ['Everything in Educator', 'Automated grading & attendance engine', 'Smart faculty scheduling system', 'Direct parent-teacher portal', 'Official MoEYS report exports'], cta: 'Start 14-Day Trial', highlight: true },
      { name: 'School Pro', priceMonthly: '$79', priceAnnual: '$64', desc: 'For established institutions needing advanced AI insights.', feats: ['Unlimited students & faculty accounts', 'AI predictive student performance analytics', 'Automated diploma certificate issuance', '24/7 priority engineering support', 'Custom role-based security access'], cta: 'Start 14-Day Trial', highlight: false },
    ],
    ctaTitle: 'Explore entire classroom\njourneys with flows.',
    ctaSub: 'Join thousands of Cambodian educators building the future of learning.',
    ctaBtn: 'Join for free',
    footerTagline: 'Cambodia\'s most advanced educational platform',
    footerProduct: 'Product',
    footerCompany: 'Company',
    footerConnect: 'Connect',
    footerLinks: {
      product: ['AI Lesson Planner', 'Smart Exams', 'School OS', 'Social Feed'],
      company: ['About Us', 'Careers', 'Privacy Policy', 'Terms of Service'],
    },
  },
  km: {
    nav: { tools: 'ឧបករណ៍ AI', social: 'បណ្តាញសិក្សា', schools: 'ប្រព័ន្ធសាលា', pricing: 'កញ្ចប់តម្លៃ' },
    login: 'ចូលគណនី',
    getStarted: 'ប្រើឥតគិតថ្លៃ',
    heroTitle: 'ស្វែងយល់បទពិសោធន៍បង្រៀន\nនិងរៀបចំសាលារៀនទំនើប។',
    heroSub:
      'រួមបញ្ចូលកិច្ចតែងការ MoEYS ជាង ៤០០,០០០+ គំរូ វិញ្ញាសាប្រឡង និងប្រព័ន្ធគ្រប់គ្រងស្ថាប័នអប់រំ — ធ្វើបច្ចុប្បន្នភាពរៀងរាល់សប្តាហ៍។',
    heroCtaPrimary: 'បើកស្ទូឌីយោ AI',
    heroCtaSecondary: 'ស្វែងយល់ School OS',
    trustedBy: 'ទទួលស្គាល់ និងប្រើប្រាស់ដោយស្ថាប័នអប់រំឈានមុខ',
    libraryPre: 'បណ្ណាល័យបង្រៀនដ៏ធំបំផុតរួមមាន',
    stat1: '១,៤២៨',
    stat1Label: 'សាលារៀន',
    stat2: '៦២១,៥០០',
    stat2Label: 'កិច្ចតែងការ',
    stat3: '៣២៣,៩០០',
    stat3Label: 'វិញ្ញាសាប្រឡង',
    patternsTitle: 'ឧបករណ៍ AI ច្នៃប្រឌិតខ្ពស់\nសម្រាប់លោកគ្រូ-អ្នកគ្រូទំនើប។',
    patternsSub: 'គ្រប់អ្វីៗដែលអ្នកត្រូវការសម្រាប់ការបង្កើត គ្រប់គ្រង និងពង្រីកស្ថាប័នអប់រំរបស់អ្នក។',
    tabAll: 'មុខងារទាំងអស់',
    tabLessons: 'កិច្ចតែងការ AI',
    tabExams: 'វិញ្ញាសាឆ្លាតវៃ',
    tabSocial: 'បណ្តាញសិក្សា',
    tabAnalytics: 'ស្ថិតិ និងគ្រប់គ្រង',
    openWorkflow: 'បើកប្រើប្រាស់ឧបករណ៍',
    pricingTitle: 'កញ្ចប់តម្លៃច្បាស់លាស់ និងសមរម្យ។',
    pricingSub: 'សន្សំពេលវេលារៀបចំកិច្ចតែងការ និងគ្រប់គ្រងសាលារៀនរបស់អ្នក។',
    monthly: 'ប្រចាំខែ',
    annual: 'ប្រចាំឆ្នាំ (ចំណេញ ២០%)',
    perMonth: '/ខែ',
    free: 'ឥតគិតថ្លៃ',
    plans: [
      { name: 'សម្រាប់គ្រូបង្រៀន', priceMonthly: '$0', priceAnnual: '$0', desc: 'សន្សំពេលវេលាស្រាវជ្រាវ និងបង្កើតឯកសារបង្រៀន។', feats: ['ឧបករណ៍ AI កិច្ចតែងការមិនកំណត់', 'ចូលប្រើប្រាស់បណ្តាញសិក្សាសង្គម Feed', 'កន្លែងរក្សាទុកឯកសារ Cloud', 'គំរូស្តង់ដារក្រសួងអប់រំ MoEYS'], cta: 'ចាប់ផ្តើមឥតគិតថ្លៃ', highlight: false },
      { name: 'សាលារៀន មូលដ្ឋាន', priceMonthly: '$29', priceAnnual: '$24', desc: 'សម្រាប់សាលារៀនដែលមានសិស្សដល់ ២០០ នាក់។', feats: ['មុខងារទាំងអស់ក្នុងកញ្ចប់គ្រូបង្រៀន', 'ប្រព័ន្ធពិន្ទុ និងវត្តមានស្វ័យប្រវត្តិ', 'ប្រព័ន្ធរៀបចំកាលវិភាគឆ្លាតវៃ', 'ទំនាក់ទំនងរវាងមាតាបិតា និងគ្រូ', 'របាយការណ៍ស្តង់ដារ MoEYS'], cta: 'សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ', highlight: true },
      { name: 'សាលារៀន Pro', priceMonthly: '$79', priceAnnual: '$64', desc: 'សម្រាប់ស្ថាប័នធំៗដែលត្រូវការប្រព័ន្ធវិភាគទិន្នន័យ។', feats: ['ចំនួនសិស្ស និងគ្រូមិនកំណត់', 'ប្រព័ន្ធវិភាគទិន្នន័យ AI កម្រិតខ្ពស់', 'ចេញវិញ្ញាបនបត្រស្វ័យប្រវត្តិ', 'ជំនួយបច្ចេកទេស ២៤ ម៉ោង', 'ការកំណត់សិទ្ធិសុវត្ថិភាពតាមតួនាទី'], cta: 'សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ', highlight: false },
    ],
    ctaTitle: 'ស្វែងយល់បទពិសោធន៍ថ្នាក់រៀន\nពេញលេញជាមួយ Stunity។',
    ctaSub: 'ចូលរួមជាមួយលោកគ្រូ-អ្នកគ្រូកម្ពុជារាប់ពាន់នាក់ក្នុងការកសាងអនាគតនៃការអប់រំ។',
    ctaBtn: 'ចាប់ផ្តើមឥតគិតថ្លៃ',
    footerTagline: 'បណ្ណាល័យ និងប្រព័ន្ធគ្រប់គ្រងសាលារៀនទំនើបរបស់កម្ពុជា',
    footerProduct: 'ផលិតផល',
    footerCompany: 'អំពីក្រុមហ៊ុន',
    footerConnect: 'ទំនាក់ទំនង',
    footerLinks: {
      product: ['កិច្ចតែងការ AI', 'វិញ្ញាសាឆ្លាតវៃ', 'ប្រព័ន្ធសាលា', 'បណ្តាញសិក្សា'],
      company: ['អំពីយើង', 'ឱកាសការងារ', 'គោលការណ៍ឯកជន', 'លក្ខខណ្ឌប្រើប្រាស់'],
    },
  },
} satisfies Record<Lang, unknown>;

/* ─────────────────────────────────────────────────────────────
   Hero product mockup — a framed "Studio" app window showing a
   teaching slide. Gives the hero a real product shot (enterprise
   landing pages always show the product, not just copy).
   ───────────────────────────────────────────────────────────── */
function HeroMockup({ isKm, fontTitle, fontBody }: { isKm: boolean; fontTitle: string; fontBody: string }) {
  const kicker = isKm ? 'រូបវិទ្យា · ថ្នាក់ទី១០' : 'PHYSICS · GRADE 10';
  const title = isKm ? 'ច្បាប់ញូតុនទី ១' : "Newton's First Law";
  const bullets = isKm
    ? ['វត្ថុរក្សាស្ថានភាពនឹង រហូតមានកម្លាំងមកធ្វើ', 'កម្លាំងសុទ្ធ = សូន្យ ⇒ ល្បឿនថេរ', 'ឧទាហរណ៍ក្នុងជីវភាពប្រចាំថ្ងៃ']
    : ['An object stays at rest unless acted on', 'Net force = zero ⇒ constant velocity', 'Everyday real-world examples'];
  const ribbon = ['Aa', 'B', 'I', 'U'];
  return (
    <div className="hero-entrance hero-delay-5 relative mx-auto mt-16 max-w-3xl">
      {/* ambient glow under the window */}
      <div aria-hidden className="absolute -inset-6 rounded-[36px] bg-gradient-to-tr from-indigo-300/30 via-purple-300/25 to-pink-300/20 blur-3xl" />
      <div className="relative rounded-2xl border border-gray-200/70 bg-white shadow-[0_40px_90px_-35px_rgba(79,70,229,0.45)] overflow-hidden">
        {/* window chrome */}
        <div className="flex items-center gap-2.5 h-11 px-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
          <span className="flex gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <i className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <i className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </span>
          <div className="ml-2 flex items-center gap-2">
            <span className="h-5 w-5 rounded-md bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white">
              <Presentation size={11} />
            </span>
            <span className="text-[10px] font-extrabold tracking-[1.5px] text-gray-400">STUNITY STUDIO</span>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1">
            {ribbon.map((r) => (
              <span key={r} className="h-6 min-w-[24px] px-1.5 rounded-md bg-white border border-gray-200/80 flex items-center justify-center text-[10px] font-bold text-gray-500">
                {r}
              </span>
            ))}
          </div>
        </div>
        {/* body: filmstrip + slide */}
        <div className="flex bg-[#faf9ff]">
          <div className="hidden sm:flex flex-col gap-2.5 w-[116px] flex-none p-3 border-r border-gray-100 bg-white/60">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`aspect-video rounded-md bg-white p-2 transition ${i === 0 ? 'ring-2 ring-indigo-400 border border-indigo-300' : 'border border-gray-200'}`}
              >
                <div className="h-1 w-2/3 rounded-full bg-gray-200" />
                <div className="mt-1.5 h-0.5 w-full rounded-full bg-gray-100" />
                <div className="mt-1 h-0.5 w-4/5 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
          <div className="flex-1 p-4 sm:p-6">
            {/* slide card with a gradient background + readability scrim */}
            <div
              className="relative aspect-video rounded-xl overflow-hidden border border-gray-200/60 shadow-[0_18px_40px_-20px_rgba(20,12,40,0.4)]"
              style={{ background: 'linear-gradient(135deg,#e0c3fc 0%,#8ec5fc 100%)' }}
            >
              <div className="absolute inset-0 bg-white/45" />
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="relative h-full px-5 py-4 sm:px-8 sm:py-6 flex flex-col justify-center text-left">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-[9px] sm:text-[10px] font-bold text-indigo-700 tracking-wide" style={{ fontFamily: fontBody }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> {kicker}
                </span>
                <h4 className="mt-2.5 text-base sm:text-2xl font-bold text-gray-900" style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.6' : '1.15' }}>
                  {title}
                </h4>
                <div className="mt-3 space-y-1.5 sm:space-y-2.5">
                  {bullets.map((b) => (
                    <div key={b} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 flex-none rounded-sm bg-indigo-500 rotate-45" />
                      <span className="text-[10px] sm:text-[13px] text-gray-700" style={{ fontFamily: fontBody, lineHeight: isKm ? '1.7' : '1.45' }}>
                        {b}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* floating accent badge */}
      <div className="absolute -right-3 -top-3 sm:-right-5 sm:-top-4 rounded-xl bg-white px-3 py-2 shadow-xl shadow-indigo-500/10 border border-gray-100 flex items-center gap-2 animate-float">
        <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
          <Sparkles size={14} />
        </span>
        <span className="text-[10px] font-bold text-gray-700" style={{ fontFamily: fontBody }}>
          {isKm ? 'បង្កើតក្នុង ១០ វិនាទី' : 'Built in 10s'}
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang: Lang = locale === 'km' ? 'km' : 'en';
  const c = T[lang];
  const isKm = lang === 'km';
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const fontBody = isKm ? "'Battambang', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'lessons' | 'exams' | 'social' | 'analytics'>('all');
  const [isAnnual, setIsAnnual] = useState(false);

  const navbarScrolled = useNavbarScroll();
  const revealRef = useScrollReveal();

  // Count-up hooks for stats
  const stat1Counter = useCountUp(1428, 2200);
  const stat2Counter = useCountUp(621500, 2500);
  const stat3Counter = useCountUp(323900, 2500);

  const switchLanguage = (newLang: Lang) => {
    if (newLang === lang) return;
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    const currentPath = pathname || `/${locale}`;
    const newPath = currentPath.replace(/^\/(en|km)/, `/${newLang}`);
    const query = searchParams?.toString();
    router.push(query ? `${newPath}?${query}` : newPath);
  };

  // Format number with commas
  const formatNumber = (n: number) => n.toLocaleString('en-US');

  // Editorial-style tool cards — clean, unique, content-first
  const toolsList = [
    {
      id: 'lessons',
      index: '01',
      accentFrom: '#6366f1',
      accentTo: '#a855f7',
      tagColor: 'text-indigo-600 bg-indigo-50',
      tag: isKm ? 'AI ជំនាន់ ២.០' : 'AI Studio 2.0',
      title: isKm ? 'ឧបករណ៍បង្កើតកិច្ចតែងការ AI' : 'AI Lesson Plan Studio',
      desc: isKm ? 'បង្កើតកិច្ចតែងការបង្រៀនប្រចាំថ្ងៃ ប្រចាំសប្តាហ៍ស្របតាមស្តង់ដារក្រសួងអប់រំ MoEYS ស្វ័យប្រវត្តិ។' : 'Instant AI curriculum generation compliant with official MoEYS standard structures.',
      stats: isKm ? '៤ ទំព័រក្នុង ១០ វិនាទី' : 'Generate in 10s',
    },
    {
      id: 'exams',
      index: '02',
      accentFrom: '#f43f5e',
      accentTo: '#f97316',
      tagColor: 'text-rose-600 bg-rose-50',
      tag: isKm ? 'កែស្វ័យប្រវត្តិ' : 'Auto Grading',
      title: isKm ? 'កម្មវិធីបង្កើតវិញ្ញាសា និងកំហុស' : 'Smart Quiz & Exam Creator',
      desc: isKm ? 'បង្កើតវិញ្ញាសាប្រឡងពហុជ្រើសរើស សំណួរវិភាគ និងអត្ថបទពន្យល់ចម្លើយភ្លាមៗ។' : 'Create dynamic multi-choice and essay exams with AI automated grading rubrics.',
      stats: isKm ? 'ចម្លើយពន្យល់ ១០០%' : 'Instant Rubrics',
    },
    {
      id: 'lessons',
      index: '03',
      accentFrom: '#3b82f6',
      accentTo: '#06b6d4',
      tagColor: 'text-blue-600 bg-blue-50',
      tag: isKm ? 'ស្លាយបង្រៀន' : 'Slide Deck',
      title: isKm ? 'ឧបករណ៍បង្កើតស្លាយបង្រៀន' : 'Interactive Slide Designer',
      desc: isKm ? 'បំប្លែងអត្ថបទមេរៀនទៅជាផ្ទាំង Slide បង្រៀនស្រស់ស្អាត មានរូបភាព និងលំហាត់ផ្ទាល់។' : 'Transform raw text into visual classroom presentations with interactive polls.',
      stats: isKm ? 'រូបភាព AI ស្រស់ស្អាត' : 'Visual Classroom',
    },
    {
      id: 'social',
      index: '04',
      accentFrom: '#f59e0b',
      accentTo: '#ef4444',
      tagColor: 'text-amber-600 bg-amber-50',
      tag: isKm ? 'សហគមន៍អប់រំ' : 'Social Feed',
      title: isKm ? 'បណ្តាញចែករំលែកមេរៀន និងមតិ' : 'Academic Social Community',
      desc: isKm ? 'កន្លែងភ្ជាប់ទំនាក់ទំនងរវាងលោកគ្រូ-អ្នកគ្រូទូទាំងប្រទេស ចែករំលែកបទពិសោធន៍ និងឯកសារ។' : 'Nationwide educational community feed to share resources, polls, and classroom methods.',
      stats: isKm ? 'សមាជិក ៥០,០០០+ នាក់' : '50k+ Educators',
    },
    {
      id: 'analytics',
      index: '05',
      accentFrom: '#10b981',
      accentTo: '#0891b2',
      tagColor: 'text-emerald-600 bg-emerald-50',
      tag: isKm ? 'គ្រប់គ្រងសាលា' : 'School OS',
      title: isKm ? 'ប្រព័ន្ធគ្រប់គ្រងសាលារៀន School OS' : 'Enterprise School Management',
      desc: isKm ? 'គ្រប់គ្រងវត្តមានសិស្ស កាលវិភាគបង្រៀន និងរបាយការណ៍ពិន្ទុបញ្ជូនទៅមាតាបិតា។' : 'Comprehensive automated attendance, faculty scheduling, and parent report portal.',
      stats: isKm ? 'របាយការណ៍ MoEYS' : 'Official Portal',
    },
    {
      id: 'analytics',
      index: '06',
      accentFrom: '#a855f7',
      accentTo: '#6366f1',
      tagColor: 'text-purple-600 bg-purple-50',
      tag: isKm ? 'ស្ថិតិឆ្លាតវៃ' : 'AI Analytics',
      title: isKm ? 'ប្រព័ន្ធវិភាគលទ្ធផលសិក្សាសិស្ស' : 'Predictive Student Analytics',
      desc: isKm ? 'វិភាគចំណុចខ្លាំង-ខ្សោយរបស់សិស្សម្នាក់ៗ ដើម្បីជួយគ្រូរៀបចំវិធីសាស្ត្របង្រៀនឱ្យចំគោលដៅ។' : 'AI diagnostic insights tracking student proficiency growth across academic terms.',
      stats: isKm ? 'ភាពត្រឹមត្រូវ ៩៩%' : 'Proficiency Tracking',
    },
  ];

  const filteredTools = activeTab === 'all' ? toolsList : toolsList.filter((t) => t.id === activeTab);

  const trustedBrands = ['MoEYS', 'BAK TOUK', 'SISOWATH', 'INDRADEVI', 'CAMBODIA EDTECH'];

  return (
    <div ref={revealRef} className="min-h-screen bg-white text-[#111827] antialiased selection:bg-indigo-600 selection:text-white overflow-x-hidden" style={{ fontFamily: fontBody }}>
      {/* ── Enterprise Frosted Glass Navbar ── */}
      <header className={`sticky top-0 z-50 w-full transition-all duration-500 ${navbarScrolled ? 'navbar-scrolled' : 'bg-white/80 backdrop-blur-md border-b border-gray-200/60'}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href={`/${locale}`} className="flex items-center gap-2.5 transition-all duration-300 hover:scale-[1.02]">
            <img src="/Stunity.png" alt="Stunity" className="h-6 w-auto" />
            <span className="hidden sm:inline-block font-bold tracking-tight text-sm text-[#111827]">Stunity</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex text-xs font-semibold text-gray-600">
            {[
              { href: '#patterns', label: c.nav.tools },
              { href: '#patterns', label: c.nav.social },
              { href: '#patterns', label: c.nav.schools },
              { href: '#pricing', label: c.nav.pricing },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="relative py-1 hover:text-black transition-colors duration-300 group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:w-full transition-all duration-300 rounded-full" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {/* Language Switcher Pill */}
            <div className="flex items-center rounded-full bg-[#f3f4f6] p-0.5 text-[11px] font-semibold border border-gray-200/60">
              <button
                onClick={() => switchLanguage('en')}
                className={`rounded-full px-3 py-1 transition-all duration-300 ${!isKm ? 'bg-white text-black shadow-sm font-bold' : 'text-gray-500 hover:text-black'}`}
              >
                EN
              </button>
              <button
                onClick={() => switchLanguage('km')}
                className={`rounded-full px-3 py-1 transition-all duration-300 ${isKm ? 'bg-white text-black shadow-sm font-bold' : 'text-gray-500 hover:text-black'}`}
                style={{ fontFamily: "'Battambang', sans-serif" }}
              >
                ខ្មែរ
              </button>
            </div>

            <Link
              href={`/${locale}/auth/login`}
              className="hidden sm:block text-xs font-semibold text-gray-600 hover:text-black transition-colors duration-300 px-2"
            >
              {c.login}
            </Link>

            <Link
              href={`/${locale}/register-school`}
              className="rounded-full bg-[#111827] text-white px-5 py-2 text-xs font-semibold transition-all duration-300 hover:bg-black hover:shadow-lg hover:shadow-indigo-500/10 hover:scale-[1.02] flex items-center justify-center"
            >
              {c.getStarted}
            </Link>

            <button onClick={() => setMenuOpen((v) => !v)} className="p-1 text-gray-700 md:hidden" aria-label="Menu">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="border-t border-gray-200/60 bg-white/95 backdrop-blur-lg px-6 py-4 md:hidden text-sm font-semibold text-gray-700 animate-slideUp">
            <div className="flex flex-col gap-3.5">
              <a href="#patterns" onClick={() => setMenuOpen(false)} className="hover:text-black transition">{c.nav.tools}</a>
              <a href="#patterns" onClick={() => setMenuOpen(false)} className="hover:text-black transition">{c.nav.social}</a>
              <a href="#pricing" onClick={() => setMenuOpen(false)} className="hover:text-black transition">{c.nav.pricing}</a>
              <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                <Link href={`/${locale}/auth/login`} className="text-xs font-bold text-black">{c.login}</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Cinematic Hero Section with Aurora Mesh ── */}
      <section className="relative pt-14 pb-20 sm:pt-20 sm:pb-28 px-6 text-center overflow-hidden">
        {/* Aurora Gradient Mesh Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-200/30 blur-[120px] animate-gradient-shift animate-morph-blob" />
          <div className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-purple-200/25 blur-[100px] animate-gradient-shift-2 animate-morph-blob" style={{ animationDelay: '2s' }} />
          <div className="absolute -bottom-1/4 left-1/3 w-[550px] h-[550px] rounded-full bg-rose-200/20 blur-[110px] animate-gradient-shift-3 animate-morph-blob" style={{ animationDelay: '4s' }} />
          <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] rounded-full bg-amber-100/20 blur-[80px] animate-gradient-shift" style={{ animationDelay: '6s' }} />
        </div>

        {/* Floating Decorative Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block" aria-hidden="true">
          <div className="absolute top-24 left-[8%] w-3 h-3 rounded-full bg-indigo-400/40 animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute top-36 right-[12%] w-2 h-2 rounded-full bg-purple-400/50 animate-float-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-32 left-[15%] w-4 h-4 rounded-full bg-rose-300/30 animate-float-reverse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 right-[8%] w-2.5 h-2.5 rounded-full bg-amber-400/40 animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute bottom-40 right-[20%] w-3 h-3 rounded-full bg-emerald-400/30 animate-float-slow" style={{ animationDelay: '4s' }} />
          <div className="absolute top-20 left-[40%] w-2 h-2 rounded-full bg-cyan-400/40 animate-float-reverse" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="mx-auto max-w-4xl relative z-10">
          {/* Animated Hero Icon */}
          <div className="hero-entrance hero-delay-1 mx-auto mb-7 h-16 w-16 sm:h-20 sm:w-20 rounded-[20px] bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-[0_12px_40px_rgba(99,102,241,0.35)] flex items-center justify-center text-white transform hover:scale-110 hover:rotate-3 transition-all duration-500">
            <Sparkles className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={2.2} />
          </div>

          {/* Hero Title */}
          <h1
            className={`hero-entrance hero-delay-2 whitespace-pre-line font-bold tracking-normal text-[#111827] mx-auto max-w-4xl ${
              isKm ? 'text-2xl sm:text-4xl lg:text-[44px]' : 'text-4xl sm:text-6xl lg:text-7xl tracking-tight'
            }`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.85' : '1.15' }}
          >
            {c.heroTitle}
          </h1>

          {/* Hero Subtitle */}
          <p
            className="hero-entrance hero-delay-3 mx-auto mt-6 max-w-2xl text-sm sm:text-base text-gray-500 font-normal"
            style={{ lineHeight: isKm ? '2' : '1.7' }}
          >
            {c.heroSub}
          </p>

          {/* Hero CTAs */}
          <div className="hero-entrance hero-delay-4 mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/${locale}/tools/lesson-planner`}
              className="group w-full sm:w-auto rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-8 py-4 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.03] animate-shimmer-glow relative overflow-hidden"
              style={{ backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, #4f46e5, #9333ea, #ec4899, #4f46e5)' }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Zap size={16} className="group-hover:rotate-12 transition-transform duration-300" />
                {c.heroCtaPrimary}
              </span>
            </Link>

            <Link
              href={`/${locale}/register-school`}
              className="group w-full sm:w-auto rounded-full bg-white border border-gray-200 px-8 py-4 text-xs sm:text-sm font-semibold text-[#111827] transition-all duration-300 hover:bg-gray-50 hover:border-gray-300 hover:shadow-lg flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{c.heroCtaSecondary}</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>

          {/* Hero Product Mockup */}
          <HeroMockup isKm={isKm} fontTitle={fontTitle} fontBody={fontBody} />

          {/* Trusted By — Animated Marquee */}
          <div className="hero-entrance hero-delay-6 mt-16 pt-8 border-t border-gray-100/80">
            <p className="text-xs font-medium text-gray-400 mb-6">{c.trustedBy}</p>
            <div className="relative overflow-hidden mx-auto max-w-lg">
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
              <div className="animate-marquee">
                {[...trustedBrands, ...trustedBrands].map((brand, i) => (
                  <span key={i} className="mx-6 sm:mx-8 font-extrabold text-gray-400 tracking-tighter text-sm sm:text-base whitespace-nowrap opacity-60 hover:opacity-100 transition-opacity duration-300">
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dramatic Stats with Animated Counters & Floating Icons ── */}
      <section className="py-20 sm:py-28 bg-[#fafafa] relative overflow-hidden text-center border-y border-gray-100">
        {/* Floating Decorative Icon Cards */}
        <div className="absolute top-10 left-[10%] hidden md:flex h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white items-center justify-center shadow-lg shadow-blue-500/20 transform -rotate-6 animate-float" style={{ animationDelay: '0s' }}>
          <BookOpen size={24} />
        </div>
        <div className="absolute top-20 right-[12%] hidden md:flex h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-800 to-black text-white items-center justify-center shadow-xl shadow-black/20 transform rotate-12 animate-float-slow" style={{ animationDelay: '1.5s' }}>
          <School size={28} />
        </div>
        <div className="absolute bottom-14 left-[15%] hidden md:flex h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white items-center justify-center shadow-lg shadow-emerald-500/20 transform rotate-6 animate-float-reverse" style={{ animationDelay: '0.8s' }}>
          <CheckCircle2 size={24} />
        </div>
        <div className="absolute bottom-16 right-[15%] hidden md:flex h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-700 text-white items-center justify-center shadow-lg shadow-purple-500/20 transform -rotate-12 animate-float" style={{ animationDelay: '2s' }}>
          <MessagesSquare size={20} />
        </div>
        <div className="absolute top-1/2 left-[5%] hidden lg:flex h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white items-center justify-center shadow-md shadow-amber-500/20 transform rotate-12 animate-float-slow" style={{ animationDelay: '3s' }}>
          <Star size={18} />
        </div>

        <div className="mx-auto max-w-4xl px-6 relative z-10">
          <p className="scroll-reveal text-sm sm:text-base font-semibold text-gray-500 mb-10">{c.libraryPre}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4">
            {/* Stat 1 */}
            <div ref={stat1Counter.ref} className="scroll-reveal stagger-1">
              <div
                className={`font-bold text-gradient bg-gradient-to-r from-indigo-600 to-purple-600 ${isKm ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-5xl sm:text-6xl lg:text-7xl'}`}
                style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.85' : '1.2' }}
              >
                {isKm ? c.stat1 : formatNumber(stat1Counter.count)}
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">{c.stat1Label}</p>
            </div>

            {/* Stat 2 */}
            <div ref={stat2Counter.ref} className="scroll-reveal stagger-2">
              <div
                className={`font-bold text-gradient bg-gradient-to-r from-rose-500 to-orange-500 ${isKm ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-5xl sm:text-6xl lg:text-7xl'}`}
                style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.85' : '1.2' }}
              >
                {isKm ? c.stat2 : `${formatNumber(stat2Counter.count)}+`}
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">{c.stat2Label}</p>
            </div>

            {/* Stat 3 */}
            <div ref={stat3Counter.ref} className="scroll-reveal stagger-3">
              <div
                className={`font-bold text-gradient bg-gradient-to-r from-emerald-500 to-teal-500 ${isKm ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-5xl sm:text-6xl lg:text-7xl'}`}
                style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.85' : '1.2' }}
              >
                {isKm ? c.stat3 : formatNumber(stat3Counter.count)}
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">{c.stat3Label}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Editorial-Style Tool Cards ── */}
      <section id="patterns" className="py-20 sm:py-28 bg-white border-b border-gray-200/60">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2
            className={`scroll-reveal font-bold text-[#111827] ${isKm ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.85' : '1.25' }}
          >
            {c.patternsTitle}
          </h2>
          <p className="scroll-reveal stagger-1 mt-4 text-sm sm:text-base text-gray-500" style={{ lineHeight: isKm ? '2' : '1.6' }}>
            {c.patternsSub}
          </p>

          {/* Tool Filter Tabs */}
          <div className="scroll-reveal stagger-2 mt-8 inline-flex items-center rounded-full bg-[#f3f4f6] p-1.5 gap-1 border border-gray-200/80 shadow-sm overflow-x-auto max-w-full">
            {([
              { key: 'all', label: c.tabAll },
              { key: 'lessons', label: c.tabLessons },
              { key: 'exams', label: c.tabExams },
              { key: 'social', label: c.tabSocial },
              { key: 'analytics', label: c.tabAnalytics },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[#111827] text-white shadow-lg scale-[1.02]'
                    : 'text-gray-600 hover:text-black hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tool Cards Grid — Editorial Style */}
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 text-left">
            {filteredTools.map((tool, idx) => (
              <div
                key={idx}
                className={`scroll-reveal stagger-${Math.min(idx + 1, 6)}`}
              >
                <Link
                  href={`/${locale}/tools/lesson-planner`}
                  className="group block rounded-2xl bg-white border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-500 relative overflow-hidden h-full"
                >
                  {/* Top Accent Bar — thin line that widens on hover */}
                  <div
                    className="h-[3px] w-full transition-all duration-500 group-hover:h-[4px]"
                    style={{
                      background: `linear-gradient(90deg, ${tool.accentFrom}, ${tool.accentTo})`,
                      opacity: 0.5,
                    }}
                  />
                  {/* Hover: accent bar glow overlay */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{
                      background: `linear-gradient(180deg, ${tool.accentFrom}08, transparent)`,
                    }}
                  />

                  <div className="p-7 flex flex-col justify-between h-full relative z-10">
                    {/* Header: Index + Tag */}
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <span
                          className="text-[11px] font-mono font-bold tracking-widest transition-colors duration-500"
                          style={{ color: tool.accentFrom }}
                        >
                          {tool.index}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${tool.tagColor} transition-all duration-300`}>
                          {tool.tag}
                        </span>
                      </div>

                      {/* Title with underline sweep */}
                      <h3
                        className="text-[17px] font-bold text-[#111827] transition-colors duration-300 relative inline"
                        style={{ lineHeight: isKm ? '1.8' : '1.4' }}
                      >
                        <span className="relative">
                          {tool.title}
                          <span
                            className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out rounded-full"
                            style={{ background: `linear-gradient(90deg, ${tool.accentFrom}, ${tool.accentTo})` }}
                          />
                        </span>
                      </h3>

                      <p
                        className="mt-3 text-[13px] text-gray-500 group-hover:text-gray-600 transition-colors duration-300"
                        style={{ lineHeight: isKm ? '2' : '1.65' }}
                      >
                        {tool.desc}
                      </p>
                    </div>

                    {/* Footer: Stats + CTA */}
                    <div className="mt-7 pt-4 border-t border-gray-100 group-hover:border-gray-200/80 flex items-center justify-between transition-colors duration-500">
                      <span className="text-[11px] font-semibold text-gray-400 tracking-wide">{tool.stats}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 group-hover:text-[#111827] transition-all duration-400">
                        <span className="opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-400">{c.openWorkflow}</span>
                        <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 delay-75" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Enterprise Pricing Table ── */}
      <section id="pricing" className="py-20 sm:py-28 bg-[#fafafa] border-t border-gray-200/60">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2
            className={`scroll-reveal font-bold text-[#111827] ${isKm ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.85' : '1.25' }}
          >
            {c.pricingTitle}
          </h2>
          <p
            className="scroll-reveal stagger-1 mt-4 text-sm sm:text-base text-gray-500"
            style={{ lineHeight: isKm ? '2' : '1.6' }}
          >
            {c.pricingSub}
          </p>

          {/* Annual/Monthly Toggle */}
          <div className="scroll-reveal stagger-2 mt-8 inline-flex items-center rounded-full bg-white p-1 border border-gray-200 shadow-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 ${!isAnnual ? 'bg-[#111827] text-white shadow-lg' : 'text-gray-600 hover:text-black'}`}
            >
              {c.monthly}
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 ${isAnnual ? 'bg-[#111827] text-white shadow-lg' : 'text-gray-600 hover:text-black'}`}
            >
              {c.annual}
            </button>
          </div>

          {/* Pricing Cards */}
          <div className="mt-12 grid gap-6 lg:grid-cols-3 text-left">
            {c.plans.map((p, idx) => {
              const price = isAnnual ? p.priceAnnual : p.priceMonthly;
              return (
                <div
                  key={p.name}
                  className={`scroll-reveal stagger-${idx + 1} relative`}
                >
                  {/* Glow Ring for Highlighted */}
                  {p.highlight && (
                    <div className="absolute -inset-[2px] rounded-[26px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 animate-border-glow blur-sm pointer-events-none" />
                  )}

                  <div
                    className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-500 relative h-full ${
                      p.highlight
                        ? 'bg-[#111827] text-white shadow-2xl shadow-indigo-500/10 scale-[1.02] animate-glow-pulse z-10'
                        : 'bg-white text-[#111827] border border-gray-200/80 shadow-sm hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1'
                    }`}
                  >
                    {/* Popular Badge */}
                    {p.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-[10px] font-bold text-white shadow-lg whitespace-nowrap">
                        {isKm ? '⭐ ពេញនិយមបំផុត' : '⭐ Most Popular'}
                      </div>
                    )}

                    <div>
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${p.highlight ? 'text-gray-400' : 'text-gray-500'}`}>
                        {p.name}
                      </h3>
                      <div className="mt-5 flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-bold tracking-tight">{price}</span>
                        {price.startsWith('$') && price !== '$0' && <span className={`text-xs ${p.highlight ? 'text-gray-400' : 'text-gray-500'}`}>{c.perMonth}</span>}
                      </div>
                      <p
                        className={`mt-3.5 text-xs ${p.highlight ? 'text-gray-300' : 'text-gray-500'}`}
                        style={{ lineHeight: isKm ? '1.9' : '1.5' }}
                      >
                        {p.desc}
                      </p>

                      <ul className={`mt-6 space-y-3.5 pt-5 border-t ${p.highlight ? 'border-gray-700' : 'border-gray-100'}`}>
                        {p.feats.map((f, fIdx) => (
                          <li key={f} className="flex items-start gap-2.5 text-xs" style={{ lineHeight: isKm ? '1.8' : '1.5' }}>
                            <Check size={16} className={`mt-0.5 flex-none ${p.highlight ? 'text-indigo-400 font-bold' : 'text-emerald-500'}`} />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      href={`/${locale}/register-school`}
                      className={`mt-8 block rounded-full py-3.5 text-center text-xs font-bold transition-all duration-300 ${
                        p.highlight
                          ? 'bg-white text-[#111827] hover:bg-gray-100 shadow-lg hover:shadow-xl hover:scale-[1.02]'
                          : 'bg-[#111827] text-white hover:bg-black shadow hover:shadow-lg hover:scale-[1.02]'
                      }`}
                    >
                      {p.cta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Energetic CTA Section with Gradient Mesh ── */}
      <section className="relative py-24 sm:py-32 text-center overflow-hidden">
        {/* Animated Gradient Mesh Background */}
        <div className="absolute inset-0 bg-[#111827]" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/20 blur-[100px] animate-gradient-shift animate-morph-blob" />
          <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] rounded-full bg-purple-600/15 blur-[90px] animate-gradient-shift-2 animate-morph-blob" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-pink-600/10 blur-[120px] animate-gradient-shift-3" style={{ animationDelay: '5s' }} />
        </div>

        {/* Floating Decorative Dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block" aria-hidden="true">
          <div className="absolute top-16 left-[10%] w-2 h-2 rounded-full bg-indigo-400/30 animate-float" />
          <div className="absolute bottom-20 right-[15%] w-3 h-3 rounded-full bg-purple-400/25 animate-float-slow" />
          <div className="absolute top-1/3 right-[10%] w-2 h-2 rounded-full bg-pink-400/30 animate-float-reverse" />
          <div className="absolute bottom-1/3 left-[12%] w-2.5 h-2.5 rounded-full bg-cyan-400/20 animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="mx-auto max-w-4xl px-6 relative z-10">
          <div className="scroll-reveal mx-auto mb-6 h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Award size={24} />
          </div>

          <h2
            className={`scroll-reveal stagger-1 whitespace-pre-line font-bold text-white ${isKm ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.85' : '1.25' }}
          >
            {c.ctaTitle}
          </h2>
          <p
            className="scroll-reveal stagger-2 mt-5 text-sm sm:text-base text-gray-400"
            style={{ lineHeight: isKm ? '2' : '1.6' }}
          >
            {c.ctaSub}
          </p>

          <div className="scroll-reveal stagger-3 mt-9">
            <Link
              href={`/${locale}/tools/lesson-planner`}
              className="group inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-4 text-xs sm:text-sm font-bold text-[#111827] shadow-xl shadow-white/10 hover:shadow-2xl hover:shadow-white/20 hover:scale-[1.04] transition-all duration-500"
            >
              <span>{c.ctaBtn}</span>
              <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform duration-300" />
            </Link>
          </div>

          {/* Social Proof Mini */}
          <div className="scroll-reveal stagger-4 mt-10 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {[
                'bg-gradient-to-br from-indigo-400 to-purple-500',
                'bg-gradient-to-br from-rose-400 to-pink-500',
                'bg-gradient-to-br from-amber-400 to-orange-500',
                'bg-gradient-to-br from-emerald-400 to-teal-500',
              ].map((bg, i) => (
                <div key={i} className={`h-8 w-8 rounded-full ${bg} border-2 border-[#111827] flex items-center justify-center text-white text-[10px] font-bold`}>
                  {['S', 'K', 'P', 'L'][i]}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {isKm ? 'គ្រូបង្រៀន ៥,២០០+ នាក់ បានចូលរួមកាលពីខែមុន' : '5,200+ educators joined last month'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Professional Multi-Column Footer ── */}
      <footer className="bg-white py-16 border-t border-gray-100">
        <div className="mx-auto max-w-6xl px-6">
          <div className="scroll-reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <Link href={`/${locale}`} className="flex items-center gap-2.5 mb-4">
                <img src="/Stunity.png" alt="Stunity" className="h-6 w-auto" />
                <span className="font-bold text-sm text-[#111827]">Stunity Enterprise</span>
              </Link>
              <p className="text-xs text-gray-500 leading-relaxed" style={{ lineHeight: isKm ? '2' : '1.6' }}>
                {c.footerTagline}
              </p>
              <div className="mt-5 flex items-center gap-3">
                {[Globe, Mail, MapPin].map((Icon, i) => (
                  <div key={i} className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-[#111827] hover:text-white transition-all duration-300 cursor-pointer">
                    <Icon size={14} />
                  </div>
                ))}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-4">{c.footerProduct}</h4>
              <ul className="space-y-2.5">
                {c.footerLinks.product.map((link) => (
                  <li key={link}>
                    <a href="#patterns" className="group text-xs text-gray-500 hover:text-black transition-colors duration-300 flex items-center gap-1">
                      <span>{link}</span>
                      <ChevronRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-4">{c.footerCompany}</h4>
              <ul className="space-y-2.5">
                {c.footerLinks.company.map((link) => (
                  <li key={link}>
                    <a href="#" className="group text-xs text-gray-500 hover:text-black transition-colors duration-300 flex items-center gap-1">
                      <span>{link}</span>
                      <ChevronRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter / Connect */}
            <div>
              <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-4">{c.footerConnect}</h4>
              <p className="text-xs text-gray-500 mb-4" style={{ lineHeight: isKm ? '2' : '1.6' }}>
                {isKm ? 'ទទួលបានព័ត៌មានថ្មីៗអំពីមុខងារ និងការអាប់ដេត។' : 'Stay updated with the latest features and releases.'}
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder={isKm ? 'អ៊ីមែលរបស់អ្នក' : 'Your email'}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-indigo-300 transition-colors duration-300"
                />
                <button className="rounded-lg bg-[#111827] text-white px-3 py-2 text-xs font-semibold hover:bg-black transition-all duration-300 hover:shadow-lg">
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="scroll-reveal mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div>© {new Date().getFullYear()} Stunity Enterprise. All rights reserved.</div>
            <div className="flex items-center gap-1 text-[11px]">
              <span>Built with</span>
              <span className="text-rose-500">♥</span>
              <span>{isKm ? 'ក្នុងប្រទេសកម្ពុជា' : 'in Cambodia'}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
