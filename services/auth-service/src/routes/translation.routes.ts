import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

function flattenKeys(obj: any, prefix = ''): Record<string, string> {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenKeys(obj[k], pre + k));
    } else {
      acc[pre + k] = String(obj[k]);
    }
    return acc;
  }, {} as Record<string, string>);
}

const TRANSLATION_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';
const ADMIN_TRANSLATION_CACHE_TTL_MS = 60 * 1000;
const adminTranslationCache = new Map<string, { data: any; timestamp: number }>();
const LANGUAGE_MANAGEMENT_ROLES = ['SUPER_ADMIN'];
const DEFAULT_TRANSLATION_FILES = [
  { app: 'web', locale: 'en', path: '../../../../apps/web/src/messages/en.json' },
  { app: 'web', locale: 'km', path: '../../../../apps/web/src/messages/km.json' },
  { app: 'mobile', locale: 'en', path: '../../../../apps/mobile/src/assets/locales/en.json' },
  { app: 'mobile', locale: 'km', path: '../../../../apps/mobile/src/assets/locales/km.json' },
];
const defaultTranslationCache = new Map<string, Record<string, string>>();

function getLocaleDisplayName(locale: string, displayLocale = 'en'): string {
  try {
    const [language] = locale.split('-');
    const name = new Intl.DisplayNames([displayLocale], { type: 'language' }).of(language);
    return name || locale;
  } catch {
    return locale;
  }
}

function buildTranslationEtag(payload: Record<string, string>): string {
  const hash = createHash('sha1').update(JSON.stringify(payload)).digest('base64url');
  return `"${hash}"`;
}

function matchesIfNoneMatch(ifNoneMatchHeader: string | string[] | undefined, etag: string): boolean {
  if (!ifNoneMatchHeader) return false;
  const values = (Array.isArray(ifNoneMatchHeader) ? ifNoneMatchHeader.join(',') : ifNoneMatchHeader)
    .split(',')
    .map((v) => v.trim());

  return values.some((value) => {
    if (value === '*') return true;
    return value === etag || value === `W/${etag}` || `W/${value}` === etag;
  });
}

function readAdminTranslationCache(cacheKey: string) {
  const cached = adminTranslationCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > ADMIN_TRANSLATION_CACHE_TTL_MS) {
    adminTranslationCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function writeAdminTranslationCache(cacheKey: string, data: any) {
  adminTranslationCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

function clearAdminTranslationCache() {
  adminTranslationCache.clear();
}

function getRequestUserId(req: Request): string | null {
  return (req as any).user?.id || null;
}

function getRequestIp(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || null;
}

function readDefaultTranslations(app: string, locale: string): Record<string, string> {
  const cacheKey = `${app}:${locale}`;
  const cached = defaultTranslationCache.get(cacheKey);
  if (cached) return cached;

  const file = DEFAULT_TRANSLATION_FILES.find((item) => item.app === app && item.locale === locale);
  if (!file) {
    defaultTranslationCache.set(cacheKey, {});
    return {};
  }

  const filePath = path.resolve(__dirname, file.path);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Default translations: File not found: ${filePath}`);
    defaultTranslationCache.set(cacheKey, {});
    return {};
  }

  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const flat = flattenKeys(content);
  defaultTranslationCache.set(cacheKey, flat);
  return flat;
}

function getDefaultTranslationValue(app: string, locale: string, key: string): string | null {
  return readDefaultTranslations(app, locale)[key] ?? null;
}

async function recordTranslationAudit(
  prisma: PrismaClient,
  req: Request,
  action: string,
  details: Record<string, any>,
  resourceId?: string | null
) {
  const actorId = getRequestUserId(req);
  if (!actorId) return;

  try {
    await prisma.platformAuditLog.create({
      data: {
        actorId,
        action,
        resourceType: 'TRANSLATION',
        resourceId: resourceId || undefined,
        details,
        ipAddress: getRequestIp(req),
      },
    });
  } catch (error) {
    console.warn('Translation audit log write failed:', error);
  }
}

export default function translationRoutes(prisma: PrismaClient, authenticate: any, authorize: any) {
  const router = Router();

  /**
   * Fetches all translations for the management dashboard.
   */
  router.get('/admin/all', authenticate, authorize(LANGUAGE_MANAGEMENT_ROLES), async (req: Request, res: Response) => {
    console.log('HIT: GET /admin/all');
    try {
      const app = typeof req.query.app === 'string' ? req.query.app.trim() : '';
      const locale = typeof req.query.locale === 'string' ? req.query.locale.trim() : '';
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const pageRaw = parseInt(String(req.query.page ?? '1'), 10);
      const limitRaw = parseInt(String(req.query.limit ?? '0'), 10);
      const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
      const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(0, limitRaw)) : 0;
      const shouldPaginate = limit > 0;

      const cacheKey = `admin/all:${app || 'all'}:${locale || 'all'}:${search || 'none'}:${shouldPaginate ? `${page}:${limit}` : 'full'}`;
      const cachedResponse = readAdminTranslationCache(cacheKey);
      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      const where: any = {};
      if (app) where.app = app;
      if (locale) where.locale = locale;
      if (search) {
        where.OR = [
          { key: { contains: search, mode: 'insensitive' } },
          { value: { contains: search, mode: 'insensitive' } },
        ];
      }

      const baseQuery = {
        where,
        orderBy: [{ app: 'asc' as const }, { locale: 'asc' as const }, { key: 'asc' as const }],
        select: {
          id: true,
          app: true,
          locale: true,
          key: true,
          value: true,
          createdAt: true,
          updatedAt: true,
        },
      };

      let responseBody: any;
      if (shouldPaginate) {
        const [translations, total] = await Promise.all([
          prisma.translation.findMany({
            ...baseQuery,
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.translation.count({ where }),
        ]);

        responseBody = {
          success: true,
          data: translations.map((item) => ({
            ...item,
            defaultValue: getDefaultTranslationValue(item.app, item.locale, item.key),
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
        };
      } else {
        const translations = await prisma.translation.findMany(baseQuery);
        responseBody = {
          success: true,
          data: translations.map((item) => ({
            ...item,
            defaultValue: getDefaultTranslationValue(item.app, item.locale, item.key),
          })),
        };
      }

      writeAdminTranslationCache(cacheKey, responseBody);
      res.json(responseBody);
    } catch (error: any) {
      console.error('Fetch all translations error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch all translations' });
    }
  });

  /**
   * POST /auth/translations/update
   * Create or update a translation entry.
   */
  router.post('/update', authenticate, authorize(LANGUAGE_MANAGEMENT_ROLES), async (req: Request, res: Response) => {
    console.log('HIT: POST /update');
    const { app: appName, locale, key, value } = req.body;
    
    if (!appName || !locale || !key) {
      return res.status(400).json({ success: false, error: 'app, locale, and key are required' });
    }

    try {
      const previous = await prisma.translation.findUnique({
        where: {
          app_locale_key: { app: appName, locale, key }
        },
      });

      const translation = await prisma.translation.upsert({
        where: {
          app_locale_key: { app: appName, locale, key }
        },
        update: { value },
        create: { app: appName, locale, key, value }
      });

      clearAdminTranslationCache();
      await recordTranslationAudit(prisma, req, previous ? 'TRANSLATION_UPDATE' : 'TRANSLATION_CREATE', {
        app: appName,
        locale,
        key,
        previousValue: previous?.value ?? null,
        newValue: value,
      }, translation.id);
      res.json({ success: true, data: translation });
    } catch (error: any) {
      console.error('Update translation error:', error);
      res.status(500).json({ success: false, error: 'Failed to update translation' });
    }
  });

  router.post('/bulk', authenticate, authorize(LANGUAGE_MANAGEMENT_ROLES), async (req: Request, res: Response) => {
    console.log('HIT: POST /bulk');
    const { translations } = req.body;
    
    if (!Array.isArray(translations)) {
      return res.status(400).json({ success: false, error: 'translations must be an array' });
    }

    try {
      if (translations.length === 0) {
        return res.json({ success: true, count: 0 });
      }

      const previousRows = await prisma.translation.findMany({
        where: {
          OR: translations
            .filter((t: any) => t?.app && t?.locale && t?.key)
            .map((t: any) => ({ app: t.app, locale: t.locale, key: t.key })),
        },
      });
      const previousByKey = new Map(previousRows.map((item) => [`${item.app}:${item.locale}:${item.key}`, item.value]));
      const results = await prisma.$transaction(
        translations.map((t: any) => 
          prisma.translation.upsert({
            where: { app_locale_key: { app: t.app, locale: t.locale, key: t.key } },
            update: { value: t.value },
            create: { app: t.app, locale: t.locale, key: t.key, value: t.value }
          })
        )
      );
      clearAdminTranslationCache();
      await recordTranslationAudit(prisma, req, 'TRANSLATION_BULK_UPDATE', {
        count: results.length,
        created: translations.filter((t: any) => !previousByKey.has(`${t.app}:${t.locale}:${t.key}`)).length,
        updated: translations.filter((t: any) => previousByKey.has(`${t.app}:${t.locale}:${t.key}`)).length,
        sample: translations.slice(0, 25).map((t: any) => ({
          app: t.app,
          locale: t.locale,
          key: t.key,
          previousValue: previousByKey.get(`${t.app}:${t.locale}:${t.key}`) ?? null,
          newValue: t.value,
        })),
      });
      res.json({ success: true, count: results.length });
    } catch (error: any) {
      console.error('Bulk update error:', error);
      res.status(500).json({ success: false, error: 'Failed to bulk update translations' });
    }
  });

  router.post('/sync', authenticate, authorize(LANGUAGE_MANAGEMENT_ROLES), async (req: Request, res: Response) => {
    console.log('HIT: POST /sync');
    try {
      let totalScanned = 0;
      let totalCreated = 0;

      for (const file of DEFAULT_TRANSLATION_FILES) {
        const filePath = path.resolve(__dirname, file.path);
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠️ Sync: File not found: ${filePath}`);
          continue;
        }

        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const flat = flattenKeys(content);
        const entries = Object.entries(flat);
        totalScanned += entries.length;

        const created = await prisma.translation.createMany({
          data: entries.map(([key, value]) => ({
            app: file.app,
            locale: file.locale,
            key,
            value,
          })),
          skipDuplicates: true,
        });
        totalCreated += created.count;
      }

      clearAdminTranslationCache();
      await recordTranslationAudit(prisma, req, 'TRANSLATION_SYNC_DEFAULTS', {
        created: totalCreated,
        preserved: totalScanned - totalCreated,
        scanned: totalScanned,
      });
      res.json({
        success: true,
        count: totalCreated,
        created: totalCreated,
        preserved: totalScanned - totalCreated,
        scanned: totalScanned,
      });
    } catch (error: any) {
      console.error('Sync translations error:', error);
      res.status(500).json({ success: false, error: 'Failed to synchronize translations' });
    }
  });

  /**
   * GET /auth/translations/locales/:app
   * Lists locales with translation entries for an app, including global overrides.
   */
  router.get('/locales/:app(web|mobile|global)', async (req: Request, res: Response) => {
    const { app: appName } = req.params;

    try {
      const rows = await prisma.translation.groupBy({
        by: ['locale'],
        where: {
          OR: [
            { app: appName },
            { app: 'global' },
          ],
        },
        _count: { _all: true },
        orderBy: { locale: 'asc' },
      });

      const locales = rows.map((row) => ({
        locale: row.locale,
        label: getLocaleDisplayName(row.locale),
        nativeLabel: getLocaleDisplayName(row.locale, row.locale),
        count: row._count._all,
      }));

      res.setHeader('Cache-Control', TRANSLATION_CACHE_CONTROL);
      res.json({ success: true, data: locales });
    } catch (error: any) {
      console.error('Fetch translation locales error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch translation locales' });
    }
  });

  /**
   * GET /auth/translations/:app/:locale
   * Fetches key-value overrides for a specific app and language.
   * Constrained to only match specific app names to avoid collision with admin routes.
   */
  router.get('/:app(web|mobile|global)/:locale', async (req: Request, res: Response) => {
    console.log(`HIT: GET /:app/:locale with app=${req.params.app}, locale=${req.params.locale}`);
    const { app: appName, locale } = req.params;
    try {
      const translations = await prisma.translation.findMany({
        where: {
          OR: [
            { app: appName, locale },
            { app: 'global', locale }
          ]
        },
        orderBy: [{ key: 'asc' }, { app: 'asc' }]
      });

      // Merge in deterministic precedence: global first, app-specific second.
      // This guarantees app overrides always win even if DB ordering changes.
      const sorted = translations.sort((a, b) => {
        if (a.key !== b.key) return a.key.localeCompare(b.key);
        const aPriority = a.app === 'global' ? 0 : 1;
        const bPriority = b.app === 'global' ? 0 : 1;
        return aPriority - bPriority;
      });

      const result: Record<string, string> = {};
      sorted.forEach((t) => {
        result[t.key] = t.value;
      });

      const etag = buildTranslationEtag(result);
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', TRANSLATION_CACHE_CONTROL);
      res.setHeader('Vary', 'If-None-Match');

      if (matchesIfNoneMatch(req.headers['if-none-match'], etag)) {
        return res.status(304).end();
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Fetch translations error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch translations' });
    }
  });

  return router;
}
