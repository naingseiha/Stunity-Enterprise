"use client";

import { ClipboardPaste } from "lucide-react";

interface PasteNotificationProps {
  message: string;
}

export function PasteNotification({ message }: PasteNotificationProps) {
  return (
    <div
      className={`border-b-2 px-6 py-3 ${
        message.includes("❌")
          ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
          : message.includes("✅")
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
          : "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <ClipboardPaste
          className={`w-5 h-5 ${
            message.includes("❌")
              ? "text-red-600"
              : message.includes("✅")
              ? "text-green-600"
              : "text-yellow-600"
          }`}
        />
        <p
          className={`text-sm font-semibold ${
            message.includes("❌")
              ? "text-red-800"
              : message.includes("✅")
              ? "text-green-800"
              : "text-yellow-800"
          }`}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
