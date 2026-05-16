import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getTranslationCacheTag } from '@/lib/translation-merge';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
const DEFAULT_LOCALES = ['en', 'km'];
const DEFAULT_APPS = ['web', 'mobile', 'global'];

async function verifySuperAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const response = await fetch(`${AUTH_SERVICE_URL}/auth/verify`, {
    headers: { Authorization: authHeader },
    cache: 'no-store',
  });

  if (!response.ok) return false;

  const payload = await response.json();
  const user = payload?.data?.user;
  return Boolean(user?.isSuperAdmin || user?.role === 'SUPER_ADMIN');
}

export async function POST(request: NextRequest) {
  if (!(await verifySuperAdmin(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const locales = Array.isArray(body.locales)
    ? body.locales.map((locale: unknown) => String(locale).trim()).filter(Boolean)
    : DEFAULT_LOCALES;
  const apps = Array.isArray(body.apps)
    ? body.apps.map((app: unknown) => String(app).trim()).filter(Boolean)
    : DEFAULT_APPS;

  const tags = new Set<string>();
  for (const app of apps) {
    for (const locale of locales) {
      tags.add(getTranslationCacheTag(app, locale));
    }
  }

  tags.forEach((tag) => revalidateTag(tag));

  return NextResponse.json({
    success: true,
    revalidated: Array.from(tags),
  });
}
