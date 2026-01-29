"use client";

import { useDeviceType } from "@/lib/utils/deviceDetection";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileLayout from "./MobileLayout";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  mobileTitle: string;
  className?: string;
}

export default function ResponsiveLayout({
  children,
  mobileTitle,
  className = "p-8",
}: ResponsiveLayoutProps) {
  const deviceType = useDeviceType();

  // Mobile layout (< 768px)
  if (deviceType === "mobile") {
    return <MobileLayout title={mobileTitle}>{children}</MobileLayout>;
  }

  // Desktop layout (>= 768px)
  // Fixed layout: sidebar and header stay in place, only content scrolls
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <Header />
        <main className={`flex-1 overflow-y-auto min-h-0 ${className}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
