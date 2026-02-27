'use client';

/**
 * Claim Codes Management Page
 */

import { useState, useEffect } from 'react';
import { Plus, Download, Search, Upload, RefreshCw, ChevronRight, Ticket, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { claimCodeService, type ClaimCode, type ClaimCodeStats } from '@/lib/api/claimCodes';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { TokenManager } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import GenerateCodesModal from '@/components/claim-codes/GenerateCodesModal';
import BulkUploadModal from '@/components/claim-codes/BulkUploadModal';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';

export default function ClaimCodesPage() {
  const router = useRouter();
  const { schoolId } = useAcademicYear();
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [codes, setCodes] = useState<ClaimCode[]>([]);
  const [stats, setStats] = useState<ClaimCodeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const user = TokenManager.getUserData().user;
  const school = TokenManager.getUserData().school;

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push('/en/login');
  };

  const loadData = async (refresh = false) => {
    if (!schoolId) return; // Guard clause

    if (refresh) setIsRefreshing(true);
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
      if (refresh) setIsRefreshing(false);
    }
  };

  // HOOKS MUST BE BEFORE ANY CONDITIONAL RETURNS
  useEffect(() => {
    loadData();
  }, [typeFilter, statusFilter, page, schoolId]);

  // Show loading if no schoolId - AFTER all hooks
  if (!schoolId) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="lg:ml-64 min-h-screen bg-[#f8fafc]">
          <main className="p-6 lg:p-8">
            <div className="text-center">
              <p className="text-gray-500">Loading school information...</p>
            </div>
          </main>
        </div>
      </>
    );
  }

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
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen bg-[#f8fafc]">
        <main className="p-6 lg:p-8 max-w-[1600px] mx-auto">

          {/* Page Header - Clean & Minimal */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>Admin</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-gray-900">Claim Codes</span>
                  </div>
                  <h1 className="text-2xl font-semibold text-gray-900">Claim Codes</h1>
                  <p className="text-gray-500 mt-1">
                    Generate and manage claim codes for students and teachers
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => loadData(true)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                  <button
                    onClick={() => setBulkUploadModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <Upload className="h-4 w-4" />
                    Bulk Upload
                  </button>
                  <button
                    onClick={() => setGenerateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Generate Codes
                  </button>
                </div>
              </div>
            </div>
          </AnimatedContent>

          {/* Statistics Cards */}
          <AnimatedContent animation="slide-up" delay={50}>
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active Codes</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.active}</p>
                    </div>
                    <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Claimed</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.claimed}</p>
                    </div>
                    <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Expired</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.expired}</p>
                    </div>
                    <div className="h-10 w-10 bg-amber-50 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AnimatedContent>

          {/* Filters */}
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
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
                  className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="claimed">Claimed</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
            </div>
          </AnimatedContent>

          {/* Codes Table */}
          <AnimatedContent animation="slide-up" delay={150}>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">Loading claim codes...</p>
                </div>
              ) : codes.length === 0 ? (
                <div className="p-12 text-center">
                  <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-1">No claim codes found</p>
                  <p className="text-sm text-gray-400">Try adjusting your filters or generate new codes</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Code
                          </th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Expires
                          </th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Assigned To
                          </th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Claimed By
                          </th>
                          <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {codes.map((code, index) => (
                          <tr
                            key={code.id}
                            className="hover:bg-gray-50 transition-colors"
                            style={{
                              animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                            }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono text-sm font-semibold text-gray-900">
                                {code.code}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getTypeBadge(code.type)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(code)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(code.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(code.expiresAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {code.student ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs">
                                    {code.student.firstName[0]}
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {code.student.firstName} {code.student.lastName}
                                  </span>
                                </div>
                              ) : code.teacher ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-semibold text-xs">
                                    {code.teacher.firstName[0]}
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {code.teacher.firstName} {code.teacher.lastName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {code.claimedByUser ? (
                                <span className="text-gray-900">{code.claimedByUser.email}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRevoke(code.id)}
                                disabled={!!code.revokedAt || !!code.claimedAt}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </AnimatedContent>
        </main>
      </div>

      {/* Generate Modal */}
      <GenerateCodesModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        onCodesGenerated={loadData}
        schoolId={schoolId}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={bulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        onSuccess={loadData}
        schoolId={schoolId}
      />

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
