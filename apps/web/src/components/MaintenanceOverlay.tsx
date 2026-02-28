'use client';

import { useState, useEffect } from 'react';
import { getFeatureFlagCheck } from '@/lib/api/super-admin';
import { TokenManager } from '@/lib/api/auth';
import { Wrench } from 'lucide-react';

export default function MaintenanceOverlay() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeatureFlagCheck('MAINTENANCE_MODE')
      .then((res) => {
        const enabled = res?.data?.enabled ?? false;
        if (!enabled) {
          setMaintenanceMode(false);
          setLoading(false);
          return;
        }
        const user = TokenManager.getUserData();
        if (user?.user?.isSuperAdmin) {
          setMaintenanceMode(false);
        } else {
          setMaintenanceMode(true);
        }
      })
      .catch(() => setMaintenanceMode(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !maintenanceMode) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/95 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center text-white">
        <div className="inline-flex p-4 rounded-full bg-amber-500/20 mb-6">
          <Wrench className="h-16 w-16 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Scheduled Maintenance</h1>
        <p className="text-gray-300 mb-6">
          We&apos;re currently performing scheduled maintenance. Please check back shortly.
        </p>
        <p className="text-sm text-gray-400">
          If you believe this is an error, please contact your platform administrator.
        </p>
      </div>
    </div>
  );
}
