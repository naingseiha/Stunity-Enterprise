'use client';

export function TrustBadges({ c, isKm }: { c: any, isKm: boolean }) {
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
    <section
      style={{
        width: '100%',
        background: 'white',
        position: 'relative',
      }}
    >
      {/* ── TOP LINE ── */}
      <div
        style={{
          width: '100%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, #d1fae5 10%, #6ee7b7 30%, #34d399 50%, #6ee7b7 70%, #d1fae5 90%, transparent 100%)',
        }}
      />

      {/* ── CONTENT ── */}
      <div style={{ padding: '32px 0' }}>

        {/* Label */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 600,
            color: '#b0b8c1',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: fontBody,
            marginBottom: '24px',
          }}
        >
          {isKm
            ? 'ដៃគូស្ថាប័នអប់រំដែលជឿទុកចិត្ត'
            : 'TRUSTED BY EDUCATIONAL INSTITUTIONS'}
        </p>

        {/* Scrolling marquee row */}
        <div
          style={{
            overflow: 'hidden',
            position: 'relative',
            // Fade out edges
            maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
          }}
        >
          <div
            className="animate-marquee"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            {doubled.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '0 40px',
                  flexShrink: 0,
                  borderRight: '1px solid #f0f4f0',
                  opacity: 0.55,
                  transition: 'opacity 0.25s',
                  cursor: 'default',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.opacity = '1')}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.opacity = '0.55')}
              >
                {p.icon}
                <span
                  style={{
                    fontFamily: fontBody,
                    fontWeight: 700,
                    fontSize: '15px',
                    color: '#1f2937',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── BOTTOM LINE ── */}
      <div
        style={{
          width: '100%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, #d1fae5 10%, #6ee7b7 30%, #34d399 50%, #6ee7b7 70%, #d1fae5 90%, transparent 100%)',
        }}
      />

    </section>
  );
}
