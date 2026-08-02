import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stunity Enterprise',
  description: 'Modern Multi-Tenant School Management System',
  icons: {
    icon: [{ url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' }],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
