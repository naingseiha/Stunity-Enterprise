/**
 * MarkdownMathView — shared renderer for AI-tutor answers and Learn-path
 * lesson content. Full HTML rendering (markdown-it -> HTML string, KaTeX ->
 * real math markup) instead of mapping markdown nodes to native RN
 * components — the same technique ChatGPT/Claude/Gemini's own apps use
 * (whole-message HTML in a WebView, not native-component mapping), which is
 * what makes inline math + polished doc-style rendering work at all in RN.
 *
 * Originally built for TutorChatScreen; extracted here so UnitLessonScreen's
 * mini-lessons get the same headings/bold/blockquote/KaTeX rendering instead
 * of plain-text paragraphs, and so both stay visually consistent.
 */

import React, { useMemo, useState } from 'react';
import { WebView } from 'react-native-webview';
import MarkdownIt from 'markdown-it';
// @ts-ignore — no published types for this plugin
import texmath from 'markdown-it-texmath';
import katex from 'katex';

export const markdownMathIt = MarkdownIt({ typographer: true }).use(texmath, {
  delimiters: 'dollars',
  engine: katex,
  katexOptions: { throwOnError: false },
});

const KATEX_CSS_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css';

export function buildMarkdownMathHtml(bodyHtml: string, colors: any, isDark: boolean): string {
  const accentColor = '#0EA5E9';
  const headingColor = isDark ? '#38BDF8' : '#0369A1';
  const blockquoteBg = isDark
    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(14, 165, 233, 0.04))'
    : 'linear-gradient(135deg, #F0F9FF, #E0F2FE)';
  const blockquoteBorder = isDark ? 'rgba(14, 165, 233, 0.3)' : '#BEE3F8';
  const formulaBg = isDark ? 'rgba(14, 165, 233, 0.06)' : '#F0F9FF';
  const formulaBorder = isDark ? 'rgba(14, 165, 233, 0.25)' : '#BEE3F8';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Kantumruy+Pro:wght@400;700&family=Koulen&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${KATEX_CSS_CDN}">
<style>
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: transparent;
    color: ${colors.text};
    font-family: 'Kantumruy Pro', 'Battambang', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', 'EmojiSymbols', 'Times New Roman', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.65;
    -webkit-text-size-adjust: 100%;
  }
  body { padding: 1px 2px; overflow-x: hidden; }
  h1, h2, h3 {
    font-family: 'Koulen', 'Kantumruy Pro', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', 'EmojiSymbols', 'Times New Roman', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: ${headingColor};
    font-weight: 400;
    margin: 22px 0 12px;
    line-height: 1.45;
    letter-spacing: 0.5px;
  }
  h1 { font-size: 19px; border-bottom: 2px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE'}; padding-bottom: 6px; }
  h2 { font-size: 17px; }
  h3 { font-size: 16px; }
  strong {
    font-weight: 700;
    color: ${isDark ? '#F1F5F9' : '#0F172A'};
  }
  ul, ol { padding-left: 20px; margin: 8px 0; }
  li { margin-bottom: 6px; }
  p { margin: 0 0 12px; }
  p:last-child { margin-bottom: 0; }
  a { color: ${accentColor}; text-decoration: none; font-weight: 600; }
  blockquote {
    background: ${blockquoteBg};
    border-left: 4px solid ${accentColor};
    border-top: 1px solid ${blockquoteBorder};
    border-right: 1px solid ${blockquoteBorder};
    border-bottom: 1px solid ${blockquoteBorder};
    border-radius: 12px;
    padding: 14px 16px;
    margin: 14px 0;
  }
  blockquote p {
    margin: 0;
    font-weight: 500;
    color: ${isDark ? '#E2E8F0' : '#1E293B'};
  }
  code {
    background: ${colors.surfaceVariant};
    color: ${accentColor};
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 13.5px;
    font-family: Menlo, Monaco, Consolas, monospace;
  }
  pre {
    background: ${colors.surfaceVariant};
    border-radius: 10px;
    padding: 12px;
    overflow-x: auto;
    border: 1px solid ${colors.border};
  }
  hr { border: none; border-top: 1px solid ${colors.border}; margin: 14px 0; }
  .katex { font-size: 1.05em; }
  .katex-display {
    margin: 16px 0;
    padding: 16px;
    background: ${formulaBg};
    border: 1.5px solid ${formulaBorder};
    border-radius: 12px;
    overflow-x: auto;
    overflow-y: hidden;
  }
  .katex .text, .katex .mord.text {
    font-family: 'Kantumruy Pro', 'Battambang', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Android Emoji', 'EmojiSymbols', 'Times New Roman', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
  }
</style>
</head>
<body>
${bodyHtml}
<script>
  function report() {
    var h = document.body.scrollHeight;
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(h));
  }
  window.addEventListener('load', report);
  if (window.ResizeObserver) {
    new ResizeObserver(report).observe(document.body);
  } else {
    setTimeout(report, 300);
    setTimeout(report, 900);
  }
</script>
</body>
</html>`;
}

// ─── Unicode Math Symbol → LaTeX Pre-processor ────────────────────────
// Kantumruy Pro's cmap table claims to cover certain Unicode math code
// points but ships empty outlines for them, so the browser never falls
// through to a system font — it renders a .notdef [?] box instead.
// We fix this by converting raw Unicode math operators in plain text
// (i.e. NOT already inside $…$ or $$…$$) into inline LaTeX before
// markdown-it processes the string.
const MATH_SYMBOL_MAP: Record<string, string> = {
  '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  '∪': '\\cup', '∩': '\\cap', '∈': '\\in', '∉': '\\notin',
  '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '≤': '\\le', '≥': '\\ge', '≠': '\\ne', '≈': '\\approx',
  '×': '\\times', '÷': '\\div', '±': '\\pm', '∓': '\\mp',
  '∞': '\\infty', '√': '\\surd', '∴': '\\therefore', '∵': '\\because',
  '∀': '\\forall', '∃': '\\exists', '∅': '\\emptyset',
  '⊕': '\\oplus', '⊗': '\\otimes',
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int',
};
const MATH_SYMBOL_REGEX = new RegExp(
  `[${Object.keys(MATH_SYMBOL_MAP).join('')}]`,
  'g',
);
export function sanitizeMathSymbols(md: string): string {
  // Split the text around existing LaTeX delimiters ($…$ and $$…$$)
  // so we only touch plain-text segments and leave real LaTeX alone.
  const parts = md.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
  for (let i = 0; i < parts.length; i++) {
    // Odd indices are the captured LaTeX groups — skip them.
    if (i % 2 === 1) continue;
    parts[i] = parts[i].replace(MATH_SYMBOL_REGEX, (ch) => {
      const cmd = MATH_SYMBOL_MAP[ch];
      return cmd ? `$${cmd}$` : ch;
    });
  }
  return parts.join('');
}

interface MarkdownMathViewProps {
  text: string;
  colors: any;
  isDark: boolean;
  minHeight?: number;
}

// WebViews don't auto-size to their content, so each block is measured via
// a postMessage from the page once it (and any web fonts) finish loading.
export function MarkdownMathView({ text, colors, isDark, minHeight = 60 }: MarkdownMathViewProps) {
  const [height, setHeight] = useState(minHeight);
  const html = useMemo(
    () => buildMarkdownMathHtml(markdownMathIt.render(sanitizeMathSymbols(text)), colors, isDark),
    [text, colors, isDark],
  );
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: '' }}
      style={{ height, backgroundColor: 'transparent' }}
      scrollEnabled={false}
      onMessage={(e) => {
        const h = parseInt(e.nativeEvent.data, 10);
        if (!isNaN(h) && h > 0 && Math.abs(h - height) > 4) setHeight(h);
      }}
    />
  );
}
