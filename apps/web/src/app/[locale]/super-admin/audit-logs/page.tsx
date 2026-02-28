'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getSuperAdminAuditLogs,
  getSuperAdminAuditLogRetentionPolicy,
  runSuperAdminAuditLogCleanup,
  PlatformAuditLog,
  AuditLogRetentionPolicy,
} from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import {
  FileText,
  Home,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Loader2,
  Shield,
} from 'lucide-react';

const RESOURCE_LABELS: Record<string, string> = {
  SCHOOL: 'School',
  USER: 'User',
};

const ACTION_LABELS: Record<string, string> = {
  SCHOOL_CREATE: 'Created school',
  SCHOOL_UPDATE: 'Updated school',
  SCHOOL_DELETE: 'Deleted school',
  SCHOOL_APPROVE: 'Approved school registration',
  SCHOOL_REJECT: 'Rejected school registration',
  USER_ACTIVATE: 'Activated user',
  USER_DEACTIVATE: 'Deactivated user',
  AUDIT_LOG_CLEANUP: 'Audit log cleanup',
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
  const [retentionPolicy, setRetentionPolicy] = useState<AuditLogRetentionPolicy | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupSuccess, setCleanupSuccess] = useState<string | null>(null);

  useEffect(() => {
    getSuperAdminAuditLogRetentionPolicy()
      .then((res) => setRetentionPolicy(res.data))
      .catch(() => {});
  }, []);

  const handleRunCleanup = async () => {
    if (!confirm('Delete audit logs older than the retention period? This cannot be undone.')) return;
    setCleanupLoading(true);
    setCleanupSuccess(null);
    try {
      const res = await runSuperAdminAuditLogCleanup();
      setCleanupSuccess(`Deleted ${res.data.deletedCount} log(s) older than ${res.data.olderThanDays} days.`);
      fetchLogs(1, resourceFilter, actionFilter);
      getSuperAdminAuditLogRetentionPolicy().then((r) => setRetentionPolicy(r.data));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCleanupLoading(false);
    }
  };

  const fetchLogs = useCallback(async (page: number, resourceType: string, action: string) => {
    setLoading(true);
    try {
      const res = await getSuperAdminAuditLogs({
        page,
        limit: 50,
        resourceType: resourceType || undefined,
        action: action || undefined,
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
  }, []);

  const forcePage1Ref = useRef(false);
  // When filters change, reset to page 1 and set flag for fetch
  useEffect(() => {
    forcePage1Ref.current = true;
    setPagination((p) => (p.page === 1 ? p : { ...p, page: 1 }));
  }, [resourceFilter, actionFilter]);

  // Fetch when pagination or filters change. Use page 1 when filters just changed.
  useEffect(() => {
    const pageToFetch = forcePage1Ref.current ? 1 : pagination.page;
    if (forcePage1Ref.current) forcePage1Ref.current = false;
    fetchLogs(pageToFetch, resourceFilter, actionFilter);
  }, [pagination.page, resourceFilter, actionFilter, fetchLogs]);

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

      {retentionPolicy && (
        <AnimatedContent animation="slide-up" delay={75}>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Retention Policy</h3>
                <p className="text-sm text-gray-500">
                  Logs are retained for <strong>{retentionPolicy.retentionDays} days</strong>.
                  {retentionPolicy.logsOlderThanRetention > 0 && (
                    <> <strong>{retentionPolicy.logsOlderThanRetention}</strong> log(s) are older than the retention period.</>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleRunCleanup}
              disabled={cleanupLoading || retentionPolicy.logsOlderThanRetention === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {cleanupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Run cleanup
            </button>
          </div>
          {cleanupSuccess && (
            <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 text-sm font-medium">
              {cleanupSuccess}
            </div>
          )}
        </AnimatedContent>
      )}

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
