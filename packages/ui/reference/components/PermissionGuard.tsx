"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/lib/permissions";
import { Loader2, ShieldAlert } from "lucide-react";

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: Permission;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * Permission Guard Component
 * Protects routes by checking if user has required permission
 * Redirects to /unauthorized or custom path if permission denied
 */
export function PermissionGuard({
  children,
  requiredPermission,
  redirectTo = "/unauthorized",
  fallback,
}: PermissionGuardProps) {
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const isAuthorized = isSuperAdmin || hasPermission(requiredPermission);

  useEffect(() => {
    if (!isAuthorized) {
      // Redirect after a brief delay to show unauthorized message
      const timer = setTimeout(() => {
        router.push(redirectTo);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthorized, redirectTo, router]);

  if (!isAuthorized) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500">Redirecting...</p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

/**
 * Simple permission check for inline conditional rendering
 */
export function RequirePermission({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission: Permission;
}) {
  const { hasPermission, isSuperAdmin } = usePermissions();
  
  if (isSuperAdmin || hasPermission(permission)) {
    return <>{children}</>;
  }
  
  return null;
}
