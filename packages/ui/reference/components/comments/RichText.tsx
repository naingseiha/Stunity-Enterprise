"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface RichTextProps {
  text: string;
  className?: string;
}

type TextPart = {
  type: "text" | "bold" | "italic" | "code" | "link" | "mention";
  content: string;
  url?: string;
};

/**
 * Component that parses markdown-like syntax and renders formatted text
 * Supports:
 * - **bold**
 * - *italic*
 * - `code`
 * - [link text](url)
 * - @mentions
 */
export default function RichText({ text, className = "" }: RichTextProps) {
  const parseText = (input: string): TextPart[] => {
    const parts: TextPart[] = [];
    let remaining = input;
    let index = 0;

    // Combined regex for all formatting
    const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(@[a-zA-Z0-9\u0E00-\u0E7F\u1780-\u17FF\s]+?)(?=\s|$|[.,!?])/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(input)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: input.substring(lastIndex, match.index),
        });
      }

      // Determine type and add formatted part
      if (match[1]) {
        // Bold: **text**
        parts.push({ type: "bold", content: match[2] });
      } else if (match[3]) {
        // Italic: *text*
        parts.push({ type: "italic", content: match[4] });
      } else if (match[5]) {
        // Code: `text`
        parts.push({ type: "code", content: match[6] });
      } else if (match[7]) {
        // Link: [text](url)
        parts.push({ type: "link", content: match[8], url: match[9] });
      } else if (match[0].startsWith("@")) {
        // Mention: @username
        parts.push({ type: "mention", content: match[0] });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < input.length) {
      parts.push({
        type: "text",
        content: input.substring(lastIndex),
      });
    }

    return parts.length > 0 ? parts : [{ type: "text", content: input }];
  };

  const renderPart = (part: TextPart, index: number): ReactNode => {
    switch (part.type) {
      case "bold":
        return (
          <strong key={index} className="font-bold text-gray-900">
            {part.content}
          </strong>
        );

      case "italic":
        return (
          <em key={index} className="italic text-gray-800">
            {part.content}
          </em>
        );

      case "code":
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-sm font-mono"
          >
            {part.content}
          </code>
        );

      case "link":
        // Check if it's an external link
        const isExternal = part.url?.startsWith("http");
        if (isExternal) {
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {part.content}
            </a>
          );
        } else {
          return (
            <Link
              key={index}
              href={part.url || "#"}
              className="text-blue-600 hover:text-blue-700 underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {part.content}
            </Link>
          );
        }

      case "mention":
        const username = part.content.substring(1).trim();
        return (
          <Link
            key={index}
            href={`/profile/search?q=${encodeURIComponent(username)}`}
            className="text-purple-600 hover:text-purple-700 font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part.content}
          </Link>
        );

      case "text":
      default:
        return <span key={index}>{part.content}</span>;
    }
  };

  const parts = parseText(text);

  return <span className={className}>{parts.map((part, index) => renderPart(part, index))}</span>;
}

/**
 * Utility to check if text contains formatting
 */
export function hasFormatting(text: string): boolean {
  return /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/.test(text);
}

/**
 * Utility to strip formatting from text
 */
export function stripFormatting(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
    .replace(/\*([^*]+)\*/g, "$1") // Italic
    .replace(/`([^`]+)`/g, "$1") // Code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // Links
}
