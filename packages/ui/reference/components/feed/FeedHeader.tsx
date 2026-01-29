"use client";

import { Search, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import StunityLogo from "@/components/common/StunityLogo";
import NotificationBell from "@/components/notifications/NotificationBell";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function FeedHeader() {
  const { currentUser, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const getUserProfilePicture = () => {
    return currentUser?.profilePictureUrl;
  };

  const getUserInitial = () => {
    if (currentUser?.student?.khmerName) {
      return currentUser.student.khmerName.charAt(0);
    }
    if (currentUser?.teacher?.khmerName) {
      return currentUser.teacher.khmerName.charAt(0);
    }
    return currentUser?.firstName?.charAt(0) || 'U';
  };

  const handleLogout = () => {
    setShowMenu(false);
    logout();
  };

  return (
    <div className="sticky top-0 z-30 bg-white shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between max-w-3xl mx-auto">
        {/* Profile Picture with Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="flex-shrink-0"
          >
            {getUserProfilePicture() ? (
              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-500/20">
                <Image
                  src={getUserProfilePicture()!}
                  alt="Profile"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {getUserInitial()}
              </div>
            )}
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)}
              />
              
              {/* Menu */}
              <div className="absolute left-0 top-12 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[200px] z-50">
                <Link
                  href={`/profile/${currentUser?.id}`}
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {getUserProfilePicture() ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-500/20">
                      <Image
                        src={getUserProfilePicture()!}
                        alt="Profile"
                        width={40}
                        height={40}
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                      {getUserInitial()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">View Profile</p>
                  </div>
                </Link>
                
                <div className="border-t border-gray-100 my-2" />
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-red-600 font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Logo & Actions */}
        <div className="flex items-center gap-2">
          <StunityLogo size="sm" showText={true} />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Search className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
}
