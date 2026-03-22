'use client';

import { useState, use, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { ATTENDANCE_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent from '@/components/AnimatedContent';
import { useSchoolLocations } from '@/hooks/useSchoolLocations';
import {
    MapPin,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Navigation,
    Globe,
    Settings,
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
            {
                rootMargin: '200px 0px',
            }
        );

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [shouldLoad]);

    return (
        <div ref={containerRef} className="h-48 bg-gray-100 dark:bg-gray-950 relative overflow-hidden">
            {shouldLoad ? (
                <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${latitude},${longitude}&t=m&z=17&ie=UTF8&iwloc=&output=embed`}
                    allowFullScreen
                    loading="lazy"
                    className="grayscale-[0.8] dark:invert dark:opacity-60 group-hover:grayscale-0 dark:group-hover:opacity-100 transition-all duration-1000 scale-110 group-hover:scale-100"
                    title={`Map preview for ${title}`}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-900 dark:to-gray-950">
                    <div className="text-center px-6">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-gray-900 border border-white/60 dark:border-gray-800 flex items-center justify-center shadow-sm mb-4">
                            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                            Preparing live map
                        </p>
                    </div>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 via-transparent to-transparent pointer-events-none"></div>
            <div className="absolute top-5 left-5">
                <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl font-black">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20" />
                    Active Perimeter
                </span>
            </div>
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

    const handleLogout = async () => {
        await TokenManager.logout();
        router.push(`/${locale}/auth/login`);
    };

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newLat, setNewLat] = useState('');
    const [newLng, setNewLng] = useState('');
    const [newRadius, setNewRadius] = useState('50');

    const { locations, isLoading, mutate } = useSchoolLocations();

    const handleCreateLocation = async () => {
        if (!newName || !newLat || !newLng || !newRadius) {
            setError('Please fill all fields');
            return;
        }

        const lat = parseFloat(newLat);
        const lng = parseFloat(newLng);
        const rad = parseInt(newRadius, 10);

        if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
            setError('Latitude, longitude, and radius must be valid numbers');
            return;
        }

        try {
            setSubmitting(true);
            const token = TokenManager.getAccessToken();

            const response = await fetch(
                `${ATTENDANCE_SERVICE_URL}/attendance/locations`,
                {
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
                }
            );

            const data = await response.json();

            if (data.success) {
                setShowCreateModal(false);
                setNewName('');
                setNewLat('');
                setNewLng('');
                setNewRadius('50');
                setSuccessMessage('Location added successfully');
                setError('');
                await mutate();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError(data.message || 'Failed to add location');
            }
        } catch (err: any) {
            setError('Error creating location: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteLocation = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to remove "${name}"? Teachers will no longer be able to check-in here.`)) return;

        try {
            setSubmitting(true);
            const token = TokenManager.getAccessToken();

            const response = await fetch(
                `${ATTENDANCE_SERVICE_URL}/attendance/locations/${id}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                setSuccessMessage('Location removed successfully');
                setError('');
                await mutate();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError(data.message || 'Failed to delete location');
            }
        } catch (err: any) {
            setError('Error deleting location: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading && locations.length === 0) {
        return <PageSkeleton user={user} school={school} type="cards" showFilters={false} />;
    }

    return (
        <>
            <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

            <div className="lg:ml-64 min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
                {/* Header Section */}
                <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-violet-950/30 relative overflow-hidden border-b border-white/10">
                    <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
                    <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest">
                                    <Settings className="w-3.5 h-3.5" />
                                    Security Architecture
                                </div>
                                <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tighter">
                                    Spatial <span className="text-blue-400">Jurisdictions</span>
                                </h1>
                                <p className="text-white/60 font-medium max-w-xl text-lg leading-relaxed">
                                    Define high-precision geofenced perimeters for validated attendance synchronization.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="group relative px-8 py-5 bg-white text-blue-900 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-500/20 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                <span className="relative flex items-center gap-3">
                                    <Plus className="w-4 h-4" />
                                    Architect New Zone
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-12">

                    {/* Messages */}
                    {error && (
                        <div className="mb-10 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-[2rem] p-6 flex items-center gap-4 animate-in slide-in-from-top-4">
                            <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-500/20">
                                <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-rose-900 dark:text-rose-200 uppercase tracking-widest text-[10px] mb-0.5">System Exception</p>
                                <p className="text-sm text-rose-700 dark:text-rose-400 font-bold">{error}</p>
                            </div>
                            <button onClick={() => setError('')} className="p-2 text-rose-300 hover:text-rose-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-10 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-[2rem] p-6 flex items-center gap-4 animate-in slide-in-from-top-4">
                            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-widest text-[10px] mb-0.5">Operation Successful</p>
                                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">{successMessage}</p>
                            </div>
                            <button onClick={() => setSuccessMessage('')} className="p-2 text-emerald-300 hover:text-emerald-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Stats Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-none hover:shadow-2xl transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all duration-700" />
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-inner">
                                    <MapPin className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Active Vertices</p>
                                    <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{locations.length}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-none hover:shadow-2xl transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-700" />
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
                                    <Navigation className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Grid Integrity</p>
                                    <h3 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">100%</h3>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-none hover:shadow-2xl transition-all group overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                            <div className="flex items-center gap-6 relative z-10 transition-transform group-hover:translate-x-1">
                                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-white/20 group-hover:text-white rounded-2xl flex items-center justify-center shadow-inner transition-colors">
                                    <Globe className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 group-hover:text-white/60 uppercase tracking-widest mb-1 transition-colors">Haversine Core</p>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-white tracking-tight transition-colors leading-tight">ACTIVE<br/>SYNC</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Locations Grid */}
                    <AnimatedContent animation="slide-up">
                        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 gap-6">
                            {locations.length === 0 ? (
                                <div className="col-span-full bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-24 text-center group overflow-hidden relative">
                                    <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:24px_24px]" />
                                    <div className="relative z-10">
                                        <div className="w-24 h-24 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 transform group-hover:rotate-12 transition-transform duration-700">
                                            <MapPin className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">No Active Jurisdictions</h3>
                                        <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-sm mx-auto font-medium">Deploy spatial zones to enable high-precision biometric attendance verification.</p>
                                        <button
                                            onClick={() => setShowCreateModal(true)}
                                            className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-500/20"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Initialize Grid
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                locations.map((loc) => (
                                    <div key={loc.id} className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-gray-200/40 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-2xl transition-all duration-500 group">
                                        {/* Map Preview Header */}
                                        <LazyLocationMap
                                            latitude={loc.latitude}
                                            longitude={loc.longitude}
                                            title={loc.name}
                                        />

                                        <div className="p-8">
                                            <div className="flex items-start justify-between mb-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl shadow-blue-500/30 group-hover:scale-110 transition-transform duration-500">
                                                        <MapPin className="w-8 h-8 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">{loc.name}</h3>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mt-1">
                                                            Radius: <span className="bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded-md">{loc.radius}m Protocol</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteLocation(loc.id, loc.name)}
                                                    className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-2xl hover:bg-rose-500 hover:text-white transition-all duration-300 group-hover:rotate-90"
                                                    title="Decommission Zone"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-8">
                                                <div className="bg-gray-50 dark:bg-gray-950 rounded-[1.5rem] p-4 border border-gray-100 dark:border-gray-800/50 group/coord">
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black mb-2 group-hover/coord:text-blue-500 transition-colors">Latitude</p>
                                                    <p className="text-gray-900 dark:text-white font-mono text-sm font-black tracking-tight">{loc.latitude.toFixed(6)}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-950 rounded-[1.5rem] p-4 border border-gray-100 dark:border-gray-800/50 group/coord">
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black mb-2 group-hover/coord:text-blue-500 transition-colors">Longitude</p>
                                                    <p className="text-gray-900 dark:text-white font-mono text-sm font-black tracking-tight">{loc.longitude.toFixed(6)}</p>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                                                <div className="flex -space-x-3">
                                                    {[1, 2, 3, 4].map((i) => (
                                                        <div key={i} className="w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-400 dark:text-gray-500">
                                                            {String.fromCharCode(64 + i)}
                                                        </div>
                                                    ))}
                                                    <div className="w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 bg-blue-100 dark:bg-blue-500/30 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400">
                                                        +34
                                                    </div>
                                                </div>

                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-3 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest hover:gap-5 transition-all"
                                                >
                                                    Open Matrix <Navigation className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </AnimatedContent>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-950/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <AnimatedContent animation="slide-up">
                        <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden border border-white/20 dark:border-gray-800">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-10 text-white relative">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all group"
                                >
                                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                                </button>
                                <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mb-6 backdrop-blur-md shadow-inner">
                                    <MapPin className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-4xl font-black mb-2 tracking-tighter">Jurisdictional <span className="text-blue-300">Genesis</span></h2>
                                <p className="text-blue-100 font-medium opacity-80 uppercase tracking-widest text-[10px]">Define a new validated temporal zone.</p>
                            </div>

                            <div className="p-10 space-y-8">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Location Identifier</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. STRATEGIC_NORTH_BLOCK"
                                        className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500 transition-all text-gray-900 dark:text-white font-black tracking-tight placeholder:text-gray-300 dark:placeholder:text-gray-700"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Latitude</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                step="any"
                                                value={newLat}
                                                onChange={(e) => setNewLat(e.target.value)}
                                                placeholder="37.7749"
                                                className="w-full pl-6 pr-12 py-5 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500 transition-all font-mono text-sm dark:text-white"
                                            />
                                            <Globe className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Longitude</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                step="any"
                                                value={newLng}
                                                onChange={(e) => setNewLng(e.target.value)}
                                                placeholder="-122.4194"
                                                className="w-full pl-6 pr-12 py-5 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500 transition-all font-mono text-sm dark:text-white"
                                            />
                                            <Globe className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-blue-50/50 dark:bg-blue-500/5 rounded-[2rem] border border-blue-100/50 dark:border-blue-800/30 flex items-start gap-5">
                                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <Navigation className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-bold">
                                        <span className="font-black block mb-1 uppercase tracking-widest text-[9px]">Operational Insight</span>
                                        Coordinates can be exacted directly via Google Maps triangulation for maximum spatial fidelity.
                                    </p>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex items-center justify-between ml-2">
                                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Accuracy Perimeter</label>
                                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 rounded-lg text-indigo-700 dark:text-indigo-400 font-black text-xs tracking-tighter">
                                            {newRadius}m Radius
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="20"
                                        max="500"
                                        step="10"
                                        value={newRadius}
                                        onChange={(e) => setNewRadius(e.target.value)}
                                        className="w-full accent-blue-600 h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <p className="text-[9px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-[0.2em] text-center">Standard campus blocks calibrate at 50-100m.</p>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-8 py-5 text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest text-[10px] hover:text-gray-900 dark:hover:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800 rounded-[2rem]"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        onClick={handleCreateLocation}
                                        disabled={submitting}
                                        className="flex-1 bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-8 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/30 transition-all disabled:opacity-50"
                                    >
                                        {submitting ? 'Processing...' : 'Deploy Jurisdiction'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </AnimatedContent>
                </div>
            )}
        </>
    );
}
