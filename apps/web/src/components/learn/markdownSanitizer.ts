import DOMPurify from 'isomorphic-dompurify';

export function sanitizeMarkdownHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: false, svgFilters: false, mathMl: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['style'],
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}
