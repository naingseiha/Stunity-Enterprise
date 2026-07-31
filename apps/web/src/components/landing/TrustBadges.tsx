'use client';

export function TrustBadges({ c, isKm }: { c: any, isKm: boolean }) {
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const fontBody = isKm ? "'Battambang', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const partners = [
    {
      name: isKm ? 'MoEYS' : 'MoEYS',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="9" height="9" rx="2" fill="#1a56db"/>
          <rect x="13" y="2" width="9" height="9" rx="2" fill="#1a56db" opacity="0.5"/>
          <rect x="2" y="13" width="9" height="9" rx="2" fill="#1a56db" opacity="0.5"/>
          <rect x="13" y="13" width="9" height="9" rx="2" fill="#1a56db" opacity="0.25"/>
        </svg>
      ),
    },
    {
      name: isKm ? 'បាក់ទូក' : 'Bak Touk',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#ff5a5f" opacity="0.12"/>
          <path d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z" fill="#ff5a5f" opacity="0.35"/>
          <circle cx="12" cy="12" r="3" fill="#ff5a5f"/>
        </svg>
      ),
    },
    {
      name: isKm ? 'សិសុវត្ថ' : 'Sisowath',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M5 3h14M5 3l-2 7h18L19 3M3 10l2 11h14l2-11" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 14h6M10 17h4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      name: isKm ? 'EdTech Cam' : 'EdTech Cam',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="13" rx="2.5" stroke="#374151" strokeWidth="1.5" fill="none"/>
          <path d="M8 22h8M12 17v5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M9 9l2 2 4-4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      name: isKm ? 'ឥន្ទ្រទេវី' : 'Indradevi',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#374151" strokeWidth="1.5" fill="none"/>
          <line x1="2" y1="12" x2="22" y2="12" stroke="#374151" strokeWidth="1.5"/>
          <path d="M12 2a15 15 0 0 1 0 20" stroke="#374151" strokeWidth="1.5" fill="none"/>
          <path d="M12 2a15 15 0 0 0 0 20" stroke="#374151" strokeWidth="1.5" fill="none"/>
        </svg>
      ),
    },
    {
      name: isKm ? 'RUPP' : 'RUPP',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 21h18" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M5 21V11l7-8 7 8v10" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="9" y="14" width="6" height="7" rx="1" stroke="#374151" strokeWidth="1.5"/>
        </svg>
      ),
    },
  ];

  // Doubled for seamless infinite marquee loop
  const doubled = [...partners, ...partners];

  return (
    <section className="w-full bg-white relative">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20 py-7 sm:py-9">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
          
          {/* Left Column: Koulen Title + Vertical Divider */}
          <div className="shrink-0 md:max-w-xs border-b md:border-b-0 md:border-r border-gray-200/80 pb-3 md:pb-0 md:pr-8">
            <h3
              className="text-sm sm:text-base font-bold text-gray-800 uppercase tracking-wide leading-snug"
              style={{ fontFamily: fontTitle }}
            >
              {isKm ? 'ដៃគូស្ថាប័នអប់រំដែលជឿទុកចិត្ត' : 'TRUSTED BY EDUCATIONAL INSTITUTIONS'}
            </h3>
          </div>

          {/* Right Column: Marquee Logos Row */}
          <div 
            className="flex-1 overflow-hidden relative"
            style={{
              maskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
            }}
          >
            <div className="animate-marquee flex items-center gap-10">
              {doubled.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-default"
                >
                  {p.icon}
                  <span
                    className="text-sm font-bold text-gray-800 whitespace-nowrap"
                    style={{ fontFamily: fontBody }}
                  >
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom 1px Border Line */}
      <div className="w-full h-[1px] bg-gray-200/80" />
    </section>
  );
}
