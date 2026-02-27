'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSuperAdminAuditLogs, PlatformAuditLog } from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import {
  FileText,
  Home,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

const RESOURCE_LABELS: Record<string, string> = {
  SCHOOL: 'School',
  USER: 'User',
};

const ACTION_LABELS: Record<string, string> = {
  SCHOOL_CREATE: 'Created school',
  SCHOOL_UPDATE: 'Updated school',
  SCHOOL_DELETE: 'Deleted school',
  USER_ACTIVATE: 'Activated user',
  USER_DEACTIVATE: 'Deactivated user',
};

export default function SuperAdminAuditLogsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [resourceFilter, setResourceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSuperAdminAuditLogs({
        page: pagination.page,
        limit: 50,
        resourceType: resourceFilter || undefined,
        action: actionFilter || undefined,
      });
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, resourceFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [resourceFilter, actionFilter]);

  return (
    <div className="space-y-6">
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 flex items-center gap-1">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Audit Logs</span>
        </nav>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={50}>
        <div className="flex items-center gap-4">
          <div className="p-4 bg-stunity-primary-100 rounded-xl">
            <FileText className="h-8 w-8 text-stunity-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Platform Audit Logs</h1>
            <p className="text-gray-600 mt-1">Track super admin actions across the platform</p>
          </div>
        </div>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={100}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4">
          <div className="flex gap-3">
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
            >
              <option value="">All resources</option>
              <option value="SCHOOL">School</option>
              <option value="USER">User</option>
            </select>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
            >
              <option value="">All actions</option>
              {Object.entries(ACTION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </AnimatedContent>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
      )}

      <AnimatedContent animation="slide-up" delay={150}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="flex justify-center py-24">
              <div className="w-12 h-12 border-4 border-stunity-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="px-8 py-20 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-semibold">No audit logs</p>
              <p className="text-gray-500 mt-2">Actions will appear here as you manage the platform</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Actor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Resource</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/80">
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          {log.actor ? (
                            <span className="font-medium text-gray-900">
                              {log.actor.firstName} {log.actor.lastName}
                            </span>
                          ) : (
                            <span className="text-gray-400">–</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">{RESOURCE_LABELS[log.resourceType] || log.resourceType}</span>
                          {log.resourceId && (
                            <span className="text-gray-400 ml-1">({log.resourceId.slice(0, 8)}…)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {log.details && typeof log.details === 'object'
                            ? JSON.stringify(log.details)
                            : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                      disabled={pagination.page <= 1}
                      className="p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </AnimatedContent>
    </div>
  );
}
