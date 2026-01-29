"use client";

import Link from "next/link";

interface MentionTextProps {
  text: string;
  className?: string;
}

/**
 * Component that parses text and highlights @mentions
 * Converts @username into clickable links
 */
export default function MentionText({ text, className = "" }: MentionTextProps) {
  // Parse text and find mentions
  const parseMentions = (input: string) => {
    // Regex to match @username (letters, numbers, spaces, and common Unicode characters)
    const mentionRegex = /@([a-zA-Z0-9\u0E00-\u0E7F\u1780-\u17FF\s]+?)(?=\s|$|[.,!?])/g;
    const parts: Array<{ type: 'text' | 'mention'; content: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(input)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: input.substring(lastIndex, match.index)
        });
      }

      // Add mention
      parts.push({
        type: 'mention',
        content: match[0]
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < input.length) {
      parts.push({
        type: 'text',
        content: input.substring(lastIndex)
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text' as const, content: input }];
  };

  const parts = parseMentions(text);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          const username = part.content.substring(1).trim(); // Remove @ and trim
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
        }
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
}

/**
 * Utility function to extract mentioned user names from text
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9\u0E00-\u0E7F\u1780-\u17FF\s]+?)(?=\s|$|[.,!?])/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1].trim());
  }

  return mentions;
}

/**
 * Utility function to check if text contains mentions
 */
export function hasMentions(text: string): boolean {
  const mentionRegex = /@([a-zA-Z0-9\u0E00-\u0E7F\u1780-\u17FF\s]+?)(?=\s|$|[.,!?])/g;
  return mentionRegex.test(text);
}
