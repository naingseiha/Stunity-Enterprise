import { TokenManager } from '@/lib/api/auth';
import { ATTENDANCE_SERVICE_URL } from '@/lib/api/config';

export function attendanceAuditExportUrl(startDate: string, endDate: string): string {
  const qs = new URLSearchParams({ startDate, endDate }).toString();
  return `${ATTENDANCE_SERVICE_URL}/attendance/school/audit-export?${qs}`;
}

/**
 * Downloads combined teacher + learner attendance rows as UTF-8 CSV (Excel-friendly BOM).
 */
export async function downloadAttendanceAuditCsv(startDate: string, endDate: string): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error('Invalid date format');
  }

  const token = typeof window !== 'undefined' ? TokenManager.getAccessToken() : null;
  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(attendanceAuditExportUrl(startDate, endDate), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const ct = res.headers.get('content-type');
      if (ct?.includes('application/json')) {
        const body = (await res.json()) as { message?: string };
        if (body?.message) detail = body.message;
      }
    } catch {
      /* keep statusText */
    }
    throw new Error(detail || 'Export failed');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cd = res.headers.get('content-disposition');
  const match = cd?.match(/filename="([^"]+)"/);
  a.download = match?.[1] || `attendance-audit_${startDate}_${endDate}.csv`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
