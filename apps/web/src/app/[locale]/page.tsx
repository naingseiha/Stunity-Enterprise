import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { use } from "react";
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function HomePage(props: { params: Promise<{ locale: string }> }) {
    const autoT = useTranslations();
  const params = use(props.params);

  const {
    locale
  } = params;

  const t = useTranslations('landing');
  const tc = useTranslations('common');

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      {/* Top bar – same horizontal spacing as feed nav (max-w-7xl, px-4 sm:px-6) */}
      <header className="flex-shrink-0 h-14 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <img src="/Stunity.png" alt={autoT("auto.web.app_locale_page.k_d3f3cf01")} className="h-8 w-auto" />
            <span className="text-slate-600 font-medium text-sm hidden sm:inline"><AutoI18nText i18nKey="auto.web.app_locale_page.k_ccd6f18d" /></span>
          </Link>
          <nav className="flex items-center gap-1">
          <Link
            href={`/${locale}/auth/login`}
            className="px-3 py-2 text-slate-500 hover:text-slate-900 dark:text-white text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 transition-colors"
          >
            {t('hero.ctaLogin')}
          </Link>
          <Link
            href={`/${locale}/register-school`}
            className="px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
          >
            {t('hero.ctaRegister')}
          </Link>
        </nav>
        </div>
      </header>

      {/* Main – centered, no scroll */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <img
          src="/Stunity.png"
          alt=""
          className="h-14 w-auto mb-8 opacity-95"
          aria-hidden
        />
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white text-center tracking-tight max-w-md">
          {t('hero.title')}
        </h1>
        <p className="text-slate-500 text-sm sm:text-base text-center mt-3 max-w-sm">
          {t('hero.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Link
            href={`/${locale}/auth/login`}
            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors text-center"
          >
            {t('hero.ctaLogin')}
          </Link>
          <Link
            href={`/${locale}/register-school`}
            className="px-6 py-2.5 text-slate-700 dark:text-gray-200 text-sm font-medium rounded-lg border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 hover:border-slate-300 dark:border-gray-700 transition-colors text-center"
          >
            {t('hero.ctaRegister')}
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-400 text-center max-w-xs">
          {t('hero.ctaHint')}
        </p>
      </main>

      {/* Footer – same viewport */}
      <footer className="flex-shrink-0 py-3 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {tc('appName')}
      </footer>
    </div>
  );
}
