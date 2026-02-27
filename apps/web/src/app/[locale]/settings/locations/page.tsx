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

    const handleLogout = () => {
        TokenManager.clearTokens();
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
                `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/attendance/locations`,
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
                `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/attendance/locations`,
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
                `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/attendance/locations/${id}`,
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
                                    <div key={loc.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition">
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                                                        <MapPin className="w-6 h-6 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900">{loc.name}</h3>
                                                        <p className="text-sm text-gray-500">Geofence Radius: {loc.radius}m</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteLocation(loc.id, loc.name)}
                                                    className="w-10 h-10 bg-red-50 text-red-600 flex items-center justify-center rounded-lg hover:bg-red-100 transition"
                                                    title="Remove Location"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <div className="bg-gray-50 rounded-xl p-4 flex gap-6">
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Latitude</p>
                                                    <p className="text-gray-900 font-mono">{loc.latitude.toFixed(6)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Longitude</p>
                                                    <p className="text-gray-900 font-mono">{loc.longitude.toFixed(6)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-medium">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                Active Zone
                                            </span>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 text-blue-600 font-medium hover:underline"
                                            >
                                                View on Maps <Navigation className="w-4 h-4" />
                                            </a>
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <MapPin className="text-blue-600 w-6 h-6" /> Add Location
                            </h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <span className="text-2xl">×</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Main Building, Science Block"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={newLat}
                                        onChange={(e) => setNewLat(e.target.value)}
                                        placeholder="e.g. 37.7749"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white font-mono text-sm transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={newLng}
                                        onChange={(e) => setNewLng(e.target.value)}
                                        placeholder="e.g. -122.4194"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white font-mono text-sm transition"
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2 mb-2">
                                <Navigation className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>Tip: Right-click on Google Maps to copy the exact coordinates (latitude, longitude).</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Radius (meters)</label>
                                <input
                                    type="number"
                                    value={newRadius}
                                    onChange={(e) => setNewRadius(e.target.value)}
                                    min="10"
                                    max="5000"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition"
                                />
                                <p className="text-xs text-gray-500 mt-1">Distance from coordinates where check-in is allowed.</p>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateLocation}
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {loading ? 'Adding...' : 'Save Location'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
