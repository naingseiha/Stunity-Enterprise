'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSuperAdminUsers, getSuperAdminSchools, updateSuperAdminUser, SuperAdminUser } from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Home,
  School,
  Lock,
} from 'lucide-react';
import AdminResetPasswordModal from '@/components/AdminResetPasswordModal';
import { TokenManager } from '@/lib/api/auth';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
  STAFF: 'Staff',
};

export default function SuperAdminUsersPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);

  const fetchUsers = useCallback(async (page: number, searchText: string, schoolId: string, role: string) => {
    setLoading(true);
    try {
      const res = await getSuperAdminUsers({
        page,
        limit: 20,
        search: searchText || undefined,
        schoolId: schoolId || undefined,
        role: role || undefined,
      });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSuperAdminSchools({ limit: 500 })
      .then((r) => setSchools(r.data.schools.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => { });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchUsers(pagination.page, search, schoolFilter, roleFilter);
  }, [pagination.page, search, schoolFilter, roleFilter, fetchUsers]);

  const handleToggleActive = async (u: SuperAdminUser) => {
    setTogglingId(u.id);
    try {
      await updateSuperAdminUser(u.id, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 flex items-center gap-1">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Users</span>
        </nav>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={50}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-stunity-primary-100 rounded-xl">
              <Users className="h-8 w-8 text-stunity-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Platform Users</h1>
              <p className="text-gray-600 mt-1">Manage users across all schools</p>
            </div>
          </div>
        </div>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={100}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 text-gray-900"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={schoolFilter}
                onChange={(e) => { setSchoolFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
              >
                <option value="">All schools</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
              >
                <option value="">All roles</option>
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </AnimatedContent>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
      )}

      <AnimatedContent animation="slide-up" delay={150}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-stunity-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="px-8 py-20 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-semibold">No users found</p>
              <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">School</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/80">
                        <td className="px-6 py-4">
                          <Link href={`/${locale}/super-admin/users/${u.id}`} className="group block">
                            <p className="font-medium text-gray-900 group-hover:text-stunity-primary-600">{u.firstName} {u.lastName}</p>
                            <p className="text-sm text-gray-500">{u.email || '–'}</p>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          {u.school ? (
                            <Link href={`/${locale}/super-admin/schools/${u.school.id}`} className="text-stunity-primary-600 hover:underline flex items-center gap-1">
                              <School className="w-4 h-4" /> {u.school.name}
                            </Link>
                          ) : (
                            <span className="text-gray-400">–</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={togglingId === u.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${u.isActive
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {togglingId === u.id ? '…' : u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowResetModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200"
                            title="Reset Password"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
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

      {showResetModal && selectedUser && (
        <AdminResetPasswordModal
          user={{
            id: selectedUser.id,
            name: `${selectedUser.firstName} ${selectedUser.lastName}`,
            email: selectedUser.email || undefined,
          }}
          onClose={() => {
            setShowResetModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}
