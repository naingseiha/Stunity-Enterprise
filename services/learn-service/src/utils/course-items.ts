const COURSE_ITEM_TYPES = new Set([
  'VIDEO',
  'ARTICLE',
  'DOCUMENT',
  'PDF',
  'FILE',
  'IMAGE',
  'QUIZ',
  'ASSIGNMENT',
  'EXERCISE',
  'PRACTICE',
  'CASE_STUDY',
  'AUDIO',
]);

const COURSE_ITEM_TYPE_ALIASES: Record<string, string> = {
  TEXT: 'ARTICLE',
  READING: 'ARTICLE',
  DOC: 'DOCUMENT',
  DOCS: 'DOCUMENT',
  DOCUMENTS: 'DOCUMENT',
  DOWNLOAD: 'FILE',
  RESOURCE: 'FILE',
  RESOURCES: 'FILE',
  LAB: 'EXERCISE',
  CODE: 'EXERCISE',
};

const TEXT_TRACK_KINDS = new Set(['SUBTITLE', 'CAPTION', 'TRANSCRIPT']);

const getUrlPath = (value: string) => {
  try {
    return new URL(value).pathname.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
};

export const normalizeCourseItemType = (input: unknown, fallback = 'ARTICLE') => {
  const normalized = typeof input === 'string' ? input.trim().toUpperCase().replace(/[\s-]+/g, '_') : '';
  const aliased = COURSE_ITEM_TYPE_ALIASES[normalized] || normalized;

  if (COURSE_ITEM_TYPES.has(aliased)) return aliased;
  return fallback;
};

export const inferCourseItemType = (lesson: any) => {
  if (lesson?.type) return normalizeCourseItemType(lesson.type);

  const videoUrl = typeof lesson?.videoUrl === 'string' ? lesson.videoUrl.trim() : '';
  if (videoUrl) return 'VIDEO';

  const content = typeof lesson?.content === 'string' ? lesson.content.trim() : '';
  if (!content) return 'ARTICLE';

  const lowerPath = getUrlPath(content);
  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/.test(lowerPath)) return 'IMAGE';
  if (/\.pdf(\?|#|$)/.test(lowerPath)) return 'PDF';
  if (/\.(docx?|pptx?|xlsx?|csv|txt|md|zip)(\?|#|$)/.test(lowerPath)) return 'DOCUMENT';

  return 'ARTICLE';
};

const normalizeLocale = (value: unknown) => {
  const locale = typeof value === 'string' ? value.trim().toLowerCase().replace('_', '-') : '';
  if (!locale) return 'en';
  if (locale === 'kh' || locale === 'km-kh' || locale === 'kh-kh') return 'km';
  if (locale === 'en-us' || locale === 'en-gb') return 'en';
  return locale;
};

export const normalizeLessonTextTracks = (input: unknown) => {
  if (!Array.isArray(input)) return undefined;

  const tracks = input
    .map((track) => {
      if (!track || typeof track !== 'object') return null;
      const raw = track as Record<string, unknown>;
      const kind = typeof raw.kind === 'string' ? raw.kind.trim().toUpperCase() : 'SUBTITLE';
      const url = typeof raw.url === 'string' ? raw.url.trim() : '';
      const content = typeof raw.content === 'string' ? raw.content.trim() : '';

      if (!url && !content) return null;

      return {
        kind: TEXT_TRACK_KINDS.has(kind) ? kind : 'SUBTITLE',
        locale: normalizeLocale(raw.locale ?? raw.language),
        label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : null,
        url: url || null,
        content: content || null,
        isDefault: Boolean(raw.isDefault),
      };
    })
    .filter(Boolean);

  return tracks.length > 0 ? tracks : [];
};

const RESOURCE_TYPES = new Set(['FILE', 'LINK', 'VIDEO']);

export const normalizeLessonResources = (input: unknown) => {
  if (!Array.isArray(input)) return undefined;

  const resources = input
    .map((resource) => {
      if (!resource || typeof resource !== 'object') return null;
      const raw = resource as Record<string, unknown>;
      const title = typeof raw.title === 'string' ? raw.title.trim() : '';
      const url = typeof raw.url === 'string' ? raw.url.trim() : '';

      if (!title || !url) return null;

      const type = typeof raw.type === 'string' ? raw.type.trim().toUpperCase() : 'FILE';

      return {
        title,
        url,
        type: RESOURCE_TYPES.has(type) ? type : 'FILE',
        size: typeof raw.size === 'number' && Number.isFinite(raw.size) ? raw.size : null,
        locale: normalizeLocale(raw.locale ?? raw.language),
        isDefault: Boolean(raw.isDefault),
      };
    })
    .filter(Boolean);

  return resources.length > 0 ? resources : [];
};
