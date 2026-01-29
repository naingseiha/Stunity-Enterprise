"use client";

import { useAuth } from "@/context/AuthContext";
import { LogOut, Bell, Menu } from "lucide-react";
import StunityLogo from "@/components/common/StunityLogo";

interface MobileHeaderProps {
  title: string;
  showMenu?: boolean;
  onMenuClick?: () => void;
}

export default function MobileHeader({
  title,
  showMenu = false,
  onMenuClick,
}: MobileHeaderProps) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 safe-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Menu or Logo + Title */}
        <div className="flex items-center gap-2">
          {showMenu && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 touch-target touch-feedback"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <StunityLogo size="sm" />
          <h1 className="text-base font-semibold text-gray-800 truncate">
            {title}
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            className="p-2 touch-target touch-feedback relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {/* Notification badge (example) */}
            {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span> */}
          </button>
          <button
            onClick={logout}
            className="p-2 touch-target touch-feedback"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  );
}
