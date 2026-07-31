import Link from 'next/link';

export function FeatureGrid({ c, isKm, locale }: { c: any, isKm: boolean, locale: string }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const fontBody = isKm ? "'Battambang', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  // ── Top 3-col cards ──
  const features = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
      titleKm: 'ភ្ជាប់សហគមន៍\nបណ្តាញសិក្សា',
      titleEn: 'Speed up\nyour learning',
      descKm: 'ចែករំលែកមេរៀន ភ្ជាប់ទំនាក់ទំនងរវាងសិស្ស គ្រូ និងសាលា ដោយរហ័ស និងមានប្រសិទ្ធភាព។',
      descEn: 'Share lesson plans and connect with teachers across the country seamlessly, with optimized throughput to ensure lightning-fast collaboration.',
      bg: '#f8fffe',
      accent: false,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
      titleKm: 'ឈានដល់\nអ្នករៀននៅទូទាំងប្រទេស',
      titleEn: 'National\nReach',
      descKm: 'ចូលប្រើប្រាស់ Stunity បានគ្រប់ទីកន្លែងក្នុងប្រទេស ដើម្បីពង្រីកបណ្តាញអប់រំ និងចែករំលែកចំណេះដឹង។',
      descEn: 'Reach educators and students across Cambodia. Expand your educational network with verified school connections and trusted contact data.',
      bg: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 100%)',
      accent: true,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      titleKm: 'ចុច\nចូលប្រើ Stunity',
      titleEn: 'Click\nAdd to Stunity',
      descKm: 'វាងាយស្រួលណាស់។ ពេលចុច "ចូលរួម Stunity" ព័ត៌មានរបស់សាលា និងគ្រូ នឹងត្រូវបានតភ្ជាប់ជាស្វ័យប្រវត្តិ។',
      descEn: 'It really is as simple as that. When you click "Add to Stunity" your school profile will be synced to our network automatically.',
      bg: '#f8fffe',
      accent: false,
    },
  ];

  // ── Bottom 2-col bento features ──
  const bentoFeatures = [
    {
      // LEFT — image card + "Preparing your future" badge
      type: 'image',
      image: '/images/school-community.jpg',
      badgeKm: 'រៀបចំអនាគតរបស់អ្នក',
      badgeEn: 'Preparing your future',
      titleKm: 'ការអប់រំឆ្លាតវៃ\nសម្រាប់ជំនាន់ថ្មី',
      titleEn: 'Smart Education\nfor the Next Generation',
      descKm: 'Stunity ភ្ជាប់សិស្ស គ្រូ និងសាលារៀន ដើម្បីបង្កើតបរិយាកាសសិក្សាដ៏ស្រស់ស្អាត និងមានប្រសិទ្ធភាព។',
      descEn: 'Stunity connects students, teachers, and schools to build a beautiful and effective learning environment.',
    },
    {
      // RIGHT — feature highlight card (dark)
      type: 'feature',
    },
  ];

  // Feature list for the right bento card
  const rightFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      ),
      titleKm: 'ប្រព័ន្ធ AI កិច្ចតែងការ',
      titleEn: 'AI Lesson Planner',
      descKm: 'បង្កើតមេរៀនស្របតាមស្តង់ដារ MoEYS ជាស្វ័យប្រវត្តិ ក្នុងពេលតែប៉ុន្មាននាទី។',
      descEn: 'Generate MoEYS-compliant lesson plans automatically in minutes with AI.',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
        </svg>
      ),
      titleKm: 'ប្រព័ន្ធគ្រប់គ្រងសាលា',
      titleEn: 'School OS',
      descKm: 'គ្រប់គ្រងវត្តមាន ពិន្ទុ និងការងារទាំងអស់ ជាមួយ dashboard ឆ្លាតវៃ។',
      descEn: 'Manage attendance, grades and all admin tasks with a smart dashboard.',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      titleKm: 'បណ្តាញសង្គមអប់រំ',
      titleEn: 'Academic Social Feed',
      descKm: 'ចែករំលែក Feed បង្រៀន ភ្ជាប់ជាមួយគ្រូ-សិស្សសរុប 50k+ ជុំវិញប្រទេស។',
      descEn: 'Share teaching posts, connect with 50k+ teachers & students nationwide.',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
      titleKm: 'វិភាគទិន្នន័យ AI',
      titleEn: 'AI Analytics',
      descKm: 'ទំនាយការរៀនសូត្ររបស់សិស្ស ហើយកែប្រែការបង្រៀនបានទាន់ពេល។',
      descEn: 'Predict student performance and adjust teaching approaches in real time.',
    },
  ];

  return (
    <section id="features" className="py-24 sm:py-32 bg-white relative">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20">

        {/* ── Section Header ── */}
        <div className="flex flex-col items-center text-center mb-14">
          <h2
            className={`font-bold text-[#111827] max-w-xl ${isKm ? 'text-3xl sm:text-4xl' : 'text-3xl sm:text-[2.5rem]'}`}
            style={{ fontFamily: fontTitle, lineHeight: isKm ? '1.6' : '1.3' }}
          >
            {isKm ? (
              <>ភ្ជាប់ការគ្រប់គ្រង<br />ការរៀន និងស្ថាប័នអប់រំ</>
            ) : (
              <>Integration to control your<br />learning and more</>
            )}
          </h2>
        </div>

        {/* ── Top: 3-Column Card Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {features.map((feat, i) => (
            <div
              key={i}
              className="rounded-[28px] p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group"
              style={{
                background: feat.bg,
                border: '1px solid rgba(0,0,0,0.06)',
                minHeight: '300px',
              }}
            >
              {/* Icon bubble */}
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300"
                style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 12px rgba(5,150,105,0.1)' }}
              >
                {feat.icon}
              </div>

              {/* Title */}
              <div>
                <h3
                  className={`font-bold text-[#111827] mb-3 ${isKm ? 'text-lg' : 'text-xl'}`}
                  style={{ fontFamily: fontTitle, whiteSpace: 'pre-line', lineHeight: isKm ? '1.6' : '1.35' }}
                >
                  {isKm ? feat.titleKm : feat.titleEn}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed" style={{ fontFamily: fontBody }}>
                  {isKm ? feat.descKm : feat.descEn}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom: 2-Column Bento Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* LEFT — Photo card */}
          <div
            className="rounded-[28px] overflow-hidden relative group"
            style={{ minHeight: '460px', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            {/* Background image */}
            <img
              src="/images/school-community.jpg"
              alt={isKm ? 'សហគមន៍អប់រំ Stunity' : 'Stunity Education Community'}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center top',
                position: 'absolute', inset: 0,
                transition: 'transform 0.6s ease',
              }}
              className="group-hover:scale-105"
            />
            {/* Subtle overlay */}
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.35) 100%)',
              }}
            />
            {/* Badge + text at bottom */}
            <div style={{ position: 'absolute', bottom: '28px', left: '28px', right: '28px' }}>
              <div
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '100px',
                  padding: '6px 16px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', fontFamily: fontBody }}>
                  {isKm ? 'រៀបចំអនាគតរបស់អ្នក' : 'Preparing your future'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT — Dark feature list card */}
          <div
            className="rounded-[28px] p-8 flex flex-col justify-between"
            style={{
              background: 'linear-gradient(145deg, #0f1923 0%, #111827 60%, #0d1f15 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              minHeight: '460px',
            }}
          >
            {/* Header */}
            <div className="mb-8">
              <div
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(52,211,153,0.15)',
                  borderRadius: '100px', padding: '5px 14px', marginBottom: '16px',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: fontBody }}>
                  {isKm ? 'មុខងារគន្លឹះ' : 'Key Features'}
                </span>
              </div>
              <h3
                style={{
                  fontFamily: fontTitle,
                  fontSize: isKm ? '1.6rem' : '1.75rem',
                  fontWeight: 800,
                  color: 'white',
                  lineHeight: isKm ? 1.6 : 1.25,
                  margin: 0,
                }}
              >
                {isKm ? (
                  <>មុខងារដែលធ្វើ<br /><span style={{ color: '#34d399' }}>ការអប់រំ</span> ខុសប្លែក</>
                ) : (
                  <>Features that make<br /><span style={{ color: '#34d399' }}>Education</span> different</>
                )}
              </h3>
            </div>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              {rightFeatures.map((feat, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '16px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'background 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                >
                  {/* Icon circle */}
                  <div
                    style={{
                      width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                      background: 'rgba(52,211,153,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {feat.icon}
                  </div>
                  <div>
                    <p style={{ fontFamily: fontTitle, fontWeight: 700, fontSize: '14px', color: 'white', margin: '0 0 3px' }}>
                      {isKm ? feat.titleKm : feat.titleEn}
                    </p>
                    <p style={{ fontFamily: fontBody, fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>
                      {isKm ? feat.descKm : feat.descEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ marginTop: '24px' }}>
              <Link
                href={`/${locale}/register-school`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: '#34d399', color: '#0d1117',
                  padding: '12px 24px', borderRadius: '12px',
                  fontFamily: fontBody, fontWeight: 800, fontSize: '14px',
                  textDecoration: 'none', transition: 'opacity 0.2s',
                }}
              >
                {isKm ? 'ចាប់ផ្តើមឥតគិតថ្លៃ' : 'Get Started Free'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>

        </div>
        {/* ── End 2-col bento ── */}

      </div>
    </section>
  );
}
