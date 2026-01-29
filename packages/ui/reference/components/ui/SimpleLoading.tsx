"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface SimpleLoadingProps {
  message?: string;
  show: boolean;
}

export default function SimpleLoading({ message, show }: SimpleLoadingProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 flex items-center gap-4 min-w-[300px]">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0" />
        <span className="text-gray-700 font-medium">
          {message || "Loading... "}
        </span>
      </div>
    </div>
  );
}
