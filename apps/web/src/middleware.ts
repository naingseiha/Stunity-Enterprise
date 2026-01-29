import createMiddleware from 'next-intl/middleware';
import { locales } from './lib/i18n';

export default createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: true,
});

export const config = {
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',
    
    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(km|en)/:path*',
    
    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    '/((?!_next|_vercel|.*\\..*).*)'
  ],
};
