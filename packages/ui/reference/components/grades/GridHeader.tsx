"use client";

import { TrendingUp, Eye } from "lucide-react";

interface GridHeaderProps {
  className: string;
  month: string;
  year: number;
  studentCount: number;
  totalCoefficient: number;
  pasteMode: boolean;
  currentUserRole?: string;
  editableCount?: number;
  totalSubjects?: number;
}

export function GridHeader({
  className,
  month,
  year,
  studentCount,
  totalCoefficient,
  pasteMode,
  currentUserRole,
  editableCount,
  totalSubjects,
}: GridHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-koulen text-white tracking-wide">
              {className}
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-sm font-bold text-white">
                  {month} {year}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-sm font-bold text-white">
                  {studentCount} សិស្ស
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-sm font-bold text-white">
                  Coef: {totalCoefficient}
                </span>
              </div>
              {currentUserRole === "TEACHER" &&
                editableCount !== undefined &&
                totalSubjects !== undefined && (
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <Eye className="w-4 h-4 text-white" />
                    <span className="text-sm font-bold text-white">
                      {editableCount}/{totalSubjects} កែបាន
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>
        <div className="text-right">
          {pasteMode ? (
            <p className="text-sm font-bold text-white/90">📋 Paste Mode</p>
          ) : (
            <p className="text-sm font-bold text-white/90">Auto-Save ✓</p>
          )}
          <p className="text-xs text-white/70 mt-1">
            {pasteMode
              ? "កែសម្រួល ហើយចុច រក្សាទុក"
              : "រក្សាទុកស្វ័យប្រវត្តិ • គណនាលទ្ធផលភ្លាមៗ"}
          </p>
        </div>
      </div>
    </div>
  );
}
