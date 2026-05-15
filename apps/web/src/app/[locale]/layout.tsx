import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Poppins, Inter, Moul } from 'next/font/google';
import ClientProviders from '@/components/ClientProviders';
import { constructMetadata } from '@/lib/metadata';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return constructMetadata({
    title: locale === 'km' ? 'ស្ទូនិធី - ប្រព័ន្ធគ្រប់គ្រងសាលារៀនទំនើប' : 'Stunity - Modern School Management',
    description: locale === 'km' 
      ? 'ស្ទូនិធី គឺជាប្រព័ន្ធគ្រប់គ្រងសាលារៀន និងការសិក្សាសង្គមដ៏ទំនើបបំផុត។'
      : 'Stunity is the most advanced school management and social learning platform.',
  });
}


const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const moul = Moul({
  weight: '400',
  subsets: ['khmer'],
  variable: '--font-moul',
});

export default async function LocaleLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${poppins.variable} ${inter.variable} ${moul.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('stunity-theme');var m=window.matchMedia('(prefers-color-scheme:dark)').matches;var d=t==='dark'||(t!=='light'&&m);document.documentElement.classList.toggle('dark',d);})();`,
          }}
        />
      </head>
      <body className={`${locale === 'km' ? 'font-battambang' : 'font-poppins'} bg-slate-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 transition-colors`}>
        <NextIntlClientProvider messages={messages}>
          <ClientProviders>
            {children}
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
