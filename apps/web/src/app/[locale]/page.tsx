'use client';

import { useLocale } from 'next-intl';
import { Navbar } from '@/components/landing/Navbar';
import { HeroMockup } from '@/components/landing/HeroMockup';
import { AppOverviewShowcase } from '@/components/landing/AppOverviewShowcase';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { TrustBadges } from '@/components/landing/TrustBadges';
import { MultiDeviceShowcase } from '@/components/landing/MultiDeviceShowcase';
import { WebPlatformShowcase } from '@/components/landing/WebPlatformShowcase';
import { AppFeaturesSteps } from '@/components/landing/AppFeaturesSteps';
import { SchoolOSCapabilities } from '@/components/landing/SchoolOSCapabilities';
import { BlogInsights } from '@/components/landing/BlogInsights';
import { Pricing } from '@/components/landing/Pricing';
import { Footer } from '@/components/landing/Footer';
import Link from 'next/link';

type Lang = 'en' | 'km';

const T = {
  en: {
    nav: { tools: 'Features', social: 'Learning Community', schools: 'For Schools', pricing: 'Get Started' },
    login: 'Log in',
    getStarted: 'Get Started',
    heroTitle: 'Your school,\nall connected',
    heroSub:
      'A connected platform for multi-school and multi-academic-year operations, teaching, communication, and learning—on web and mobile.',
    heroCtaPrimary: 'Register Your School',
    heroCtaSecondary: 'Explore Platform',
    trustedBy: 'BUILT FOR CAMBODIAN EDUCATION WORKFLOWS',
    pricingTitle: 'Choose how your institution gets started.',
    pricingSub: 'Create an account yourself, register a school online, or onboard a multi-school organization with our team.',
    monthly: 'Monthly',
    annual: 'Annual (Save 20%)',
    perMonth: '',
    plans: [
      { name: 'Individual Access', priceMonthly: 'Self-service', priceAnnual: 'Self-service', desc: 'For teachers, students, and education community members.', feats: ['Academic social feed', 'Courses, quizzes, and learning activities', 'Clubs and community participation', 'Web and mobile access'], cta: 'Create an Account', highlight: false },
      { name: 'Single School', priceMonthly: 'Register online', priceAnnual: 'Register online', desc: 'For one school ready to manage its operations digitally.', feats: ['Academic years, terms, classes, and subjects', 'Admissions, students, teachers, and timetables', 'Attendance, grades, and MoEYS reports', 'Parent communication and notifications'], cta: 'Register Your School', highlight: true },
      { name: 'Multi-School Enterprise', priceMonthly: 'Custom setup', priceAnnual: 'Custom setup', desc: 'For organizations operating multiple schools or campuses.', feats: ['Multiple schools in one organization', 'Role-based access and audit history', 'Student history, promotion, and transfers', 'Guided onboarding and deployment support'], cta: 'Request Onboarding', highlight: false },
    ],
  },
  km: {
    nav: { tools: 'មុខងារ', social: 'សហគមន៍សិក្សា', schools: 'សម្រាប់សាលារៀន', pricing: 'ចាប់ផ្តើម' },
    login: 'ចូលគណនី',
    getStarted: 'ចាប់ផ្តើម',
    heroTitle: 'សាលារបស់អ្នក\nភ្ជាប់គ្រប់ផ្នែក',
    heroSub:
      'ប្រព័ន្ធតែមួយសម្រាប់គ្រប់គ្រងសាលាច្រើន ឆ្នាំសិក្សាច្រើន ការបង្រៀន ទំនាក់ទំនង និងការសិក្សា ទាំងលើ Web និង Mobile។',
    heroCtaPrimary: 'ចុះឈ្មោះសាលា',
    heroCtaSecondary: 'ស្វែងយល់បន្ថែម',
    trustedBy: 'បង្កើតឡើងសម្រាប់ដំណើរការអប់រំនៅកម្ពុជា',
    pricingTitle: 'ជ្រើសរើសវិធីចាប់ផ្តើមដែលសមនឹងស្ថាប័នរបស់អ្នក។',
    pricingSub: 'បង្កើតគណនីដោយខ្លួនឯង ចុះឈ្មោះសាលាតាមអនឡាញ ឬរៀបចំអង្គភាពពហុសាលាជាមួយក្រុមការងាររបស់យើង។',
    monthly: 'ប្រចាំខែ',
    annual: 'ប្រចាំឆ្នាំ (ចំណេញ ២០%)',
    perMonth: '',
    plans: [
      { name: 'គណនីបុគ្គល', priceMonthly: 'ចុះឈ្មោះដោយខ្លួនឯង', priceAnnual: 'ចុះឈ្មោះដោយខ្លួនឯង', desc: 'សម្រាប់គ្រូ សិស្ស និងសមាជិកសហគមន៍អប់រំ។', feats: ['បណ្តាញសង្គមអប់រំ', 'វគ្គសិក្សា កម្រងសំណួរ និងសកម្មភាពសិក្សា', 'ក្លឹប និងការចូលរួមសហគមន៍', 'ប្រើបានលើ Web និង Mobile'], cta: 'បង្កើតគណនី', highlight: false },
      { name: 'សាលារៀនតែមួយ', priceMonthly: 'ចុះឈ្មោះអនឡាញ', priceAnnual: 'ចុះឈ្មោះអនឡាញ', desc: 'សម្រាប់សាលាមួយដែលចង់ឌីជីថលភាវូបនីយកម្មការងារប្រចាំថ្ងៃ។', feats: ['ឆ្នាំសិក្សា ឆមាស ថ្នាក់ និងមុខវិជ្ជា', 'ការចុះឈ្មោះសិស្ស គ្រូ និងកាលវិភាគ', 'វត្តមាន ពិន្ទុ និងរបាយការណ៍ MoEYS', 'ទំនាក់ទំនងមាតាបិតា និងការជូនដំណឹង'], cta: 'ចុះឈ្មោះសាលា', highlight: true },
      { name: 'អង្គភាពពហុសាលា', priceMonthly: 'រៀបចំតាមតម្រូវការ', priceAnnual: 'រៀបចំតាមតម្រូវការ', desc: 'សម្រាប់អង្គភាពដែលគ្រប់គ្រងសាលា ឬសាខាច្រើន។', feats: ['គ្រប់គ្រងសាលាច្រើនក្នុងអង្គភាពតែមួយ', 'សិទ្ធិតាមតួនាទី និងប្រវត្តិសវនកម្ម', 'ប្រវត្តិសិស្ស ឡើងថ្នាក់ និងផ្ទេរសាលា', 'ការណែនាំដំឡើង និងចាប់ផ្តើមប្រើប្រាស់'], cta: 'ស្នើសុំការណែនាំ', highlight: false },
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
          background: 'linear-gradient(160deg, #dff7ff 0%, #ecfaff 30%, #f7fcff 55%, #e8f7ff 80%, #fff3e8 100%)',
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
            background: 'radial-gradient(ellipse, rgba(9,207,247,0.32) 0%, rgba(186,230,253,0.2) 50%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute', top: '30%', right: '15%',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 70%)',
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
                  សាលារបស់អ្នក<br />
                  <span style={{ color: '#0284C7' }}>ភ្ជាប់គ្រប់ផ្នែក</span>
                </>
              ) : (
                <>
                  Your school,<br />
                  <span style={{ color: '#0284C7' }}>all connected</span>
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

            {/* CTA Buttons — standardized fully rounded pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px', flexWrap: 'wrap' }}>
              <Link
                href={`/${locale}/register-school`}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '12px 26px',
                  background: '#0284C7',
                  color: '#fff',
                  borderRadius: '9999px',
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
                  borderRadius: '9999px',
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
                  {isKm ? 'Web + Mobile' : 'Web + Mobile'}
                </p>
                <p style={{ fontFamily: fontBody, fontSize: '11px', color: '#9ca3af', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {isKm
                    ? 'ពហុសាលា · ពហុឆ្នាំសិក្សា · ខ្មែរ និងអង់គ្លេស'
                    : 'Multi-school · Multi-year · Khmer and English'}
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
              stroke="#bae6fd"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>
      {/* ── END HERO AREA ── */}

      <main>
        {/* ── Brand Trust Badges ── */}
        <TrustBadges c={c} isKm={isKm} />

        {/* ── App Overview Showcase (All App Features) ── */}
        <AppOverviewShowcase isKm={isKm} />

        {/* ── Feature Grid (Integration to control learning) ── */}
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

      {/* ── Creative Enterprise Footer ── */}
      <Footer locale={locale} isKm={isKm} />
    </div>
  );
}
