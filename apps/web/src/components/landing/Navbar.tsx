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
  const fontTitle = isKm ? "'Koulen', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const fontBody = isKm ? "'Battambang', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const switchLanguage = (newLang: Lang) => {
    if (newLang === lang) return;
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    const currentPath = pathname || `/${locale}`;
    const newPath = currentPath.replace(/^\/(en|km)/, `/${newLang}`);
    const query = searchParams?.toString();
    router.push(query ? `${newPath}?${query}` : newPath);
  };

  const navLinks = [
    { href: '#features', label: c.nav.tools },
    { href: '#social', label: c.nav.social },
    { href: `/${locale}/discover`, label: c.nav.schools },
    { href: '#pricing', label: c.nav.pricing },
  ];

  return (
    <header className="w-full relative z-50">
      <div 
        className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 xl:px-20 py-6 flex items-center justify-between"
        style={{ fontFamily: fontBody }}
      >
        {/* Logo — Original color preserved */}
        <Link
          href={`/${locale}`}
          className="flex items-center transition-opacity hover:opacity-85"
          aria-label="Stunity"
        >
          <img 
            src="/Stunity.png" 
            alt="Stunity" 
            className="h-8 sm:h-9 w-auto object-contain" 
          />
        </Link>

        {/* Center Desktop Navigation — Uses Koulen font for Khmer menu title */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            item.href.startsWith('/') ? (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-gray-950 transition-colors tracking-wide"
                style={{ fontFamily: fontTitle, fontSize: isKm ? '15px' : '13px' }}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-gray-950 transition-colors tracking-wide"
                style={{ fontFamily: fontTitle, fontSize: isKm ? '15px' : '13px' }}
              >
                {item.label}
              </a>
            )
          ))}
          <a
            href="#enterprise"
            className="text-sm font-medium text-gray-700 hover:text-gray-950 transition-colors tracking-wide"
            style={{ fontFamily: fontTitle, fontSize: isKm ? '15px' : '13px' }}
          >
            {isKm ? 'សហគ្រាស' : 'Enterprise'}
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-gray-700 hover:text-gray-950 transition-colors tracking-wide"
            style={{ fontFamily: fontTitle, fontSize: isKm ? '15px' : '13px' }}
          >
            {isKm ? 'ទំនាក់ទំនង' : 'Contact'}
          </a>
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-4">

          {/* Minimalist Language Switcher */}
          <div className="flex items-center bg-black/5 backdrop-blur-md p-1 rounded-full text-xs font-semibold">
            <button
              type="button"
              onClick={() => switchLanguage('en')}
              className={`px-3 py-1 rounded-full transition-all duration-200 text-[11px] ${
                !isKm 
                  ? 'bg-white text-gray-900 shadow-sm font-bold' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => switchLanguage('km')}
              className={`px-3 py-1 rounded-full transition-all duration-200 text-[11px] ${
                isKm 
                  ? 'bg-white text-gray-900 shadow-sm font-bold' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              KM
            </button>
          </div>

          {/* Log in link */}
          <Link
            href={`/${locale}/auth/login`}
            className="hidden sm:inline-block text-xs sm:text-[13px] font-semibold text-gray-700 hover:text-gray-950 transition-colors px-2 py-1"
            style={{ fontFamily: fontBody }}
          >
            {c.login}
          </Link>

          {/* Primary Join Button — Dark Pill */}
          <Link
            href={`/${locale}/register-school`}
            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-full shadow-sm hover:shadow transition-all duration-200"
            style={{ fontFamily: fontBody }}
          >
            {isKm ? 'ចុះឈ្មោះ' : 'Join'}
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 text-gray-800 hover:text-black transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden mx-6 sm:mx-10 bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-100 p-6 shadow-xl space-y-4 relative z-50">
          <div className="flex flex-col space-y-3">
            {navLinks.map((item) => (
              item.href.startsWith('/') ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-base font-medium text-gray-800 hover:text-black py-1"
                  style={{ fontFamily: fontTitle }}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-base font-medium text-gray-800 hover:text-black py-1"
                  style={{ fontFamily: fontTitle }}
                >
                  {item.label}
                </a>
              )
            ))}
            <a
              href="#enterprise"
              onClick={() => setMenuOpen(false)}
              className="text-base font-medium text-gray-800 hover:text-black py-1"
              style={{ fontFamily: fontTitle }}
            >
              {isKm ? 'សហគ្រាស' : 'Enterprise'}
            </a>
            <a
              href="#contact"
              onClick={() => setMenuOpen(false)}
              className="text-base font-medium text-gray-800 hover:text-black py-1"
              style={{ fontFamily: fontTitle }}
            >
              {isKm ? 'ទំនាក់ទំនង' : 'Contact'}
            </a>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
            <Link
              href={`/${locale}/auth/login`}
              onClick={() => setMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-gray-800 bg-gray-100/70 rounded-full"
              style={{ fontFamily: fontBody }}
            >
              {c.login}
            </Link>
            <Link
              href={`/${locale}/register-school`}
              onClick={() => setMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-full"
              style={{ fontFamily: fontBody }}
            >
              {isKm ? 'ចុះឈ្មោះ' : 'Join'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
