"use client";

import React, { useState } from "react";
import ResponsiveSidebar from "./ResponsiveSidebar";
import Header from "./Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleMobileMenuToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Responsive Sidebar */}
      <ResponsiveSidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with Hamburger Menu */}
        <Header onMenuClick={handleMobileMenuToggle} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
