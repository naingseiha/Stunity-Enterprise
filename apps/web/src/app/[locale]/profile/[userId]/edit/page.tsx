'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Camera, Save, Plus, X, Edit2, Trash2, Check,
  MapPin, Globe, Briefcase, GraduationCap, Award, Code,
  BookOpen, Target, Zap, Star, Calendar, ExternalLink,
  ChevronDown, Loader2, Upload, Image as ImageIcon
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { ImageUploadModal } from '@/components/profile';

// Types
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
  bio?: string;
  headline?: string;
  professionalTitle?: string;
  location?: string;
  languages: string[];
  interests: string[];
  careerGoals?: string;
  socialLinks?: Record<string, string>;
  profileVisibility: string;
  isOpenToOpportunities: boolean;
}

interface Skill {
  id: string;
  skillName: string;
  category: string;
  level: string;
  yearsOfExp?: number;
  description?: string;
}

interface Experience {
  id: string;
  type: string;
  title: string;
  organization: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  achievements: string[];
  skills: string[];
}

interface Certification {
  id: string;
  name: string;
  issuingOrg: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  description?: string;
  skills: string[];
}

// Skeleton Component
function EditProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="h-16 bg-white rounded-xl shadow-sm animate-pulse" />
        
        {/* Cover & Profile section skeleton */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div 
            className="h-56 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #fb923c 100%)' }}
          />
          <div className="px-6 pb-6 -mt-16">
            <div className="flex gap-6 items-end">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-300 to-amber-400 border-4 border-white shadow-lg animate-pulse" />
              <div className="flex-1 pt-20 space-y-3">
                <div className="h-10 bg-gray-200 rounded-lg w-48 animate-pulse" />
                <div className="h-10 bg-gray-200 rounded-lg w-48 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Form sections skeleton */}
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
            <div className="space-y-4">
              {[1, 2].map(j => (
                <div key={j} className="h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Skill Categories
const skillCategories = [
  'PROGRAMMING', 'LANGUAGES', 'MATHEMATICS', 'SCIENCE',
  'HUMANITIES', 'ARTS', 'SPORTS', 'TEACHING', 'OTHER'
];

// Skill Levels
const skillLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

// Experience Types
const experienceTypes = [
  'WORK', 'TEACHING', 'VOLUNTEER', 'INTERNSHIP',
  'RESEARCH', 'LEADERSHIP', 'EXTRACURRICULAR'
];

// Visibility Options
const visibilityOptions = [
  { value: 'PUBLIC', label: 'Public', description: 'Anyone can see your profile' },
  { value: 'SCHOOL', label: 'School Only', description: 'Only people in your school' },
  { value: 'CLASS', label: 'Class Only', description: 'Only your classmates' },
  { value: 'PRIVATE', label: 'Private', description: 'Only you can see' },
];

export default function EditProfilePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const userId = params?.userId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pageReady, setPageReady] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    headline: '',
    bio: '',
    professionalTitle: '',
    location: '',
    careerGoals: '',
    languages: [] as string[],
    interests: [] as string[],
    profileVisibility: 'SCHOOL',
    isOpenToOpportunities: false,
  });

  // Modal states
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);

  // Photo upload modals
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [showCoverPhotoModal, setShowCoverPhotoModal] = useState(false);

  // Input refs for tags
  const [newLanguage, setNewLanguage] = useState('');
  const [newInterest, setNewInterest] = useState('');

  // Photo upload refs (keep for fallback)
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const coverPhotoRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<'profile' | 'cover' | null>(null);

  const feedUrl = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

  useEffect(() => {
    // Redirect if not own profile
    if (userId !== 'me') {
      router.push(`/${locale}/profile/${userId}`);
      return;
    }
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [profileRes, skillsRes, expRes, certRes] = await Promise.all([
        fetch(`${feedUrl}/users/me/profile`, { headers }),
        fetch(`${feedUrl}/users/me/skills`, { headers }),
        fetch(`${feedUrl}/users/me/experiences`, { headers }),
        fetch(`${feedUrl}/users/me/certifications`, { headers }),
      ]);

      const [profileData, skillsData, expData, certData] = await Promise.all([
        profileRes.json(),
        skillsRes.json(),
        expRes.json(),
        certRes.json(),
      ]);

      if (profileData.success) {
        const p = profileData.profile;
        setProfile(p);
        setFormData({
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          headline: p.headline || '',
          bio: p.bio || '',
          professionalTitle: p.professionalTitle || '',
          location: p.location || '',
          careerGoals: p.careerGoals || '',
          languages: p.languages || [],
          interests: p.interests || [],
          profileVisibility: p.profileVisibility || 'SCHOOL',
          isOpenToOpportunities: p.isOpenToOpportunities || false,
        });
      }

      if (skillsData.success) setSkills(skillsData.skills);
      if (expData.success) setExperiences(expData.experiences);
      if (certData.success) setCertifications(certData.certifications);

      setLoading(false);
      setTimeout(() => setPageReady(true), 100);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${feedUrl}/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Profile saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save profile' });
    }
    setSaving(false);
  };

  // Photo upload handler for modal
  const handlePhotoUpload = async (type: 'profile' | 'cover', file: File): Promise<void> => {
    const token = TokenManager.getAccessToken();
    const formDataObj = new FormData();
    formDataObj.append('file', file);

    const endpoint = type === 'profile' ? 'profile-photo' : 'cover-photo';
    const res = await fetch(`${feedUrl}/users/me/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formDataObj,
    });

    const data = await res.json();
    if (data.success) {
      setProfile(prev => prev ? {
        ...prev,
        [type === 'profile' ? 'profilePictureUrl' : 'coverPhotoUrl']:
          type === 'profile' ? data.profilePictureUrl : data.coverPhotoUrl,
      } : null);
      setMessage({ type: 'success', text: `${type === 'profile' ? 'Profile' : 'Cover'} photo updated!` });
      setTimeout(() => setMessage(null), 3000);
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  };

  // Skill handlers
  const handleSaveSkill = async (skillData: Partial<Skill>) => {
    try {
      const token = TokenManager.getAccessToken();
      const isEdit = !!editingSkill;
      const url = isEdit
        ? `${feedUrl}/users/me/skills/${editingSkill!.id}`
        : `${feedUrl}/users/me/skills`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(skillData),
      });

      const data = await res.json();
      if (data.success) {
        if (isEdit) {
          setSkills(prev => prev.map(s => s.id === editingSkill!.id ? data.skill : s));
        } else {
          setSkills(prev => [...prev, data.skill]);
        }
        setShowSkillModal(false);
        setEditingSkill(null);
        setMessage({ type: 'success', text: `Skill ${isEdit ? 'updated' : 'added'}!` });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save skill' });
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('Delete this skill?')) return;
    try {
      const token = TokenManager.getAccessToken();
      await fetch(`${feedUrl}/users/me/skills/${skillId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSkills(prev => prev.filter(s => s.id !== skillId));
      setMessage({ type: 'success', text: 'Skill deleted' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete skill' });
    }
  };

  // Experience handlers
  const handleSaveExperience = async (expData: Partial<Experience>) => {
    try {
      const token = TokenManager.getAccessToken();
      const isEdit = !!editingExp;
      const url = isEdit
        ? `${feedUrl}/users/me/experiences/${editingExp!.id}`
        : `${feedUrl}/users/me/experiences`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(expData),
      });

      const data = await res.json();
      if (data.success) {
        if (isEdit) {
          setExperiences(prev => prev.map(e => e.id === editingExp!.id ? data.experience : e));
        } else {
          setExperiences(prev => [...prev, data.experience]);
        }
        setShowExpModal(false);
        setEditingExp(null);
        setMessage({ type: 'success', text: `Experience ${isEdit ? 'updated' : 'added'}!` });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save experience' });
    }
  };

  const handleDeleteExperience = async (expId: string) => {
    if (!confirm('Delete this experience?')) return;
    try {
      const token = TokenManager.getAccessToken();
      await fetch(`${feedUrl}/users/me/experiences/${expId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setExperiences(prev => prev.filter(e => e.id !== expId));
      setMessage({ type: 'success', text: 'Experience deleted' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete experience' });
    }
  };

  // Certification handlers
  const handleSaveCertification = async (certData: Partial<Certification>) => {
    try {
      const token = TokenManager.getAccessToken();
      const isEdit = !!editingCert;
      const url = isEdit
        ? `${feedUrl}/users/me/certifications/${editingCert!.id}`
        : `${feedUrl}/users/me/certifications`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(certData),
      });

      const data = await res.json();
      if (data.success) {
        if (isEdit) {
          setCertifications(prev => prev.map(c => c.id === editingCert!.id ? data.certification : c));
        } else {
          setCertifications(prev => [...prev, data.certification]);
        }
        setShowCertModal(false);
        setEditingCert(null);
        setMessage({ type: 'success', text: `Certification ${isEdit ? 'updated' : 'added'}!` });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save certification' });
    }
  };

  const handleDeleteCertification = async (certId: string) => {
    if (!confirm('Delete this certification?')) return;
    try {
      const token = TokenManager.getAccessToken();
      await fetch(`${feedUrl}/users/me/certifications/${certId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setCertifications(prev => prev.filter(c => c.id !== certId));
      setMessage({ type: 'success', text: 'Certification deleted' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete certification' });
    }
  };

  // Tag handlers
  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData(prev => ({ ...prev, languages: [...prev.languages, newLanguage.trim()] }));
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setFormData(prev => ({ ...prev, languages: prev.languages.filter(l => l !== lang) }));
  };

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData(prev => ({ ...prev, interests: [...prev.interests, newInterest.trim()] }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interest) }));
  };

  if (loading) return <EditProfileSkeleton />;

  return (
    <>
      {/* Photo Upload Modals */}
      <ImageUploadModal
        isOpen={showProfilePhotoModal}
        onClose={() => setShowProfilePhotoModal(false)}
        onUpload={(file) => handlePhotoUpload('profile', file)}
        type="profile"
        currentImageUrl={profile?.profilePictureUrl}
        title="Change Profile Photo"
      />
      <ImageUploadModal
        isOpen={showCoverPhotoModal}
        onClose={() => setShowCoverPhotoModal(false)}
        onUpload={(file) => handlePhotoUpload('cover', file)}
        type="cover"
        currentImageUrl={profile?.coverPhotoUrl}
        title="Change Cover Photo"
      />

      <div className={`min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20 transition-all duration-500 ${pageReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Toast Message */}
        {message && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-right ${
            message.type === 'success' 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
              : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}/profile/me`}
                className="p-2 hover:bg-orange-50 dark:hover:bg-gray-700 rounded-full transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-orange-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Photos Section - Cover & Profile */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
            style={{ animation: 'slideInUp 0.5s ease-out' }}
          >
            {/* Cover Photo */}
            <div className="relative h-56 bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600 group/cover">
              {profile?.coverPhotoUrl ? (
                <Image
                  src={profile.coverPhotoUrl}
                  alt="Cover"
                  fill
                  className="object-cover"
                />
              ) : (
                /* Decorative pattern for default cover */
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full border-2 border-white/30" />
                  <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full border-2 border-white/20" />
                  <div className="absolute bottom-1/4 left-1/3 w-16 h-16 rounded-full border-2 border-white/25" />
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
              
              {/* Cover Photo Edit Overlay */}
              <div 
                onClick={() => setShowCoverPhotoModal(true)}
                className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/30 transition-all duration-300 cursor-pointer flex items-center justify-center"
              >
                <div className="opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 flex flex-col items-center text-white">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-full mb-2">
                    <Camera className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-medium">Change Cover Photo</span>
                </div>
              </div>

              {/* Change Cover Button - Always visible */}
              <button
                onClick={() => setShowCoverPhotoModal(true)}
                className="absolute bottom-4 right-4 px-5 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-full text-sm font-semibold flex items-center gap-2.5 transition-all shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-600 group"
              >
                <div className="p-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
                <span>Edit Cover</span>
              </button>
            </div>

            {/* Profile Photo Section */}
            <div className="px-6 pb-6 -mt-16 relative">
              <div className="flex items-end gap-4">
                {/* Profile Photo */}
                <div className="relative group/avatar">
                  <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 shadow-xl overflow-hidden bg-gradient-to-br from-orange-400 to-amber-500 ring-4 ring-orange-100/50 dark:ring-orange-900/30">
                    {profile?.profilePictureUrl ? (
                      <Image
                        src={profile.profilePictureUrl}
                        alt="Profile"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                        {formData.firstName[0]}{formData.lastName[0]}
                      </div>
                    )}
                  </div>
                  {/* Camera overlay on hover */}
                  <button
                    onClick={() => setShowProfilePhotoModal(true)}
                    className="absolute inset-0 w-32 h-32 rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-white">
                      <Camera className="w-7 h-7 mb-1" />
                      <span className="text-xs font-semibold">Change Photo</span>
                    </div>
                  </button>
                  {/* Small camera badge */}
                  <button
                    onClick={() => setShowProfilePhotoModal(true)}
                    className="absolute bottom-1 right-1 p-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full shadow-lg transition-all hover:scale-110 border-2 border-white dark:border-gray-800"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile name preview */}
                <div className="pb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {formData.firstName} {formData.lastName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formData.headline || 'Add a headline'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information Section */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6"
            style={{ animation: 'slideInUp 0.5s ease-out 0.1s both' }}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-orange-500" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white transition-all"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white transition-all"
                  placeholder="Enter last name"
                />
              </div>
            </div>
          </div>

          {/* About Section */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6"
            style={{ animation: 'slideInUp 0.5s ease-out 0.15s both' }}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              About
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Headline</label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                  placeholder="e.g., Senior Math Teacher | Education Innovator"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Professional Title</label>
                <input
                  type="text"
                  value={formData.professionalTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, professionalTitle: e.target.value }))}
                  placeholder="e.g., Mathematics Teacher"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  placeholder="Tell people about yourself, your teaching philosophy, or your learning goals..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white resize-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Phnom Penh, Cambodia"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-orange-500" />
                  Career Goals
                </label>
                <textarea
                  value={formData.careerGoals}
                  onChange={(e) => setFormData(prev => ({ ...prev, careerGoals: e.target.value }))}
                  rows={2}
                  placeholder="What are your professional aspirations?"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Languages & Interests */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6"
            style={{ animation: 'slideInUp 0.5s ease-out 0.2s both' }}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-500" />
              Languages & Interests
            </h2>
            <div className="space-y-4">
              {/* Languages */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Languages
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.languages.map((lang, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium flex items-center gap-1.5 border border-green-200 dark:border-green-800">
                      {lang}
                      <button onClick={() => removeLanguage(lang)} className="hover:text-green-900 p-0.5 hover:bg-green-200 dark:hover:bg-green-800 rounded-full transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addLanguage()}
                    placeholder="Add a language"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                  />
                  <button onClick={addLanguage} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Star className="w-4 h-4 inline mr-1" />
                  Interests
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.interests.map((interest, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm flex items-center gap-1">
                      {interest}
                      <button onClick={() => removeInterest(interest)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addInterest()}
                    placeholder="Add an interest"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                  />
                  <button onClick={addInterest} className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Skills Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Skills
              </h2>
              <button
                onClick={() => { setEditingSkill(null); setShowSkillModal(true); }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Skill
              </button>
            </div>
            {skills.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No skills added yet</p>
            ) : (
              <div className="space-y-2">
                {skills.map(skill => (
                  <div key={skill.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{skill.skillName}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{skill.category.toLowerCase()}</span>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          skill.level === 'EXPERT' ? 'bg-amber-100 text-amber-700' :
                          skill.level === 'ADVANCED' ? 'bg-purple-100 text-purple-700' :
                          skill.level === 'INTERMEDIATE' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {skill.level}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingSkill(skill); setShowSkillModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Experience Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-250">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" />
                Experience
              </h2>
              <button
                onClick={() => { setEditingExp(null); setShowExpModal(true); }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Experience
              </button>
            </div>
            {experiences.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No experience added yet</p>
            ) : (
              <div className="space-y-3">
                {experiences.map(exp => (
                  <div key={exp.id} className="flex items-start justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{exp.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{exp.organization}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="capitalize">{exp.type.toLowerCase()}</span>
                        <span>•</span>
                        <span>
                          {new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          {' - '}
                          {exp.isCurrent ? 'Present' : exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingExp(exp); setShowExpModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExperience(exp.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certifications Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                Certifications
              </h2>
              <button
                onClick={() => { setEditingCert(null); setShowCertModal(true); }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Certification
              </button>
            </div>
            {certifications.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No certifications added yet</p>
            ) : (
              <div className="space-y-3">
                {certifications.map(cert => (
                  <div key={cert.id} className="flex items-start justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{cert.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{cert.issuingOrg}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>Issued {new Date(cert.issueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        {cert.credentialUrl && (
                          <>
                            <span>•</span>
                            <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingCert(cert); setShowCertModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCertification(cert.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-350">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Settings</h2>
            <div className="space-y-4">
              {/* Profile Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profile Visibility</label>
                <div className="grid gap-2">
                  {visibilityOptions.map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.profileVisibility === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={formData.profileVisibility === option.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, profileVisibility: e.target.value }))}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
                      </div>
                      {formData.profileVisibility === option.value && (
                        <Check className="w-5 h-5 text-blue-500" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Open to Opportunities */}
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Open to Opportunities</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Let others know you're open to new opportunities</p>
                </div>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, isOpenToOpportunities: !prev.isOpenToOpportunities }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isOpenToOpportunities ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isOpenToOpportunities ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Save Button */}
          <div className="flex justify-end gap-4 pb-8">
            <Link
              href={`/${locale}/profile/me`}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Changes
            </button>
          </div>
        </div>

        {/* Skill Modal */}
        {showSkillModal && (
          <SkillModal
            skill={editingSkill}
            onSave={handleSaveSkill}
            onClose={() => { setShowSkillModal(false); setEditingSkill(null); }}
          />
        )}

        {/* Experience Modal */}
        {showExpModal && (
          <ExperienceModal
            experience={editingExp}
            onSave={handleSaveExperience}
            onClose={() => { setShowExpModal(false); setEditingExp(null); }}
          />
        )}

        {/* Certification Modal */}
        {showCertModal && (
          <CertificationModal
            certification={editingCert}
            onSave={handleSaveCertification}
            onClose={() => { setShowCertModal(false); setEditingCert(null); }}
          />
        )}
      </div>

      {/* Global CSS Animations */}
      <style jsx global>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
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

// Skill Modal Component
function SkillModal({ skill, onSave, onClose }: { skill: Skill | null; onSave: (data: Partial<Skill>) => void; onClose: () => void }) {
  const [formData, setFormData] = useState({
    skillName: skill?.skillName || '',
    category: skill?.category || 'PROGRAMMING',
    level: skill?.level || 'BEGINNER',
    yearsOfExp: skill?.yearsOfExp || '',
    description: skill?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      yearsOfExp: formData.yearsOfExp ? Number(formData.yearsOfExp) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {skill ? 'Edit Skill' : 'Add Skill'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skill Name *</label>
            <input
              type="text"
              value={formData.skillName}
              onChange={(e) => setFormData(prev => ({ ...prev, skillName: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              >
                {skillCategories.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              >
                {skillLevels.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl.charAt(0) + lvl.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Years of Experience</label>
            <input
              type="number"
              value={formData.yearsOfExp}
              onChange={(e) => setFormData(prev => ({ ...prev, yearsOfExp: e.target.value }))}
              min="0"
              max="50"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg">
              {skill ? 'Update' : 'Add'} Skill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Experience Modal Component
function ExperienceModal({ experience, onSave, onClose }: { experience: Experience | null; onSave: (data: Partial<Experience>) => void; onClose: () => void }) {
  const [formData, setFormData] = useState({
    type: experience?.type || 'TEACHING',
    title: experience?.title || '',
    organization: experience?.organization || '',
    location: experience?.location || '',
    startDate: experience?.startDate ? experience.startDate.split('T')[0] : '',
    endDate: experience?.endDate ? experience.endDate.split('T')[0] : '',
    isCurrent: experience?.isCurrent || false,
    description: experience?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      endDate: formData.isCurrent ? undefined : formData.endDate,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {experience ? 'Edit Experience' : 'Add Experience'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            >
              {experienceTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="e.g., Math Teacher"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization *</label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
              required
              placeholder="e.g., Test High School"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Phnom Penh, Cambodia"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                disabled={formData.isCurrent}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isCurrent}
              onChange={(e) => setFormData(prev => ({ ...prev, isCurrent: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">I currently work here</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg">
              {experience ? 'Update' : 'Add'} Experience
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Certification Modal Component
function CertificationModal({ certification, onSave, onClose }: { certification: Certification | null; onSave: (data: Partial<Certification>) => void; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: certification?.name || '',
    issuingOrg: certification?.issuingOrg || '',
    issueDate: certification?.issueDate ? certification.issueDate.split('T')[0] : '',
    expiryDate: certification?.expiryDate ? certification.expiryDate.split('T')[0] : '',
    credentialId: certification?.credentialId || '',
    credentialUrl: certification?.credentialUrl || '',
    description: certification?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      expiryDate: formData.expiryDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {certification ? 'Edit Certification' : 'Add Certification'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certification Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="e.g., AWS Certified Solutions Architect"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issuing Organization *</label>
            <input
              type="text"
              value={formData.issuingOrg}
              onChange={(e) => setFormData(prev => ({ ...prev, issuingOrg: e.target.value }))}
              required
              placeholder="e.g., Amazon Web Services"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Date *</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credential ID</label>
            <input
              type="text"
              value={formData.credentialId}
              onChange={(e) => setFormData(prev => ({ ...prev, credentialId: e.target.value }))}
              placeholder="e.g., ABC123XYZ"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credential URL</label>
            <input
              type="url"
              value={formData.credentialUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, credentialUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg">
              {certification ? 'Update' : 'Add'} Certification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
