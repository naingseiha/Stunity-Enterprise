import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Poppins, Inter } from 'next/font/google';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ClientProviders from '@/components/ClientProviders';

const poppins = Poppins({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('stunity-theme');var m=window.matchMedia('(prefers-color-scheme:dark)').matches;var d=t==='dark'||(t!=='light'&&m);document.documentElement.classList.toggle('dark',d);})();`,
          }}
        />
        <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Koulen&family=Moul&display=swap" rel="stylesheet" />
      </head>
      <body className="font-poppins bg-gradient-to-br from-stunity-primary-50 via-white to-stunity-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors">
        <NextIntlClientProvider messages={messages}>
          <ClientProviders>
            {children}
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
