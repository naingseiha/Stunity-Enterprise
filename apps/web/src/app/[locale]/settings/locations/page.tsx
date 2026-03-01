'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent from '@/components/AnimatedContent';
import {
    MapPin,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Navigation,
    Globe,
    Settings,
} from 'lucide-react';

interface SchoolLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    isActive: boolean;
    createdAt: string;
}

export default function LocationsManagementPage({ params }: { params: { locale: string } }) {
    const router = useRouter();
    const { locale } = params;

    const userData = TokenManager.getUserData();
    const user = userData?.user;
    const school = userData?.school;

    const handleLogout = async () => {
        await TokenManager.logout();
        router.push(`/${locale}/auth/login`);
    };

    const [locations, setLocations] = useState<SchoolLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newLat, setNewLat] = useState('');
    const [newLng, setNewLng] = useState('');
    const [newRadius, setNewRadius] = useState('50');

    useEffect(() => {
        loadLocations();
    }, []);

    const loadLocations = async () => {
        try {
            const token = TokenManager.getAccessToken();
            const schoolId = userData?.school?.id;

            if (!token || !schoolId) {
                router.push(`/${locale}/auth/login`);
                return;
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_ATTENDANCE_SERVICE_URL || 'http://localhost:3008'}/attendance/locations`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                setLocations(data.data);
            } else {
                setError(data.message || 'Failed to load locations');
            }
        } catch (err: any) {
            setError('Error loading locations: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

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
            setLoading(true);
            const token = TokenManager.getAccessToken();

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_ATTENDANCE_SERVICE_URL || 'http://localhost:3008'}/attendance/locations`,
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
                loadLocations();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError(data.message || 'Failed to add location');
                setLoading(false);
            }
        } catch (err: any) {
            setError('Error creating location: ' + err.message);
            setLoading(false);
        }
    };

    const handleDeleteLocation = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to remove "${name}"? Teachers will no longer be able to check-in here.`)) return;

        try {
            setLoading(true);
            const token = TokenManager.getAccessToken();

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_ATTENDANCE_SERVICE_URL || 'http://localhost:3008'}/attendance/locations/${id}`,
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
                loadLocations();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError(data.message || 'Failed to delete location');
                setLoading(false);
            }
        } catch (err: any) {
            setError('Error deleting location: ' + err.message);
            setLoading(false);
        }
    };

    if (loading && locations.length === 0) {
        return <PageSkeleton user={user} school={school} type="cards" showFilters={false} />;
    }

    return (
        <>
            <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

            <div className="lg:ml-64 min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">Campus Locations</h1>
                                <p className="text-gray-600">
                                    Manage geofenced zones where teachers are allowed to mark attendance.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
                            >
                                <Plus className="w-5 h-5" />
                                Add Location
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-red-900">Error</p>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">×</button>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-green-900">Success</p>
                                <p className="text-sm text-green-700">{successMessage}</p>
                            </div>
                            <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800">×</button>
                        </div>
                    )}

                    {/* Stats Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Active Locations</p>
                                <h3 className="text-2xl font-bold text-gray-900">{locations.length}</h3>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                <Navigation className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Tracking System</p>
                                <h3 className="text-2xl font-bold text-gray-900">Online</h3>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-md text-white flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-white/80 text-sm font-medium">Geofence Tech</p>
                                <h3 className="text-lg font-bold">Haversine Enabled</h3>
                            </div>
                        </div>
                    </div>

                    {/* Locations Grid */}
                    <AnimatedContent animation="slide-up">
                        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-6 gap-4">
                            {locations.length === 0 ? (
                                <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MapPin className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Locations Set</h3>
                                    <p className="text-gray-600 mb-4">Add your school buildings or zones to enable teacher check-ins</p>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Configure Location
                                    </button>
                                </div>
                            ) : (
                                locations.map((loc) => (
                                    <div key={loc.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                                        {/* Map Preview Header */}
                                        <div className="h-32 bg-gray-100 relative">
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                style={{ border: 0 }}
                                                src={`https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                                allowFullScreen
                                                className="grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500"
                                            ></iframe>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                                            <div className="absolute top-3 left-3">
                                                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Active Geofence
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                                                        <MapPin className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900 leading-tight">{loc.name}</h3>
                                                        <p className="text-sm text-gray-500 font-medium">Radius: <span className="text-indigo-600">{loc.radius}m</span></p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteLocation(loc.id, loc.name)}
                                                    className="w-10 h-10 bg-gray-50 text-gray-400 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                                                    title="Remove Location"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100">
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Latitude</p>
                                                    <p className="text-gray-900 font-mono text-sm font-semibold">{loc.latitude.toFixed(6)}</p>
                                                </div>
                                                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100">
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Longitude</p>
                                                    <p className="text-gray-900 font-mono text-sm font-semibold">{loc.longitude.toFixed(6)}</p>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                                <div className="flex -space-x-2">
                                                    {[1, 2, 3].map((i) => (
                                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                            {String.fromCharCode(64 + i)}
                                                        </div>
                                                    ))}
                                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                        +12
                                                    </div>
                                                </div>

                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-2 text-indigo-600 text-sm font-bold hover:gap-3 transition-all"
                                                >
                                                    Open Maps <Navigation className="w-4 h-4" />
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <AnimatedContent animation="slide-up">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-white/20">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all"
                                >
                                    <span className="text-2xl leading-none">×</span>
                                </button>
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
                                    <MapPin className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-3xl font-bold mb-1">Add New Zone</h2>
                                <p className="text-blue-100 text-sm">Define a new geofenced area for attendance.</p>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Location Name</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Main Campus, Library Wing"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all text-gray-900 font-medium placeholder:text-gray-300"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Latitude</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="any"
                                                value={newLat}
                                                onChange={(e) => setNewLat(e.target.value)}
                                                placeholder="37.7749"
                                                className="w-full pl-5 pr-10 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all font-mono text-sm"
                                            />
                                            <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Longitude</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="any"
                                                value={newLng}
                                                onChange={(e) => setNewLng(e.target.value)}
                                                placeholder="-122.4194"
                                                className="w-full pl-5 pr-10 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all font-mono text-sm"
                                            />
                                            <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm text-blue-600">
                                        <Navigation className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                        <span className="font-bold block mb-0.5">Pro Tip:</span>
                                        Right-click on Google Maps to copy the exact coordinates.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Accuracy Radius (Meters)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="20"
                                            max="500"
                                            step="10"
                                            value={newRadius}
                                            onChange={(e) => setNewRadius(e.target.value)}
                                            className="flex-1 accent-indigo-600 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="w-16 h-10 flex items-center justify-center bg-indigo-50 rounded-xl text-indigo-700 font-bold text-sm">
                                            {newRadius}m
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Standard campus buildings usually need 50-100m.</p>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateLocation}
                                        disabled={loading}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-50 active:scale-95"
                                    >
                                        {loading ? 'Processing...' : 'Deploy Zone'}
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
