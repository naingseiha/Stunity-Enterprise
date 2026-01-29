"use client";

import { motion } from "framer-motion";
import { AtSign } from "lucide-react";
import { MentionUser } from "@/hooks/useMentions";

interface MentionSuggestionsProps {
  suggestions: MentionUser[];
  selectedIndex: number;
  onSelect: (user: MentionUser) => void;
  position?: "top" | "bottom";
}

export default function MentionSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  position = "top",
}: MentionSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: position === "top" ? 10 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: position === "top" ? 10 : -10 }}
      className={`absolute ${position === "top" ? "bottom-full mb-2" : "top-full mt-2"} left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-w-md`}
    >
      {/* Header */}
      <div className="p-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <AtSign className="w-4 h-4" />
          <span className="font-medium">Mention someone</span>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="max-h-64 overflow-y-auto">
        {suggestions.map((user, index) => (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            onMouseEnter={() => {}}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
              index === selectedIndex ? "bg-purple-50" : ""
            }`}
          >
            {/* Avatar */}
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user.name}</p>
              {user.role && (
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
              )}
            </div>

            {/* Selection Indicator */}
            {index === selectedIndex && (
              <div className="text-purple-600 flex-shrink-0">
                <kbd className="px-2 py-1 text-xs bg-gray-100 rounded border border-gray-300">
                  ↵
                </kbd>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Footer Hint */}
      <div className="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
        Use ↑↓ to navigate, ↵ to select, ESC to dismiss
      </div>
    </motion.div>
  );
}
