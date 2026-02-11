'use client';

/**
 * Claim Codes Management Page
 */

import { useState, useEffect } from 'react';
import { Plus, Download, Search } from 'lucide-react';
import { claimCodeService, type ClaimCode, type ClaimCodeStats } from '@/lib/api/claimCodes';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import GenerateCodesModal from '@/components/claim-codes/GenerateCodesModal';

export default function ClaimCodesPage() {
  const { schoolId } = useAcademicYear();
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [codes, setCodes] = useState<ClaimCode[]>([]);
  const [stats, setStats] = useState<ClaimCodeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Show loading if no schoolId
  if (!schoolId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-gray-500">Loading school information...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, [typeFilter, statusFilter, page, schoolId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load codes
      const params: any = { page, limit: 20 };
      if (typeFilter !== 'all') params.type = typeFilter.toUpperCase();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const { codes: fetchedCodes, pages } = await claimCodeService.list(schoolId, params);
      setCodes(fetchedCodes);
      setTotalPages(pages);

      // Load stats
      const fetchedStats = await claimCodeService.getStats(schoolId);
      setStats(fetchedStats);
    } catch (error) {
      console.error('Failed to load claim codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await claimCodeService.export(schoolId, {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claim-codes-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getStatusBadge = (code: ClaimCode) => {
    const now = new Date();
    if (code.revokedAt) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Revoked</span>;
    }
    if (code.claimedAt) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Claimed</span>;
    }
    if (new Date(code.expiresAt) < now) {
      return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">Expired</span>;
    }
    if (code.isActive) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Inactive</span>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      STUDENT: 'bg-blue-100 text-blue-800',
      TEACHER: 'bg-purple-100 text-purple-800',
      STAFF: 'bg-yellow-100 text-yellow-800',
      PARENT: 'bg-pink-100 text-pink-800',
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${colors[type]}`}>{type}</span>;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claim Codes</h1>
          <p className="text-gray-600 mt-1">
            Generate and manage claim codes for students and teachers
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Generate Codes
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Active Codes</p>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Claimed</p>
            <p className="text-3xl font-bold text-blue-600">{stats.claimed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Expired</p>
            <p className="text-3xl font-bold text-orange-600">{stats.expired}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="staff">Staff</option>
            <option value="parent">Parent</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="claimed">Claimed</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Claim Codes</h2>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <p>Loading...</p>
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No claim codes found</p>
              <p className="text-sm">Generate your first claim codes to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Expires</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Claimed By</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr key={code.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm font-medium">{code.code}</td>
                      <td className="py-3 px-4">{getTypeBadge(code.type)}</td>
                      <td className="py-3 px-4">{getStatusBadge(code)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(code.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(code.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {code.claimedByUser
                          ? `${code.claimedByUser.firstName} ${code.claimedByUser.lastName}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="flex items-center px-4">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Codes Modal */}
      <GenerateCodesModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        onCodesGenerated={loadData}
        schoolId={schoolId}
      />
    </div>
  );
}
