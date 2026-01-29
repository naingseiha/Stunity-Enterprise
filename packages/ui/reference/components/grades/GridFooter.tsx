"use client";

import { Loader2, Check, Lock, ClipboardPaste } from "lucide-react";

interface GridFooterProps {
  pasteMode: boolean;
  currentUserRole?: string;
}

export function GridFooter({ pasteMode, currentUserRole }: GridFooterProps) {
  return (
    <div className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
      <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
        {pasteMode ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-yellow-100 border-2 border-yellow-400 rounded" />
              <span>បានបញ្ចូល</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-orange-100 border-2 border-orange-400 rounded" />
              <span>បានកែសម្រួល</span>
            </div>
          </>
        ) : (
          <>
            {currentUserRole === "TEACHER" && (
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-gray-500" />
                <span>មើលប៉ុណ្ណោះ</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-blue-50 border-2 border-blue-400 rounded" />
              <span>កំពុងកែ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
              <span>កំពុងរក្សា</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-600" />
              <span>រក្សារួច</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-gray-300">
          <ClipboardPaste className="w-4 h-4 text-purple-600" />
          <span className="text-purple-700 font-semibold">
            Ctrl+V ដើម្បី Paste ពី Excel
          </span>
        </div>
      </div>
      <div className="text-xs font-semibold text-gray-600">
        <span className="text-green-700">A (≥45)</span> •
        <span className="text-blue-700"> B (≥40)</span> •
        <span className="text-yellow-700"> C (≥35)</span> •
        <span className="text-orange-700"> D (≥30)</span> •
        <span className="text-red-600"> E (≥25)</span> •
        <span className="text-red-800"> F (&lt;25)</span>
      </div>
    </div>
  );
}
