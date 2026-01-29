"use client";

import { X, Shield, Crown, Check } from "lucide-react";

interface PermissionBadgeProps {
  permission: string;
  label: string;
  onRemove?: () => void;
  className?: string;
}

export function PermissionBadge({
  permission,
  label,
  onRemove,
  className = "",
}: PermissionBadgeProps) {
  const categoryColors: Record<string, string> = {
    VIEW_DASHBOARD: "bg-blue-100 text-blue-700 border-blue-200",
    MANAGE_STUDENTS: "bg-green-100 text-green-700 border-green-200",
    MANAGE_TEACHERS: "bg-purple-100 text-purple-700 border-purple-200",
    MANAGE_CLASSES: "bg-indigo-100 text-indigo-700 border-indigo-200",
    MANAGE_SUBJECTS: "bg-cyan-100 text-cyan-700 border-cyan-200",
    MANAGE_GRADES: "bg-pink-100 text-pink-700 border-pink-200",
    MANAGE_ATTENDANCE: "bg-amber-100 text-amber-700 border-amber-200",
    VIEW_REPORTS: "bg-teal-100 text-teal-700 border-teal-200",
    VIEW_AWARD_REPORT: "bg-yellow-100 text-yellow-700 border-yellow-200",
    VIEW_TRACKING_BOOK: "bg-orange-100 text-orange-700 border-orange-200",
    VIEW_SETTINGS: "bg-gray-100 text-gray-700 border-gray-200",
    MANAGE_ADMINS: "bg-red-100 text-red-700 border-red-200",
  };

  const colorClass = categoryColors[permission] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${colorClass} ${className}`}
    >
      <Check className="w-3 h-3" />
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
          type="button"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

interface SuperAdminBadgeProps {
  className?: string;
}

export function SuperAdminBadge({ className = "" }: SuperAdminBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-2 border-yellow-300 shadow-lg ${className}`}
    >
      <Crown className="w-4 h-4" />
      Super Admin
    </span>
  );
}

interface PermissionSummaryProps {
  permissionCount: number;
  isSuperAdmin?: boolean;
  className?: string;
}

export function PermissionSummary({
  permissionCount,
  isSuperAdmin,
  className = "",
}: PermissionSummaryProps) {
  if (isSuperAdmin) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Shield className="w-4 h-4 text-yellow-600" />
        <span className="font-medium text-yellow-600">All Permissions</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <Shield className="w-4 h-4 text-gray-500" />
      <span className="text-gray-600">
        {permissionCount} {permissionCount === 1 ? "Permission" : "Permissions"}
      </span>
    </div>
  );
}
