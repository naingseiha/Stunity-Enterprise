'use client';

import { useLocale } from 'next-intl';
import { Navbar } from '@/components/landing/Navbar';
import { HeroMockup } from '@/components/landing/HeroMockup';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { TrustBadges } from '@/components/landing/TrustBadges';
import { MultiDeviceShowcase } from '@/components/landing/MultiDeviceShowcase';
import { WebPlatformShowcase } from '@/components/landing/WebPlatformShowcase';
import { AppFeaturesSteps } from '@/components/landing/AppFeaturesSteps';
import { SchoolOSCapabilities } from '@/components/landing/SchoolOSCapabilities';
import { BlogInsights } from '@/components/landing/BlogInsights';
import { Pricing } from '@/components/landing/Pricing';
import Link from 'next/link';

type Lang = 'en' | 'km';

const T = {
  en: {
    nav: { tools: 'Features', social: 'Social Feed', schools: 'For Schools', pricing: 'Pricing' },
    login: 'Log in',
    getStarted: 'Get Started',
    heroTitle: 'Transforming Education\nThrough Social Learning',
    heroSub:
      'Seamlessly connecting students, teachers, and schools with our AI-powered social media and management platform.',
    heroCtaPrimary: 'Join for free',
    heroCtaSecondary: 'Explore Platform',
    trustedBy: 'TRUSTED BY INNOVATIVE EDUCATIONAL INSTITUTIONS',
    pricingTitle: 'Simple, transparent pricing.',
    pricingSub: 'Save hours of curriculum creation with our complete suite.',
    monthly: 'Monthly',
    annual: 'Annual (Save 20%)',
    perMonth: '/month',
    plans: [
      { name: 'Educator', priceMonthly: 'Free', priceAnnual: 'Free', desc: 'Save hours of curriculum research and generation.', feats: ['Unlimited AI Lesson Planner', 'Full access to Academic Social Feed', 'Personal cloud storage', 'MoEYS standard templates'], cta: 'Join for free', highlight: false },
      { name: 'School Basic', priceMonthly: '$29', priceAnnual: '$24', desc: 'For growing schools up to 200 students.', feats: ['Everything in Educator', 'Automated grading & attendance engine', 'Smart faculty scheduling system', 'Direct parent-teacher portal', 'Official MoEYS report exports'], cta: 'Start 14-Day Trial', highlight: true },
      { name: 'School Pro', priceMonthly: '$79', priceAnnual: '$64', desc: 'For established institutions needing advanced AI insights.', feats: ['Unlimited students & faculty accounts', 'AI predictive student performance analytics', 'Automated diploma certificate issuance', '24/7 priority engineering support', 'Custom role-based security access'], cta: 'Start 14-Day Trial', highlight: false },
    ],
  },
  km: {
    nav: { tools: 'មុខងារ', social: 'បណ្តាញសិក្សា', schools: 'សម្រាប់សាលារៀន', pricing: 'កញ្ចប់តម្លៃ' },
    login: 'ចូលគណនី',
    getStarted: 'ចាប់ផ្តើម',
    heroTitle: 'ផ្លាស់ប្តូរវិស័យអប់រំ\nតាមរយៈបណ្តាញសិក្សាសង្គម',
    heroSub:
      'ភ្ជាប់ទំនាក់ទំនងសិស្ស គ្រូ និងសាលារៀនកាន់តែងាយស្រួល ជាមួយប្រព័ន្ធបណ្តាញសង្គម និងការគ្រប់គ្រងឆ្លាតវៃ (AI)។',
    heroCtaPrimary: 'ចូលរួមឥតគិតថ្លៃ',
    heroCtaSecondary: 'ស្វែងយល់បន្ថែម',
    trustedBy: 'ទទួលស្គាល់ និងប្រើប្រាស់ដោយស្ថាប័នអប់រំឈានមុខ',
    pricingTitle: 'កញ្ចប់តម្លៃច្បាស់លាស់ និងសមរម្យ។',
    pricingSub: 'សន្សំពេលវេលារៀបចំកិច្ចតែងការ និងគ្រប់គ្រងសាលារៀនរបស់អ្នក។',
    monthly: 'ប្រចាំខែ',
    annual: 'ប្រចាំឆ្នាំ (ចំណេញ ២០%)',
    perMonth: '/ខែ',
    plans: [
      { name: 'សម្រាប់គ្រូបង្រៀន', priceMonthly: 'ឥតគិតថ្លៃ', priceAnnual: 'ឥតគិតថ្លៃ', desc: 'សន្សំពេលវេលាស្រាវជ្រាវ និងបង្កើតឯកសារបង្រៀន។', feats: ['ឧបករណ៍ AI កិច្ចតែងការមិនកំណត់', 'ចូលប្រើប្រាស់បណ្តាញសិក្សាសង្គម Feed', 'កន្លែងរក្សាទុកឯកសារ Cloud', 'គំរូស្តង់ដារក្រសួងអប់រំ MoEYS'], cta: 'ចាប់ផ្តើមឥតគិតថ្លៃ', highlight: false },
      { name: 'សាលារៀន មូលដ្ឋាន', priceMonthly: '$29', priceAnnual: '$24', desc: 'សម្រាប់សាលារៀនដែលមានសិស្សដល់ ២០០ នាក់។', feats: ['មុខងារទាំងអស់ក្នុងកញ្ចប់គ្រូបង្រៀន', 'ប្រព័ន្ធពិន្ទុ និងវត្តមានស្វ័យប្រវត្តិ', 'ប្រព័ន្ធរៀបចំកាលវិភាគឆ្លាតវៃ', 'ទំនាក់ទំនងរវាងមាតាបិតា និងគ្រូ', 'របាយការណ៍ស្តង់ដារ MoEYS'], cta: 'សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ', highlight: true },
      { name: 'សាលារៀន Pro', priceMonthly: '$79', priceAnnual: '$64', desc: 'សម្រាប់ស្ថាប័នធំៗដែលត្រូវការប្រព័ន្ធវិភាគទិន្នន័យ។', feats: ['ចំនួនសិស្ស និងគ្រូមិនកំណត់', 'ប្រព័ន្ធវិភាគទិន្នន័យ AI កម្រិតខ្ពស់', 'ចេញវិញ្ញាបនបត្រស្វ័យប្រវត្តិ', 'ជំនួយបច្ចេកទេស ២៤ ម៉ោង', 'ការកំណត់សិទ្ធិសុវត្ថិភាពតាមតួនាទី'], cta: 'សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ', highlight: false },
    ],
  },
} satisfies Record<Lang, unknown>;

export default function HomePage() {
  const locale = useLocale();
  const lang: Lang = locale === 'km' ? 'km' : 'en';
  const c = T[lang];
  const isKm = lang === 'km';
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const fontBody = isKm ? "'Battambang', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  return (
    <div className="min-h-screen bg-white text-[#111827] antialiased" style={{ fontFamily: fontBody }}>

      {/* ══════════════════════════════════════════
          HERO AREA — full-width mint/green gradient
          NO container, NO border-radius, edge-to-edge
          ══════════════════════════════════════════ */}
      <div
        style={{
          background: 'linear-gradient(160deg, #d4f5e2 0%, #e8faf0 30%, #f2fdf7 55%, #e0f9ed 80%, #cff2e4 100%)',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {/* Decorative soft blobs — top right and center */}
        <div
          style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: '700px', height: '700px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(134,239,172,0.5) 0%, rgba(187,247,208,0.2) 50%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute', top: '30%', right: '15%',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(209,250,229,0.6) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Navbar ── */}
        <div style={{ position: 'relative', zIndex: 50 }}>
          <Navbar locale={locale} c={c} isKm={isKm} />
        </div>

        {/* ── Hero Content ── */}
        <div
          className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingTop: '48px',
            position: 'relative',
            zIndex: 10,
            minHeight: '540px',
          }}
        >
          {/* Left: Text & CTA */}
          <div style={{ flex: '0 0 48%', paddingBottom: '72px' }}>

            <h1
              style={{
                fontFamily: fontTitle,
                fontSize: isKm ? '2.75rem' : '3.25rem',
                fontWeight: 900,
                color: '#0d1117',
                lineHeight: isKm ? 1.5 : 1.15,
                marginBottom: '20px',
                letterSpacing: isKm ? '0' : '-0.02em',
              }}
            >
              {isKm ? (
                <>
                  ផ្លាស់ប្តូរវិស័យអប់រំ<br />
                  តាមរយៈ<span style={{ color: '#16a34a' }}>បណ្តាញសិក្សា</span>
                </>
              ) : (
                <>
                  Reimagine education,<br />
                  <span style={{ color: '#16a34a' }}>Simple solutions</span>
                </>
              )}
            </h1>

            <p
              style={{
                fontFamily: fontBody,
                fontSize: '14px',
                color: '#6b7280',
                lineHeight: 1.7,
                maxWidth: '380px',
                marginBottom: '36px',
              }}
            >
              {c.heroSub}
            </p>

            {/* CTA Buttons — matching screenshot exactly */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px', flexWrap: 'wrap' }}>
              <Link
                href={`/${locale}/register-school`}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '12px 24px',
                  background: '#0d1117',
                  color: '#fff',
                  borderRadius: '8px',
                  fontFamily: fontBody,
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
              >
                {c.heroCtaPrimary}
              </Link>
              <Link
                href="#features"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '12px 20px',
                  background: 'transparent',
                  color: '#374151',
                  borderRadius: '8px',
                  fontFamily: fontBody,
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: 'none',
                }}
              >
                {c.heroCtaSecondary}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </div>

            {/* Avatar stack + stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex' }}>
                {[
                  { bg: '#e0e7ff' },
                  { bg: '#fce7f3' },
                  { bg: '#d1fae5' },
                ].map((a, i) => (
                  <div
                    key={i}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      border: '2.5px solid white',
                      background: a.bg,
                      marginLeft: i === 0 ? '0' : '-10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px',
                    }}
                  >
                    {['👨‍🏫', '👩‍🎓', '🏫'][i]}
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontFamily: fontTitle, fontWeight: 900, fontSize: '18px', color: '#111827', margin: 0, lineHeight: 1.2 }}>
                  50k {isKm ? 'អ្នកប្រើប្រាស់' : 'Downloads'}
                </p>
                <p style={{ fontFamily: fontBody, fontSize: '11px', color: '#9ca3af', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {isKm
                    ? 'ជឿទុកចិត្តដោយស្ថាប័នអប់រំ\nឈានមុខជុំវិញប្រទេស'
                    : 'Trusted by hundreds of schools, our\nplatform services have made great impact\non people future.'}
                </p>
              </div>
            </div>

          </div>

          {/* Right: Phone Mockup — sits at bottom, overflows into white section below */}
          <div
            style={{
              flex: '0 0 52%',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
              paddingRight: '0',
              position: 'relative',
            }}
          >
            <HeroMockup isKm={isKm} />
          </div>
        </div>

        {/* ── Custom Notched Bottom Curve Overlay (Matching Reference Screenshot) ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', pointerEvents: 'none', zIndex: 20 }}>
          <svg
            viewBox="0 0 1440 60"
            fill="none"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '48px', display: 'block' }}
          >
            {/* White bottom fill under the notched curve */}
            <path
              d="M0 15 L480 15 C520 15 540 45 580 45 L1440 45 L1440 60 L0 60 Z"
              fill="#ffffff"
            />
            {/* Subtle mint stroke along the notched curve */}
            <path
              d="M0 15 L480 15 C520 15 540 45 580 45 L1440 45"
              fill="none"
              stroke="#a7f3d0"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>
      {/* ── END HERO AREA ── */}

      <main>
        {/* ── Brand Trust Badges ── */}
        <TrustBadges c={c} isKm={isKm} />

        {/* ── Feature Grid ── */}
        <FeatureGrid c={c} isKm={isKm} locale={locale} />

        {/* ── Multi-Device Mockup ── */}
        <MultiDeviceShowcase isKm={isKm} locale={locale} />

        {/* ── Web App Showcase (AI Tools) ── */}
        <WebPlatformShowcase isKm={isKm} locale={locale} />

        {/* ── Mobile App Features Steps ── */}
        <AppFeaturesSteps isKm={isKm} />

        {/* ── School OS Capabilities Grid ── */}
        <SchoolOSCapabilities isKm={isKm} />

        {/* ── Pricing ── */}
        <Pricing c={c} isKm={isKm} locale={locale} />
        
        {/* ── Blog Insights ── */}
        <BlogInsights isKm={isKm} locale={locale} />
        
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#111827] text-gray-400 py-16">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
            <img src="/Stunity.png" alt="Stunity" className="h-6 grayscale brightness-200" />
            <span className="font-bold text-white text-sm">Stunity</span>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Stunity Enterprise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
