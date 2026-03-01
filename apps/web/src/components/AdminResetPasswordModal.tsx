'use client';

import { useState } from 'react';
import { X, Lock, Eye, EyeOff, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { adminResetPassword, TokenManager } from '@/lib/api/auth';

interface AdminResetPasswordModalProps {
    user: {
        id: string | number;
        name: string;
        email?: string;
    };
    onClose: (success?: boolean) => void;
}

export default function AdminResetPasswordModal({ user, onClose }: AdminResetPasswordModalProps) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const validatePassword = (pw: string) => {
        if (pw.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(pw)) return 'Must contain an uppercase letter';
        if (!/[a-z]/.test(pw)) return 'Must contain a lowercase letter';
        if (!/[0-9]/.test(pw)) return 'Must contain a number';
        if (!/[^A-Za-z0-9]/.test(pw)) return 'Must contain a special character';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const pwError = validatePassword(password);
        if (pwError) {
            setError(pwError);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = TokenManager.getAccessToken();
            if (!token) throw new Error('Authentication session expired');

            await adminResetPassword(user.id, password, token);
            setSuccess(true);
            setTimeout(() => onClose(true), 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Lock className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
                    </div>
                    <button
                        onClick={() => onClose()}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {success ? (
                        <div className="py-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Password Reset Successfully</h3>
                            <p className="text-gray-500">
                                A temporary password has been set for <span className="font-semibold text-gray-900">{user.name}</span>.
                            </p>
                            <p className="text-sm text-gray-400 mt-4 italic">Closing window...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <div className="flex gap-3">
                                    <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-semibold">Important Security Notice</p>
                                        <p className="mt-1 opacity-90">
                                            Resetting the password for <span className="font-bold">{user.name}</span> will force them to change it upon their next login via the mobile app.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Temporary Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter secure temporary password"
                                        className={`w-full h-12 pl-4 pr-12 text-sm bg-gray-50 border ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-gray-900'
                                            } rounded-xl focus:bg-white focus:ring-2 transition-all outline-none`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {error && (
                                    <p className="mt-2 text-xs font-medium text-red-600 animate-in fade-in slide-in-from-top-1">
                                        {error}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => onClose()}
                                    className="flex-1 h-12 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !password}
                                    className="flex-2 h-12 px-8 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Confirm Reset'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
