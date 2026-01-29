"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { AtSign, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchUsers, MentionUser } from "@/lib/api/feed";

interface MentionUser {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onMention?: (userId: string) => void;
  disabled?: boolean;
}

export default function MentionInput({
  value,
  onChange,
  placeholder = "Write a comment...",
  className = "",
  onMention,
  disabled = false,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch users from API
  const fetchUsers = async (query: string) => {
    try {
      setIsLoading(true);
      const users = await searchUsers(query);
      setSuggestions(users);
      setShowSuggestions(users.length > 0);
      setSelectedIndex(0);
    } catch (error) {
      console.error("Failed to search users:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Detect @ symbol and show suggestions
  useEffect(() => {
    const lastAtSymbol = value.lastIndexOf("@", cursorPosition);

    if (lastAtSymbol !== -1 && lastAtSymbol === cursorPosition - 1) {
      // Just typed @
      fetchUsers("");
      setMentionQuery("");
    } else if (lastAtSymbol !== -1 && cursorPosition > lastAtSymbol) {
      // Typing after @
      const query = value.substring(lastAtSymbol + 1, cursorPosition);
      const spaceIndex = query.indexOf(" ");

      if (spaceIndex === -1) {
        // Still typing mention
        setMentionQuery(query);
        if (query.length >= 2) {
          fetchUsers(query);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        // Space after mention, close suggestions
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [value, cursorPosition]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case "Enter":
      case "Tab":
        if (suggestions.length > 0) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  const insertMention = (user: MentionUser) => {
    const lastAtSymbol = value.lastIndexOf("@", cursorPosition);
    if (lastAtSymbol === -1) return;

    const before = value.substring(0, lastAtSymbol);
    const after = value.substring(cursorPosition);
    const mentionText = `@${user.name} `;
    const newValue = before + mentionText + after;

    onChange(newValue);
    setShowSuggestions(false);

    // Move cursor after mention
    const newCursorPos = before.length + mentionText.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);

    // Notify parent about mention
    if (onMention) {
      onMention(user.id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleClick = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart || 0);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onKeyUp={handleClick}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${className}`}
      />

      {/* Mention Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-full mb-2 left-0 w-full max-w-sm bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
          >
            <div className="p-2 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AtSign className="w-4 h-4" />
                <span className="font-medium">Mention someone</span>
                {isLoading && (
                  <span className="ml-auto text-xs text-gray-400">Loading...</span>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {suggestions.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => insertMention(user)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                    index === selectedIndex ? "bg-purple-50" : ""
                  }`}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {user.name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    {user.role && (
                      <p className="text-xs text-gray-500">{user.role}</p>
                    )}
                  </div>

                  {index === selectedIndex && (
                    <div className="text-purple-600">
                      <kbd className="px-2 py-1 text-xs bg-gray-100 rounded border border-gray-300">
                        ↵
                      </kbd>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
              Use ↑↓ to navigate, ↵ to select, ESC to dismiss
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint */}
      {!disabled && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 flex items-center gap-1">
          <AtSign className="w-3 h-3" />
          <span>Type @ to mention</span>
        </div>
      )}
    </div>
  );
}
