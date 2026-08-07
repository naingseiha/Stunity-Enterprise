import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Stunity',
  description: 'School Management & Social Learning Platform — Web, Mobile & PWA',
  applicationName: 'Stunity',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stunity',
    startupImage: '/apple-touch-icon.png',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
      { url: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [
      { rel: 'mask-icon', url: '/icons/pwa-512x512-maskable.png', color: '#ea580c' },
    ],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
