'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';

type Lang = 'en' | 'km';

export function Navbar({ locale, c, isKm }: { locale: string; c: any; isKm: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang: Lang = isKm ? 'km' : 'en';
  const [menuOpen, setMenuOpen] = useState(false);
  const fontBody = isKm ? "'Battambang', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const switchLanguage = (newLang: Lang) => {
    if (newLang === lang) return;
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    const currentPath = pathname || `/${locale}`;
    const newPath = currentPath.replace(/^\/(en|km)/, `/${newLang}`);
    const query = searchParams?.toString();
    router.push(query ? `${newPath}?${query}` : newPath);
  };

  return (
    <header style={{ width: '100%', position: 'relative', zIndex: 50 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '20px 48px',
          fontFamily: fontBody,
        }}
      >
        {/* Logo */}
        <Link
          href={`/${locale}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
        >
          <img src="/Stunity.png" alt="Stunity" style={{ height: '22px', width: 'auto', filter: 'brightness(0)' }} />
          <span style={{ fontWeight: 900, fontSize: '15px', color: '#111827', letterSpacing: '-0.01em' }}>
            STUNITY.™
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { href: '#features', label: c.nav.tools },
            { href: '#social', label: c.nav.social },
            { href: '#schools', label: c.nav.schools },
            { href: '#pricing', label: c.nav.pricing },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '6px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.label}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#9ca3af">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </a>
          ))}
          <a
            href="#enterprise"
            style={{
              padding: '8px 16px', fontSize: '13px', fontWeight: 600,
              color: '#374151', textDecoration: 'none', borderRadius: '6px',
            }}
          >
            {isKm ? 'សហគ្រាស' : 'Enterprise'}
          </a>
          <a
            href="#contact"
            style={{
              padding: '8px 16px', fontSize: '13px', fontWeight: 600,
              color: '#374151', textDecoration: 'none', borderRadius: '6px',
            }}
          >
            {isKm ? 'ទំនាក់ទំនង' : 'Contact us'}
          </a>
        </nav>

        {/* Right: Language + Login + Join */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Language toggle */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.06)', borderRadius: '6px', padding: '2px' }}>
            <button
              onClick={() => switchLanguage('en')}
              style={{
                padding: '5px 12px', fontSize: '11px', fontWeight: 700,
                borderRadius: '4px', border: 'none', cursor: 'pointer',
                background: !isKm ? 'white' : 'transparent',
                color: '#374151',
                boxShadow: !isKm ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >EN</button>
            <button
              onClick={() => switchLanguage('km')}
              style={{
                padding: '5px 12px', fontSize: '11px', fontWeight: 700,
                borderRadius: '4px', border: 'none', cursor: 'pointer',
                background: isKm ? 'white' : 'transparent',
                color: '#374151',
                boxShadow: isKm ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >KM</button>
          </div>

          {/* Login button */}
          <Link
            href={`/${locale}/auth/login`}
            style={{
              padding: '9px 20px',
              fontSize: '13px', fontWeight: 600,
              color: '#374151', textDecoration: 'none',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(0,0,0,0.1)',
              transition: 'background 0.15s',
            }}
          >
            {c.login}
          </Link>

          {/* Join button — dark pill */}
          <Link
            href={`/${locale}/register-school`}
            style={{
              padding: '9px 20px',
              fontSize: '13px', fontWeight: 700,
              color: '#ffffff', textDecoration: 'none',
              borderRadius: '8px',
              background: '#111827',
              transition: 'opacity 0.15s',
            }}
          >
            {isKm ? 'ចុះឈ្មោះ' : 'Join'}
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ display: 'none', padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
            className="md-hidden-show"
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute', top: '100%', left: '16px', right: '16px',
            background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)',
            borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)',
            padding: '24px', zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { href: '#features', label: c.nav.tools },
              { href: '#social', label: c.nav.social },
              { href: '#schools', label: c.nav.schools },
              { href: '#pricing', label: c.nav.pricing },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{ fontSize: '14px', fontWeight: 600, color: '#374151', textDecoration: 'none' }}
              >
                {item.label}
              </a>
            ))}
            <Link
              href={`/${locale}/auth/login`}
              style={{
                textAlign: 'center', padding: '12px', borderRadius: '10px',
                background: '#f3f4f6', fontSize: '14px', fontWeight: 700,
                color: '#111827', textDecoration: 'none',
              }}
            >
              {c.login}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
