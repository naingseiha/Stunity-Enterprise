'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
  };

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg px-4 py-2">
      <Globe className="w-4 h-4 text-stunity-primary-600" />
      <button
        onClick={() => switchLocale('en')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          locale === 'en'
            ? 'bg-stunity-primary-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchLocale('km')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          locale === 'km'
            ? 'bg-stunity-primary-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        ខ្មែរ
      </button>
    </div>
  );
}
