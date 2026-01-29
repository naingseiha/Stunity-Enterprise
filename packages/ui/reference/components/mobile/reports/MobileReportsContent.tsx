// 📂 src/components/mobile/reports/MobileReportsContent.tsx

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useDeviceType } from "@/lib/utils/deviceDetection";
import MobileReportsDashboard from "@/components/mobile/reports/MobileReportsDashboard";
import MobileMonthlyReport from "@/components/mobile/reports/MobileMonthlyReport";
import MobileSubjectDetailsReport from "@/components/mobile/reports/MobileSubjectDetailsReport";
import { Loader2 } from "lucide-react";

export default function MobileReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // ✅ Now safely wrapped in Suspense
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const deviceType = useDeviceType();

  // Check what view to show based on URL params
  const viewType = searchParams.get("view");
  const hasClass = searchParams.has("class");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Redirect desktop users
  useEffect(() => {
    if (deviceType === "desktop" || deviceType === "tablet") {
      router.push("/reports/monthly");
    }
  }, [deviceType, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">កំពុងពិនិត្យ...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Route to appropriate view
  if (viewType === "subject-details" && hasClass) {
    return <MobileSubjectDetailsReport />;
  } else if (hasClass && !viewType) {
    return <MobileMonthlyReport />;
  } else {
    return <MobileReportsDashboard />;
  }
}
