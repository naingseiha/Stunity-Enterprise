import assert from 'node:assert/strict';
import { sanitizeMarkdownHtml } from '../../apps/web/src/components/learn/markdownSanitizer';

const unsafe = sanitizeMarkdownHtml(
  '<img src="x" onerror="alert(1)"><a href="javascript:alert(1)">run</a><svg><script>alert(1)</script></svg>',
);

assert.equal(unsafe.includes('onerror'), false);
assert.equal(unsafe.includes('javascript:'), false);
assert.equal(unsafe.includes('<script'), false);
assert.equal(unsafe.includes('<svg'), false);

const safe = sanitizeMarkdownHtml('<p>Hello</p><span class="katex">x</span>');
assert.equal(safe.includes('Hello'), true);
assert.equal(safe.includes('katex'), true);
console.log('Markdown sanitizer smoke test passed');
