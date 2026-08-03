'use client';

export function HeroMockup({ isKm }: { isKm: boolean }) {
  return (
    /*
     * The phone sits at the RIGHT of the hero, bottom-aligned.
     * It overflows BELOW the green hero background into the white section.
     * Floating cards appear OUTSIDE the phone frame, overlapping both phone + background.
     */
    <div
      style={{
        position: 'relative',
        width: '420px',
        height: '620px',
        marginBottom: '-80px', // makes phone overflow below hero into white section
        flexShrink: 0,
      }}
    >

      {/* ═══════════════════════════════
          Main Phone Frame
          ═══════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          right: '20px',
          bottom: '0',
          width: '300px',
          height: '590px',
          borderRadius: '44px',
          background: '#0f0f14',
          padding: '10px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06) inset',
          zIndex: 10,
        }}
      >
        {/* Dynamic Island */}
        <div
          style={{
            position: 'absolute',
            top: '14px', left: '50%',
            transform: 'translateX(-50%)',
            width: '100px', height: '30px',
            borderRadius: '20px',
            background: '#000',
            zIndex: 30,
          }}
        />

        {/* Phone Screen */}
        <div
          style={{
            width: '100%', height: '100%',
            borderRadius: '34px',
            overflow: 'hidden',
            background: 'linear-gradient(175deg, #dff7ff 0%, #eefaff 30%, #f7fcff 60%, #fff1e7 100%)',
            position: 'relative',
          }}
        >
          {/* Status bar spacer */}
          <div style={{ height: '52px' }} />

          {/* Screen content */}
          <div style={{ padding: '0 16px 16px' }}>

            {/* Top label */}
            <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 4px', fontWeight: 500 }}>
              {isKm ? 'អត្រាវត្តមានឆ្នាំសិក្សានេះ' : 'Attendance this academic year'}
            </p>

            {/* Big percentage */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#111827', margin: 0, lineHeight: 1 }}>
                94.3%
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0284C7"><path d="M12 20l-8-8h5V4h6v8h5l-8 8z" transform="scale(1,-1) translate(0,-24)"/></svg>
              <span style={{ fontSize: '10px', color: '#0284C7', fontWeight: 700 }}>+2.3%</span>
            </div>

            {/* Chart */}
            <div
              style={{
                background: 'rgba(255,255,255,0.75)',
                borderRadius: '16px',
                padding: '12px 12px 8px',
                marginBottom: '12px',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Line chart visual */}
              <div style={{ position: 'relative', height: '60px', marginBottom: '6px' }}>
                <svg viewBox="0 0 240 60" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  {/* Brand-blue area */}
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.02"/>
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,45 C20,40 40,50 60,38 C80,26 100,30 120,20 C140,10 160,25 180,18 C200,11 220,8 240,5 L240,60 L0,60 Z"
                    fill="url(#areaGrad)"
                  />
                  <path
                    d="M0,45 C20,40 40,50 60,38 C80,26 100,30 120,20 C140,10 160,25 180,18 C200,11 220,8 240,5"
                    fill="none"
                    stroke="#0EA5E9"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* Orange accent dot */}
                  <circle cx="130" cy="19" r="3.5" fill="#f97316"/>
                </svg>
              </div>
              {/* X-axis labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {['ស.រ', 'ម.ក', 'ក.ដ', 'ម.ស', 'ម.ថ'].map((m, i) => (
                  <span key={i} style={{ fontSize: '8px', color: '#9ca3af' }}>{m}</span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ═══════════════════════════════
          Floating card LEFT — Spending Summary
          Positioned overlapping phone left side
          ═══════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          left: '0px',
          bottom: '180px',
          width: '170px',
          background: 'white',
          borderRadius: '16px',
          padding: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#374151' }}>
            {isKm ? 'ថ្នាក់បានកត់វត្តមាន' : 'Classes Marked'}
          </span>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="3"><path d="M5 12h14"/></svg>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ width: '100%', height: '5px', background: '#f3f4f6', borderRadius: '99px', marginBottom: '10px', overflow: 'hidden' }}>
          <div style={{ width: '85%', height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #0284C7, #09CFF7)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontSize: '9px', color: '#9ca3af', margin: '0 0 2px' }}>{isKm ? 'បានបញ្ចប់' : 'Completed'}</p>
            <p style={{ fontSize: '13px', fontWeight: 900, color: '#111827', margin: 0 }}>28 / 33</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════
          Floating card RIGHT — Total Income + Transaction History
          Positioned overlapping phone right side, coming out
          ═══════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          right: '-30px',
          bottom: '60px',
          width: '230px',
          background: 'white',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
          zIndex: 25,
        }}
      >
        {/* Total Income */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 500 }}>
            {isKm ? 'សិស្សសកម្ម' : 'Active Students'}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
        </div>
        <p style={{ fontSize: '20px', fontWeight: 900, color: '#111827', margin: '0 0 2px', lineHeight: 1.2 }}>1,705</p>
        <p style={{ fontSize: '9px', color: '#9ca3af', margin: '0 0 14px' }}>
          {isKm ? 'ឆ្នាំសិក្សា ២០២៦–២០២៧' : 'Academic year 2026–2027'}
        </p>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #f3f4f6', marginBottom: '10px' }} />

        {/* Transaction History label */}
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
          {isKm ? 'សកម្មភាពថ្មីៗ' : 'Recent Activity'}
        </p>

        {/* All Transaction label */}
        <p style={{ fontSize: '10px', fontWeight: 700, color: '#374151', margin: '0 0 10px' }}>
          {isKm ? 'ការអាប់ដេតសាលា' : 'School Updates'}
        </p>

        {/* Transaction items */}
        {[
          { initials: '12A', name: isKm ? 'វត្តមានថ្នាក់ ១២A' : 'Grade 12A attendance', sub: isKm ? 'បានកត់ត្រា' : 'Recorded', amount: '96%', color: '#0284C7' },
          { initials: '10B', name: isKm ? 'ពិន្ទុថ្នាក់ ១០B' : 'Grade 10B scores', sub: isKm ? 'បានធ្វើបច្ចុប្បន្នភាព' : 'Updated', amount: 'Done', color: '#F97316' },
        ].map((tx, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: i === 0 ? '8px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: tx.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 800, color: 'white',
                }}
              >
                {tx.initials}
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#111827', margin: 0 }}>{tx.name}</p>
                <p style={{ fontSize: '8px', color: '#9ca3af', margin: 0 }}>{tx.sub}</p>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284C7' }}>{tx.amount}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
