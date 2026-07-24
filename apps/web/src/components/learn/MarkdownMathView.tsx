'use client';

import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
// @ts-expect-error - markdown-it-texmath has no type declarations
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const md = MarkdownIt({ html: true, linkify: true, typographer: true }).use(texmath, {
  delimiters: 'dollars',
  engine: katex,
  katexOptions: { throwOnError: false },
});

interface MarkdownMathViewProps {
  text: string;
  className?: string;
}

export function MarkdownMathView({ text, className = '' }: MarkdownMathViewProps) {
  const htmlContent = useMemo(() => {
    if (!text) return '';
    try {
      return md.render(text);
    } catch (e) {
      return text;
    }
  }, [text]);

  return (
    <div
      className={`prose dark:prose-invert max-w-none leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

export default MarkdownMathView;
