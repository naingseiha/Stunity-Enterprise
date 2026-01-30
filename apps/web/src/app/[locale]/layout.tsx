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
    <html lang={locale} className={`${poppins.variable} ${inter.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Koulen&family=Moul&display=swap" rel="stylesheet" />
      </head>
      <body className="font-poppins bg-gradient-to-br from-stunity-primary-50 via-white to-stunity-primary-100 min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <ClientProviders>
            <div className="fixed top-4 right-4 z-50">
              <LanguageSwitcher />
            </div>
            {children}
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
