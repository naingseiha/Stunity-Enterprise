'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight, Loader2, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import { TokenManager } from '@/lib/api/auth';
import { attendanceAPI, type AttendanceDelegation, type DisciplineCapabilityProfile, type DelegationScopeType } from '@/lib/api/attendance';
import { getClasses } from '@/lib/api/classes';
import { isSchoolAttendanceAdminRole } from '@/lib/permissions/schoolAttendance';

type RoleUser = { id: string; firstName: string; lastName: string; email?: string; role: string };

const capabilityOptions: Array<{ value: DisciplineCapabilityProfile; label: string }> = [
  { value: 'ATTENDANCE_APL', label: 'Attendance (A/P/L only)' },
  { value: 'DISCIPLINE_E', label: 'Discipline (E only)' },
  { value: 'FULL_ATTENDANCE', label: 'Full access (A/P/L/E)' },
];

const scopeOptions: Array<{ value: DelegationScopeType; label: string }> = [
  { value: 'CLASS', label: 'Class scope' },
  { value: 'GRADE', label: 'Grade scope' },
  { value: 'SCHOOL', label: 'School scope' },
];

const excusedReasonPresets = [
  'Medical appointment',
  'Family emergency',
  'Official school event',
  'Transport issue',
];

const field =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:border-cyan-400';

export default function DisciplineDelegationsPage() {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale || 'en';
  const userData = TokenManager.getUserData();
  const user = userData.user;
  const school = userData.school;
  const canManageDelegations = isSchoolAttendanceAdminRole(user?.role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [delegations, setDelegations] = useState<AttendanceDelegation[]>([]);
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; grade: number }>>([]);
  const [policyTemplates, setPolicyTemplates] = useState<string>('[]');
  const [policyMinLen, setPolicyMinLen] = useState<number>(3);
  const [policyEscalation, setPolicyEscalation] = useState<boolean>(false);
  const [rolloutEnabled, setRolloutEnabled] = useState<boolean>(true);
  const [form, setForm] = useState({
    assigneeUserId: '',
    responsibilityType: 'CUSTOM',
    capabilityProfile: 'ATTENDANCE_APL' as DisciplineCapabilityProfile,
    scopeType: 'CLASS' as DelegationScopeType,
    classId: '',
    grade: '',
    notes: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [delegationRows, usersRows, classRows, policy, rollout] = await Promise.all([
        attendanceAPI.getDelegations(),
        attendanceAPI.getDelegationUsers(),
        getClasses({ limit: 500 }),
        attendanceAPI.getDisciplinePolicy(),
        attendanceAPI.getDelegationRollout(),
      ]);
      setDelegations(delegationRows);
      setUsers(usersRows);
      setClasses((classRows?.data?.classes || []).map((c: any) => ({ id: c.id, name: c.name, grade: Number(c.grade) })));
      setPolicyTemplates(JSON.stringify(policy?.allowedExcusedReasonTemplates || [], null, 2));
      setPolicyMinLen(policy?.mandatoryExcusedReasonMinLength || 3);
      setPolicyEscalation(Boolean(policy?.requireEscalationForExcused));
      setRolloutEnabled(Boolean(rollout?.enabled));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    if (!canManageDelegations) {
      setLoading(false);
      return;
    }
    void loadAll();
  }, [locale, router, loadAll, canManageDelegations]);

  const canCreate = useMemo(() => {
    if (!form.assigneeUserId) return false;
    if (form.scopeType === 'CLASS' && !form.classId) return false;
    if (form.scopeType === 'GRADE' && !form.grade) return false;
    return true;
  }, [form]);

  const handleCreate = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      await attendanceAPI.createDelegation({
        assigneeUserId: form.assigneeUserId,
        responsibilityType: form.responsibilityType as any,
        capabilityProfile: form.capabilityProfile,
        scopeType: form.scopeType,
        classId: form.scopeType === 'CLASS' ? form.classId : null,
        grade: form.scopeType === 'GRADE' ? form.grade : null,
        notes: form.notes || null,
      });
      await loadAll();
      setForm({
        assigneeUserId: '',
        responsibilityType: 'CUSTOM',
        capabilityProfile: 'ATTENDANCE_APL',
        scopeType: 'CLASS',
        classId: '',
        grade: '',
        notes: '',
      });
    } catch (error: any) {
      alert(error?.message || 'Failed to create delegation');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row: AttendanceDelegation) => {
    try {
      await attendanceAPI.updateDelegation(row.id, { isActive: !row.isActive });
      await loadAll();
    } catch (error: any) {
      alert(error?.message || 'Failed to update delegation');
    }
  };

  const savePolicy = async () => {
    setSaving(true);
    try {
      const parsed = JSON.parse(policyTemplates);
      await attendanceAPI.saveDisciplinePolicy({
        allowedExcusedReasonTemplates: Array.isArray(parsed) ? parsed : [],
        mandatoryExcusedReasonMinLength: policyMinLen,
        requireEscalationForExcused: policyEscalation,
      } as any);
      await loadAll();
    } catch (error: any) {
      alert(error?.message || 'Failed to save discipline policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <UnifiedNavigation user={user} school={school} onLogout={() => router.push(`/${locale}/auth/login`)} />
      <div className="lg:ml-64 min-h-screen relative overflow-hidden">
        <div className="pointer-events-none absolute top-[-10%] left-[-5%] h-[40%] w-[40%] rounded-full bg-cyan-500/5 blur-[100px] dark:bg-cyan-600/10" />
        <div className="pointer-events-none absolute right-[-5%] bottom-[20%] h-[30%] w-[30%] rounded-full bg-indigo-500/5 blur-[100px] dark:bg-indigo-600/10" />

        <main className="relative z-10 mx-auto max-w-7xl px-4 pt-4 pb-12 sm:px-6 lg:px-8">
          <AnimatedContent animation="slide-up">
            <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="mb-4 flex items-center gap-1 text-sm font-bold text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" /> Back
                </button>
                <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                  <span className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-600 dark:text-cyan-400">
                    <ShieldCheck className="h-6 w-6" />
                  </span>
                  Discipline delegations
                </h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  Assign class leader and discipline responsibilities with scoped attendance permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadAll()}
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900 dark:text-slate-200 dark:hover:bg-gray-800"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </AnimatedContent>

          {!canManageDelegations ? (
            <div className="min-h-[320px] rounded-[2.5rem] border border-slate-200 bg-white p-10 text-center shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] dark:border-gray-800/50 dark:bg-gray-900/80">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Access restricted</h2>
              <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                This screen is available for school attendance administrators only.
              </p>
            </div>
          ) : loading ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-[2.5rem] border border-slate-200 bg-white dark:border-gray-800/50 dark:bg-gray-900/80">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                <AnimatedContent animation="slide-up">
                  <section className="h-full space-y-5 rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-8 dark:border-gray-800/50 dark:bg-gray-900/80">
                  <div className="border-b border-slate-100 pb-4 dark:border-gray-800">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Create</p>
                    <h2 className="mt-1 text-lg font-black text-slate-800 dark:text-white">New delegation</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Assignee</label>
                      <select className={field} value={form.assigneeUserId} onChange={(e) => setForm((p) => ({ ...p, assigneeUserId: e.target.value }))}>
                        <option value="">Select user</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.lastName} {u.firstName} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Capabilities</label>
                      <select className={field} value={form.capabilityProfile} onChange={(e) => setForm((p) => ({ ...p, capabilityProfile: e.target.value as DisciplineCapabilityProfile }))}>
                        {capabilityOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Scope</label>
                      <select className={field} value={form.scopeType} onChange={(e) => setForm((p) => ({ ...p, scopeType: e.target.value as DelegationScopeType }))}>
                        {scopeOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {form.scopeType === 'CLASS' ? (
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Class</label>
                        <select className={field} value={form.classId} onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}>
                          <option value="">Select class</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} (Grade {c.grade})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {form.scopeType === 'GRADE' ? (
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Grade</label>
                        <input className={field} placeholder="e.g. 10" value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))} />
                      </div>
                    ) : null}
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Responsibility type</label>
                      <input
                        className={field}
                        placeholder="e.g. CLASS_LEADER, DISCIPLINE_COUNCIL"
                        value={form.responsibilityType}
                        onChange={(e) => setForm((p) => ({ ...p, responsibilityType: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Notes</label>
                      <input className={field} placeholder="Optional notes for administrators" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                    </div>
                  </div>
                  <button
                    disabled={!canCreate || saving}
                    onClick={handleCreate}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-600 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Create delegation
                  </button>
                  </section>
                </AnimatedContent>

                <AnimatedContent animation="slide-up">
                  <section className="h-full rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-8 dark:border-gray-800/50 dark:bg-gray-900/80">
                  <div className="border-b border-slate-100 pb-4 dark:border-gray-800">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Directory</p>
                    <h2 className="mt-1 text-lg font-black text-slate-800 dark:text-white">Active delegations</h2>
                  </div>
                  <div className="mt-6 space-y-3">
                    {delegations.map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-800/40"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white">
                            {row.assigneeUser?.lastName} {row.assigneeUser?.firstName}{' '}
                            <span className="font-mono text-sm font-semibold text-cyan-600 dark:text-cyan-400">{row.capabilityProfile}</span>
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                            Scope: {row.scopeType}
                            {row.class?.name ? ` · ${row.class.name}` : ''}
                            {row.grade ? ` · Grade ${row.grade}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleToggle(row)}
                          className={`rounded-xl px-4 py-2 text-sm font-bold ${row.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300'}`}
                        >
                          {row.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    ))}
                    {delegations.length === 0 ? <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No delegations yet.</p> : null}
                  </div>
                  </section>
                </AnimatedContent>
              </div>

              <AnimatedContent animation="slide-up">
                <section className="space-y-5 rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-8 dark:border-gray-800/50 dark:bg-gray-900/80">
                  <div className="border-b border-slate-100 pb-4 dark:border-gray-800">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Policy</p>
                    <h2 className="mt-1 text-lg font-black text-slate-800 dark:text-white">Discipline policy & rollout</h2>
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
                    <p className="font-bold">How to use</p>
                    <p className="mt-1">
                      Turn <span className="font-semibold">rollout ON</span> only when you are ready for delegated users to write attendance. Keep it OFF to disable delegated writes globally for your school.
                    </p>
                    <p className="mt-2">
                      Set <span className="font-semibold">reason templates</span> and <span className="font-semibold">minimum reason length</span> to control the quality of Excused (E) remarks. Enable escalation when every Excused mark should be reviewed by management.
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      checked={rolloutEnabled}
                      onChange={async (e) => {
                        const next = e.target.checked;
                        setRolloutEnabled(next);
                        try {
                          await attendanceAPI.setDelegationRollout(next);
                        } catch (error: any) {
                          alert(error?.message || 'Failed to update rollout');
                          setRolloutEnabled(!next);
                        }
                      }}
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Enable delegated attendance rollout</span>
                  </label>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Allowed excused-reason templates (JSON array)</label>
                    <div className="mt-2 mb-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPolicyTemplates(JSON.stringify(excusedReasonPresets, null, 2))}
                        className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-200 dark:hover:bg-cyan-900/30"
                      >
                        Use common presets
                      </button>
                      <button
                        type="button"
                        onClick={() => setPolicyTemplates('[]')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900 dark:text-slate-300 dark:hover:bg-gray-800"
                      >
                        Clear templates
                      </button>
                    </div>
                    <textarea
                      className={`${field} mt-1 min-h-[128px] font-mono text-xs leading-relaxed`}
                      value={policyTemplates}
                      onChange={(e) => setPolicyTemplates(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Minimum reason length</label>
                      <input type="number" className={field} value={policyMinLen} onChange={(e) => setPolicyMinLen(Number(e.target.value || 0))} />
                    </div>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30 md:mt-7">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={policyEscalation} onChange={(e) => setPolicyEscalation(e.target.checked)} />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Require escalation for excused marks</span>
                    </label>
                  </div>
                  <button
                    disabled={saving}
                    type="button"
                    onClick={() => void savePolicy()}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    Save policy
                  </button>
                </section>
              </AnimatedContent>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
