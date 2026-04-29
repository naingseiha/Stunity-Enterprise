'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
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
        if (user?.user?.isSuperAdmin || user?.user?.role === 'SUPER_ADMIN') {
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
        <h1 className="text-2xl font-bold mb-2"><AutoI18nText i18nKey="auto.web.components_MaintenanceOverlay.k_499a7433" /></h1>
        <p className="text-gray-300 mb-6">
          <AutoI18nText i18nKey="auto.web.components_MaintenanceOverlay.k_49979706" />
        </p>
        <p className="text-sm text-gray-400">
          <AutoI18nText i18nKey="auto.web.components_MaintenanceOverlay.k_ddc3d019" />
        </p>
      </div>
    </div>
  );
}
