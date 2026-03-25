'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { ATTENDANCE_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent from '@/components/AnimatedContent';
import { useSchoolLocations } from '@/hooks/useSchoolLocations';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Globe,
  Home,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

function LazyLocationMap({
  latitude,
  longitude,
  title,
}: {
  latitude: number;
  longitude: number;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={containerRef} className="relative h-48 overflow-hidden rounded-t-[1.25rem] bg-slate-100 dark:bg-gray-950">
      {shouldLoad ? (
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0 }}
          src={`https://maps.google.com/maps?q=${latitude},${longitude}&t=m&z=17&ie=UTF8&iwloc=&output=embed`}
          allowFullScreen
          loading="lazy"
          className="h-full w-full grayscale-[0.55] transition-all duration-700 group-hover:grayscale-0"
          title={`Map preview for ${title}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-sky-50 dark:from-gray-900 dark:via-gray-950 dark:to-slate-950">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm ring-1 ring-slate-200/70 dark:bg-gray-900 dark:text-sky-300 dark:ring-gray-800/70">
              <MapPin className="h-6 w-6" />
            </div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
              Preparing map
            </p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/60 to-transparent dark:from-gray-900 dark:via-gray-900/40" />
      <div className="absolute left-5 top-5">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/55 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
          Active zone
        </span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'sky' | 'emerald' | 'slate';
}) {
  const tones = {
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/70 to-cyan-50/75 shadow-sky-100/35',
    emerald: 'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/75 shadow-emerald-100/35',
    slate: 'border-slate-200/80 bg-gradient-to-br from-white via-slate-50/90 to-slate-100/80 shadow-slate-200/35',
  };

  return (
    <div className={`rounded-[1.2rem] border p-5 shadow-xl ring-1 ring-white/60 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15 dark:ring-gray-800/70 ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">{helper}</p>
    </div>
  );
}

export default function LocationsManagementPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [newRadius, setNewRadius] = useState('50');

  const { locations, isLoading, mutate } = useSchoolLocations();

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewName('');
    setNewLat('');
    setNewLng('');
    setNewRadius('50');
    setError('');
  };

  const handleCreateLocation = async () => {
    if (!newName || !newLat || !newLng || !newRadius) {
      setError('Please fill all fields');
      return;
    }

    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    const rad = parseInt(newRadius, 10);

    if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(rad)) {
      setError('Latitude, longitude, and radius must be valid numbers');
      return;
    }

    try {
      setSubmitting(true);
      const token = TokenManager.getAccessToken();

      const response = await fetch(`${ATTENDANCE_SERVICE_URL}/attendance/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
          latitude: lat,
          longitude: lng,
          radius: rad,
        }),
      });

      const data = await response.json();

      if (data.success) {
        closeCreateModal();
        setSuccessMessage('Location added successfully');
        await mutate();
        window.setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to add location');
      }
    } catch (err: any) {
      setError(`Error creating location: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"? Teachers will no longer be able to check in here.`)) return;

    try {
      setSubmitting(true);
      const token = TokenManager.getAccessToken();

      const response = await fetch(`${ATTENDANCE_SERVICE_URL}/attendance/locations/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Location removed successfully');
        setError('');
        await mutate();
        window.setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to delete location');
      }
    } catch (err: any) {
      setError(`Error deleting location: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const averageRadius = locations.length
    ? Math.round(locations.reduce((sum, location) => sum + location.radius, 0) / locations.length)
    : 0;
  const largestRadius = locations.length ? Math.max(...locations.map((location) => location.radius)) : 0;

  if (isLoading && locations.length === 0) {
    return <PageSkeleton user={user} school={school} type="cards" showFilters={false} />;
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_35%),linear-gradient(180deg,_#f8fbfd_0%,_#f8fafc_50%,_#f8fafc_100%)] transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="grid gap-5 xl:grid-cols-12">
              <div className="relative overflow-hidden rounded-[1.65rem] border border-white/70 bg-white/88 p-6 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/82 dark:ring-gray-800/70 xl:col-span-8 sm:p-7">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-56 bg-gradient-to-l from-sky-100/60 to-transparent blur-3xl dark:from-sky-500/10" />
                <div className="relative z-10">
                  <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                    <Link href={`/${locale}/dashboard`} className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-700 dark:hover:text-gray-300">
                      <Home className="h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <span className="transition-colors hover:text-slate-700 dark:hover:text-gray-300">Settings</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-slate-900 dark:text-white">Locations</span>
                  </nav>

                  <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                        <Settings className="h-3.5 w-3.5" />
                        Attendance Locations
                      </div>
                      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-[2.2rem]">
                        Campus Access Zones
                      </h1>
                      <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-gray-400 sm:text-[15px]">
                        Define where staff can check in, keep the perimeter list clean, and manage location coverage with a simpler enterprise view.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => void mutate()}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                      >
                        <RefreshCw className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:-translate-y-0.5"
                      >
                        <Plus className="h-4 w-4" />
                        Add Location
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                      {locations.length} active zones
                    </span>
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                      Attendance security
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                      Geo perimeter
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.65rem] border border-sky-300/85 bg-gradient-to-br from-slate-950 via-sky-900 to-indigo-900 p-6 text-white shadow-[0_34px_90px_-38px_rgba(14,165,233,0.34)] ring-1 ring-sky-300/25 xl:col-span-4 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-100/70">Coverage Status</p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">{locations.length}</span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/70">zones</span>
                      </div>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/15 bg-white/10 p-3 shadow-sm backdrop-blur-md">
                      <ShieldCheck className="h-5 w-5 text-sky-100" />
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(locations.length * 20, locations.length ? 12 : 0))}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[0.95rem] border border-white/12 bg-white/10 p-3 shadow-sm backdrop-blur-md">
                      <p className="text-xl font-black tracking-tight">{locations.length}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/70">Active</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/12 bg-white/10 p-3 shadow-sm backdrop-blur-md">
                      <p className="text-xl font-black tracking-tight">{averageRadius || '-'}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/70">Avg m</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-white/12 bg-white/10 p-3 shadow-sm backdrop-blur-md">
                      <p className="text-xl font-black tracking-tight">{largestRadius || '-'}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/70">Max m</p>
                    </div>
                  </div>

                  <div className="mt-4 inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-50 shadow-sm backdrop-blur-md">
                    Ready for attendance verification
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={40}>
            <section className="mt-5 grid gap-4 md:grid-cols-3">
              <MetricCard label="Zone Count" value={locations.length} helper="Configured attendance check-in points." tone="sky" />
              <MetricCard label="Average Radius" value={averageRadius ? `${averageRadius}m` : '-'} helper="Typical permitted range per location." tone="emerald" />
              <MetricCard label="Largest Radius" value={largestRadius ? `${largestRadius}m` : '-'} helper="Highest perimeter currently deployed." tone="slate" />
            </section>
          </AnimatedContent>

          {error ? (
            <AnimatedContent animation="slide-up" delay={60}>
              <div className="mt-5 flex items-start justify-between gap-4 rounded-[1rem] border border-rose-100 bg-rose-50/85 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button type="button" onClick={() => setError('')} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          {successMessage ? (
            <AnimatedContent animation="slide-up" delay={70}>
              <div className="mt-5 flex items-start justify-between gap-4 rounded-[1rem] border border-emerald-100 bg-emerald-50/85 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
                <button type="button" onClick={() => setSuccessMessage('')} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent animation="slide-up" delay={80}>
            <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/88 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/82 dark:ring-gray-800/70">
              <div className="border-b border-slate-200/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">Directory</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Location Workspace</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Review live campus zones, inspect coordinates, and remove locations that should no longer accept attendance events.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4" />
                    New Location
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {locations.length === 0 ? (
                  <div className="rounded-[1.25rem] border border-slate-200/70 bg-slate-50/70 px-6 py-16 text-center dark:border-gray-800/70 dark:bg-gray-950/60">
                    <MapPin className="mx-auto h-12 w-12 text-slate-300 dark:text-gray-700" />
                    <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No locations configured</p>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Add your first campus zone to activate attendance verification in approved areas.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="mt-6 inline-flex items-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:-translate-y-0.5"
                    >
                      <Plus className="h-4 w-4" />
                      Add Location
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-5 lg:grid-cols-2">
                    {locations.map((loc) => (
                      <div
                        key={loc.id}
                        className="group overflow-hidden rounded-[1.25rem] border border-slate-200/70 bg-white shadow-lg shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800/70 dark:bg-gray-950/60 dark:shadow-black/20"
                      >
                        <LazyLocationMap latitude={loc.latitude} longitude={loc.longitude} title={loc.name} />

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] bg-gradient-to-br from-sky-600 to-indigo-700 text-white shadow-lg shadow-sky-500/20">
                                <MapPin className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{loc.name}</h3>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
                                  Radius {loc.radius}m
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteLocation(loc.id, loc.name)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-rose-100 bg-rose-50 text-rose-600 transition-all hover:border-rose-200 hover:text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                              title="Delete location"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-gray-800/70 dark:bg-gray-900/80">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Latitude</p>
                              <p className="mt-2 font-mono text-sm font-black tracking-tight text-slate-900 dark:text-white">
                                {loc.latitude.toFixed(6)}
                              </p>
                            </div>
                            <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-gray-800/70 dark:bg-gray-900/80">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Longitude</p>
                              <p className="mt-2 font-mono text-sm font-black tracking-tight text-slate-900 dark:text-white">
                                {loc.longitude.toFixed(6)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between border-t border-slate-200/70 pt-4 dark:border-gray-800/70">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                              <Navigation className="h-3.5 w-3.5" />
                              Attendance enabled
                            </div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200"
                            >
                              Open map
                              <Globe className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl overflow-hidden rounded-[1.35rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.98)_100%)] shadow-[0_40px_110px_-40px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 animate-in slide-in-from-bottom-4 duration-200 dark:border-gray-800/70 dark:bg-gray-900/95 dark:ring-gray-800/70">
            <div className="border-b border-slate-200/70 px-6 py-5 dark:border-gray-800/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                    <Settings className="h-3.5 w-3.5" />
                    New Zone
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Add attendance location</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                    Add a named campus point with precise coordinates and a clear attendance radius.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200/70 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Location name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="e.g. Main Gate"
                  className="w-full rounded-[0.95rem] border border-slate-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newLat}
                    onChange={(event) => setNewLat(event.target.value)}
                    placeholder="11.5564"
                    className="w-full rounded-[0.95rem] border border-slate-200/80 bg-white px-4 py-3 font-mono text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newLng}
                    onChange={(event) => setNewLng(event.target.value)}
                    placeholder="104.9282"
                    className="w-full rounded-[0.95rem] border border-slate-200/80 bg-white px-4 py-3 font-mono text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="rounded-[1rem] border border-sky-100 bg-sky-50/80 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">Radius</p>
                    <p className="mt-1 text-sm font-semibold text-sky-900 dark:text-sky-200">
                      {newRadius} meters
                    </p>
                  </div>
                  <Navigation className="h-5 w-5 text-sky-600 dark:text-sky-300" />
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={newRadius}
                  onChange={(event) => setNewRadius(event.target.value)}
                  className="mt-4 w-full accent-sky-600"
                />
                <p className="mt-2 text-xs font-medium text-sky-800/80 dark:text-sky-200/80">
                  Standard campus entrances usually work well between 50m and 100m.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200/70 bg-white/70 px-6 py-4 dark:border-gray-800/70 dark:bg-gray-950/40 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateLocation}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create location
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
