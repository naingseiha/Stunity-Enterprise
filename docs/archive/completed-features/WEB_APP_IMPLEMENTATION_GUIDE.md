# Next.js Web App - Implementation Guide

**Status:** Foundation Complete - Ready for UI Implementation  
**Estimated Time Remaining:** 2-3 hours  
**Last Updated:** January 29, 2026

---

## ✅ What's Already Done

### Project Structure
```
apps/web/
├── package.json ✅
├── tsconfig.json ✅
├── tailwind.config.ts ✅ (Stunity colors + Khmer/English fonts)
├── next.config.js ✅ (next-intl configured)
├── postcss.config.js ✅
└── src/
    ├── app/
    ├── components/
    ├── lib/
    └── messages/
```

### Dependencies Installed ✅
- Next.js 14.2.0
- React 18.3.0
- TypeScript 5
- Tailwind CSS 3.4.0
- next-intl 3.9.0 (for i18n)
- lucide-react 0.312.0 (icons)

### Configuration Complete ✅
- TypeScript with strict mode
- Tailwind with Stunity purple theme (#8b5cf6)
- Khmer fonts: Battambang, Koulen, Moul
- English fonts: Poppins, Inter
- next-intl plugin configured

---

## 📋 What Needs to Be Built

### Phase 1: i18n Setup (30 minutes)

**1. Create `src/lib/i18n.ts`**
```typescript
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'km'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

**2. Create `src/messages/en.json`**
```json
{
  "common": {
    "appName": "Stunity Enterprise",
    "login": "Login",
    "logout": "Logout",
    "dashboard": "Dashboard",
    "language": "Language"
  },
  "landing": {
    "hero": {
      "title": "Modern School Management System",
      "subtitle": "Multi-tenant SaaS platform for educational institutions",
      "ctaRegister": "Register Your School",
      "ctaLogin": "Login"
    }
  },
  "login": {
    "title": "Welcome Back",
    "email": "Email Address",
    "password": "Password",
    "submit": "Login",
    "error": "Invalid email or password",
    "trialExpired": "Your trial has expired"
  },
  "dashboard": {
    "welcome": "Welcome, {{name}}",
    "school": "School",
    "tier": "Subscription Tier",
    "trialDays": "Trial Days Remaining",
    "students": "Students",
    "teachers": "Teachers",
    "storage": "Storage Used"
  }
}
```

**3. Create `src/messages/km.json`**
```json
{
  "common": {
    "appName": "Stunity Enterprise",
    "login": "ចូល",
    "logout": "ចាកចេញ",
    "dashboard": "ផ្ទាំងគ្រប់គ្រង",
    "language": "ភាសា"
  },
  "landing": {
    "hero": {
      "title": "ប្រព័ន្ធគ្រប់គ្រងសាលារៀនទំនើប",
      "subtitle": "វេទិកា SaaS សម្រាប់គ្រឹះស្ថានអប់រំ",
      "ctaRegister": "ចុះឈ្មោះសាលា",
      "ctaLogin": "ចូល"
    }
  },
  "login": {
    "title": "សូមស្វាគមន៍",
    "email": "អ៊ីមែល",
    "password": "ពាក្យសម្ងាត់",
    "submit": "ចូល",
    "error": "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ",
    "trialExpired": "ការសាកល្បងរបស់អ្នកផុតកំណត់ហើយ"
  },
  "dashboard": {
    "welcome": "សូមស្វាគមន៍, {{name}}",
    "school": "សាលា",
    "tier": "កម្រិតជាវ",
    "trialDays": "ថ្ងៃសាកល្បងនៅសល់",
    "students": "សិស្ស",
    "teachers": "គ្រូ",
    "storage": "ទំហំផ្ទុកបានប្រើ"
  }
}
```

**4. Create `src/middleware.ts`**
```typescript
import createMiddleware from 'next-intl/middleware';
import { locales } from './lib/i18n';

export default createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

---

### Phase 2: Layout & Components (30 minutes)

**5. Create `src/app/layout.tsx`**
```typescript
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stunity Enterprise',
  description: 'Modern School Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

**6. Create `src/app/[locale]/layout.tsx`**
```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Poppins, Inter } from 'next/font/google';
import LanguageSwitcher from '@/components/LanguageSwitcher';

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
      <body className="font-poppins">
        <NextIntlClientProvider messages={messages}>
          <div className="fixed top-4 right-4 z-50">
            <LanguageSwitcher />
          </div>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**7. Create `src/app/globals.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-poppins: 'Poppins', sans-serif;
  --font-inter: 'Inter', sans-serif;
  --font-battambang: 'Battambang', sans-serif;
  --font-koulen: 'Koulen', sans-serif;
  --font-moul: 'Moul', serif;
}

body {
  font-family: var(--font-poppins);
}

[lang="km"] {
  font-family: var(--font-battambang);
}

[lang="km"] h1,
[lang="km"] h2 {
  font-family: var(--font-koulen);
}
```

**8. Create `src/components/LanguageSwitcher.tsx`**
```typescript
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = () => {
    const newLocale = locale === 'en' ? 'km' : 'en';
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <button
      onClick={switchLocale}
      className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
    >
      <Languages className="w-5 h-5 text-stunity-primary-600" />
      <span className="font-medium text-gray-700">
        {locale === 'en' ? 'ភាសាខ្មែរ' : 'English'}
      </span>
    </button>
  );
}
```

---

### Phase 3: Landing Page (20 minutes)

**9. Create `src/app/[locale]/page.tsx`**
```typescript
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GraduationCap, Users, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  const t = useTranslations('landing');

  return (
    <div className="min-h-screen bg-gradient-to-br from-stunity-primary-50 via-white to-stunity-primary-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <GraduationCap className="w-20 h-20 mx-auto text-stunity-primary-600 mb-6" />
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('hero.title')}
          </h1>
          
          <p className="text-xl text-gray-600 mb-10">
            {t('hero.subtitle')}
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-stunity-primary-600 text-white rounded-lg font-semibold hover:bg-stunity-primary-700 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {t('hero.ctaRegister')}
            </Link>
            
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-stunity-primary-600 rounded-lg font-semibold hover:bg-gray-50 transition-all hover:scale-105 shadow-lg hover:shadow-xl border-2 border-stunity-primary-600"
            >
              {t('hero.ctaLogin')}
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <Users className="w-12 h-12 mx-auto text-stunity-primary-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Multi-Tenant</h3>
            <p className="text-gray-600">Each school gets isolated data</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-stunity-primary-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Trial Available</h3>
            <p className="text-gray-600">Try 1 or 3 months free</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <GraduationCap className="w-12 h-12 mx-auto text-stunity-primary-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Enterprise Ready</h3>
            <p className="text-gray-600">Production-grade platform</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 4: API Client (20 minutes)

**10. Create `src/lib/api/auth.ts`**
```typescript
const API_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      schoolId: string;
    };
    school: {
      id: string;
      name: string;
      slug: string;
      subscriptionTier: string;
      subscriptionEnd: string;
      isTrial: boolean;
      isActive: boolean;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: string;
    };
    trialDaysRemaining: number | null;
  };
  error?: string;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  return response.json();
}

export async function verifyToken(token: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/verify`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
}

export function saveTokens(accessToken: string, refreshToken: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}

export function clearTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}
```

---

### Phase 5: Login Page (30 minutes)

**11. Create `src/app/[locale]/login/page.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { login, saveTokens } from '@/lib/api/auth';

export default function LoginPage() {
  const t = useTranslations('login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await login({ email, password });

      if (response.success && response.data) {
        saveTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
        router.push('/dashboard');
      } else {
        setError(response.error || t('error'));
      }
    } catch (err) {
      setError(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stunity-primary-50 to-stunity-primary-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          {t('title')}
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-stunity-primary-600 text-white rounded-lg font-semibold hover:bg-stunity-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              t('submit')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### Phase 6: Dashboard Page (30 minutes)

**12. Create `src/app/[locale]/dashboard/page.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getAccessToken, verifyToken, clearTokens } from '@/lib/api/auth';
import { Users, GraduationCap, Database, Calendar, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await verifyToken(token);
        
        if (response.success && response.data) {
          setUser(response.data.user);
          setSchool(response.data.school);
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-stunity-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stunity-primary-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('welcome', { name: user?.firstName })}
          </h1>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* School Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">{t('school')}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="text-lg font-semibold">{school?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('tier')}</p>
              <span className="inline-block px-3 py-1 bg-stunity-primary-100 text-stunity-primary-700 rounded-full text-sm font-medium">
                {school?.subscriptionTier}
              </span>
            </div>
          </div>
          
          {school?.isTrial && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                <p className="text-amber-800 font-medium">
                  Trial: {Math.ceil((new Date(school.subscriptionEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <GraduationCap className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('students')}</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('teachers')}</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Database className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('storage')}</p>
                <p className="text-2xl font-bold">0 GB</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 How to Test

1. **Start the services:**
```bash
# Terminal 1 - Auth Service
cd ~/Documents/Stunity-Enterprise/services/auth-service
npm run dev

# Terminal 2 - School Service  
cd ~/Documents/Stunity-Enterprise/services/school-service
npm run dev

# Terminal 3 - Web App
cd ~/Documents/Stunity-Enterprise/apps/web
npm run dev
```

2. **Test the flow:**
- Visit: http://localhost:3000/en
- Click "Login"
- Use: john.doe@testhighschool.edu / SecurePass123!
- Should redirect to dashboard
- Test language switcher (English ⇄ Khmer)

---

## 📝 Environment Variables

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_SCHOOL_SERVICE_URL=http://localhost:3002
```

---

## ✅ Checklist

- [ ] Create all files listed above
- [ ] Add fonts link to layout
- [ ] Test English interface
- [ ] Test Khmer interface
- [ ] Test login flow
- [ ] Test dashboard display
- [ ] Test language switching
- [ ] Test logout
- [ ] Verify JWT tokens saved
- [ ] Check responsive design

---

**Total Time Estimate:** 2-3 hours  
**Difficulty:** Medium  
**Status:** Ready to implement!
