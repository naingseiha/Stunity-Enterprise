'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings,
  Save,
  Trash2,
  Loader2,
  Users,
  Image,
  X,
  AlertTriangle,
  BookOpen,
  Code,
  FlaskConical,
  Rocket,
  GraduationCap,
  Languages,
  Trophy,
  UserPlus,
  Globe,
  School,
  Lock,
  EyeOff,
  Camera,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';

interface StudyClub {
  id: string;
  name: string;
  description?: string;
  clubType: string;
  category?: string;
  privacy: string;
  coverImage?: string;
  maxMembers?: number;
  isActive: boolean;
  myRole?: string;
}

const CLUB_TYPES = [
  { value: 'SUBJECT', label: 'Subject Club', icon: BookOpen, description: 'Math, Science, Literature' },
  { value: 'SKILL', label: 'Skill Development', icon: Code, description: 'Coding, Debate, Public Speaking' },
  { value: 'RESEARCH', label: 'Research Group', icon: FlaskConical, description: 'Research and exploration' },
  { value: 'PROJECT', label: 'Project Team', icon: Rocket, description: 'Collaborative projects' },
  { value: 'EXAM_PREP', label: 'Exam Preparation', icon: GraduationCap, description: 'Study groups for exams' },
  { value: 'LANGUAGE', label: 'Language Club', icon: Languages, description: 'Language learning' },
  { value: 'COMPETITION', label: 'Competition Prep', icon: Trophy, description: 'Olympiads and competitions' },
  { value: 'TUTORING', label: 'Tutoring Circle', icon: UserPlus, description: 'Peer tutoring' },
];

const PRIVACY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: Globe, description: 'Anyone can see and join' },
  { value: 'SCHOOL', label: 'School Only', icon: School, description: 'School members only' },
  { value: 'PRIVATE', label: 'Private', icon: Lock, description: 'Invite only, visible to members' },
  { value: 'SECRET', label: 'Secret', icon: EyeOff, description: 'Invite only, hidden from search' },
];

export default function ClubSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const clubId = params?.id as string;

  const [club, setClub] = useState<StudyClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clubType, setClubType] = useState('SUBJECT');
  const [category, setCategory] = useState('');
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [maxMembers, setMaxMembers] = useState<string>('');
  const [coverImage, setCoverImage] = useState('');

  const fetchClub = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (!data.isMember || !['OWNER', 'ADMIN'].includes(data.myRole)) {
          router.push(`/${locale}/clubs/${clubId}`);
          return;
        }
        setClub(data);
        setName(data.name);
        setDescription(data.description || '');
        setClubType(data.clubType);
        setCategory(data.category || '');
        setPrivacy(data.privacy);
        setMaxMembers(data.maxMembers?.toString() || '');
        setCoverImage(data.coverImage || '');
      } else {
        router.push(`/${locale}/clubs`);
      }
    } catch (error) {
      console.error('Error fetching club:', error);
    } finally {
      setLoading(false);
    }
  }, [clubId, locale, router]);

  useEffect(() => {
    fetchClub();
  }, [fetchClub]);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 3) {
      setError('Club name must be at least 3 characters');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          clubType,
          category: category.trim() || null,
          privacy,
          maxMembers: maxMembers ? parseInt(maxMembers) : null,
          coverImage: coverImage || null,
        }),
      });

      if (response.ok) {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (error) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const token = TokenManager.getAccessToken();
      const response = await fetch(`http://localhost:3010/clubs/${clubId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        router.push(`/${locale}/clubs`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete club');
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      setError('Failed to delete club');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!club) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/${locale}/clubs/${clubId}`}
            className="p-2 hover:bg-white rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-amber-500" />
              Club Settings
            </h1>
            <p className="text-gray-500">{club.name}</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
            {success}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {/* Basic Info */}
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Club Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Mathematics, Programming, Physics"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Club Type */}
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Club Type</h2>
            <div className="grid grid-cols-2 gap-3">
              {CLUB_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setClubType(type.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      clubType === type.value
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 ${clubType === type.value ? 'text-amber-500' : 'text-gray-400'}`} />
                    <div>
                      <p className={`font-medium ${clubType === type.value ? 'text-amber-700' : 'text-gray-900'}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-gray-500">{type.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy */}
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Privacy</h2>
            <div className="space-y-2">
              {PRIVACY_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setPrivacy(option.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      privacy === option.value
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${privacy === option.value ? 'text-amber-500' : 'text-gray-400'}`} />
                    <div>
                      <p className={`font-medium ${privacy === option.value ? 'text-amber-700' : 'text-gray-900'}`}>
                        {option.label}
                      </p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced */}
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Advanced</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Members (optional)</label>
              <input
                type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                placeholder="Leave empty for unlimited"
                min="1"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <p className="text-xs text-gray-500 mt-1">Set a limit on how many members can join</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL (optional)</label>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 flex items-center justify-between">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>

            {club.myRole === 'OWNER' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Club
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Club?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              All posts, members, and data associated with <strong>{club.name}</strong> will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
