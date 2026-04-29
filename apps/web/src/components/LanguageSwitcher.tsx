'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

type SupportedLocale = 'en' | 'km';

interface LanguageOption {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
}

const LOCALE_PATH_PATTERN = /^\/(en|km)(?=\/|$)/;

const toLocalePath = (path: string, newLocale: SupportedLocale) => {
  if (!path || path === '/') return `/${newLocale}`;
  if (LOCALE_PATH_PATTERN.test(path)) {
    return path.replace(LOCALE_PATH_PATTERN, `/${newLocale}`);
  }
  return `/${newLocale}${path.startsWith('/') ? path : `/${path}`}`;
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLocale: SupportedLocale = locale === 'km' ? 'km' : 'en';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLocale = (newLocale: SupportedLocale) => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    // Set cookie for next-intl middleware persistence
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    const localizedPath = toLocalePath(pathname || '/', newLocale);
    const queryString = searchParams?.toString();
    router.push(queryString ? `${localizedPath}?${queryString}` : localizedPath);
    setIsOpen(false);
  };

  const languages: LanguageOption[] = [
    { code: 'en', name: t('english'), nativeName: 'English', flag: '🇺🇸' },
    { code: 'km', name: t('khmer'), nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === currentLocale) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        title={t('language')}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{currentLanguage.flag}</span>
        <span className="hidden md:inline text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-300">
          {currentLocale.toUpperCase()}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                currentLocale === lang.code ? 'bg-blue-50 dark:bg-blue-950/40' : ''
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${
                  currentLocale === lang.code ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'
                }`}>
                  {lang.nativeName}
                </span>
                {lang.nativeName !== lang.name && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{lang.name}</span>
                )}
              </div>
              {currentLocale === lang.code && (
                <span className="ml-auto text-blue-600 dark:text-blue-300">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
