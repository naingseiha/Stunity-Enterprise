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

    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    // `u/` is excluded so public profile URLs (stunity.app/u/{username}) stay
    // locale-free and render the SSR public profile route directly.
    // `api/` must stay locale-free so auth BFF cookie routes (/api/auth/*) work.
    '/((?!_next|_vercel|api/|privacy|data-deletion|u/|.*\\..*).*)'
  ],
};
