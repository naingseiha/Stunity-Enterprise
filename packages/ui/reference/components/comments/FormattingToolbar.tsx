"use client";

import { Bold, Italic, Code, List, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";

interface FormattingToolbarProps {
  onFormat: (type: FormatType, value?: string) => void;
  show: boolean;
}

export type FormatType = "bold" | "italic" | "code" | "list" | "link";

const formatButtons = [
  { type: "bold" as const, icon: Bold, label: "Bold (Ctrl+B)", shortcut: "⌘B" },
  { type: "italic" as const, icon: Italic, label: "Italic (Ctrl+I)", shortcut: "⌘I" },
  { type: "code" as const, icon: Code, label: "Code", shortcut: "⌘`" },
  { type: "list" as const, icon: List, label: "Bullet List", shortcut: "" },
  { type: "link" as const, icon: LinkIcon, label: "Insert Link", shortcut: "⌘K" },
];

export default function FormattingToolbar({ onFormat, show }: FormattingToolbarProps) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-t border-gray-200 rounded-b-xl"
    >
      {formatButtons.map((button) => {
        const Icon = button.icon;
        return (
          <button
            key={button.type}
            type="button"
            onClick={() => onFormat(button.type)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors group relative"
            title={button.label}
          >
            <Icon className="w-4 h-4" />

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {button.label}
              {button.shortcut && (
                <span className="ml-1 text-gray-400">{button.shortcut}</span>
              )}
            </div>
          </button>
        );
      })}

      {/* Hint */}
      <div className="ml-auto text-xs text-gray-400 hidden sm:block">
        Supports **bold**, *italic*, `code`
      </div>
    </motion.div>
  );
}
