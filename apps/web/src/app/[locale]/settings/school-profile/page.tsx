'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { schoolAPI } from '@/lib/api/school';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import AnimatedContent from '@/components/AnimatedContent';
import {
  Building2,
  ChevronRight,
  Home,
  Save,
  ShieldCheck,
  Globe,
  MapPin,
  Camera,
  School,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  ScrollText,
} from 'lucide-react';

const inputClass =
  'w-full px-5 py-3.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none shadow-sm';

const labelClass =
  'block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-gray-500 mb-2.5 ml-1';

export default function SchoolProfilePage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;
  const t = useTranslations('common');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  
  const [form, setForm] = useState({
    name: '',
    nameKh: '',
    officeName: 'មន្ទីរអប់រំយុជន និងកីឡា',
    province: 'សៀមរាប',
    district: '',
    commune: '',
    village: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    schoolType: 'HIGH_SCHOOL',
    logoUrl: '',
    stampUrl: '',
    vision: '',
    mission: '',
    slogan: '',
    establishedYear: '',
  });

  const resolveMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) return `${FEED_SERVICE_URL}${url}`;
    return url;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = TokenManager.getAccessToken();
    const formData = new FormData();
    formData.append('files', file);

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`${FEED_SERVICE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to upload logo');
      const data = await res.json();
      if (data.success && data.data?.[0]?.url) {
        setForm(prev => ({ ...prev, logoUrl: data.data[0].url }));
        setSuccess('Logo uploaded successfully!');
        window.setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Logo upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = TokenManager.getAccessToken();
    const formData = new FormData();
    formData.append('files', file);

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`${FEED_SERVICE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to upload stamp');
      const data = await res.json();
      if (data.success && data.data?.[0]?.url) {
        setForm(prev => ({ ...prev, stampUrl: data.data[0].url }));
        setSuccess('Official stamp uploaded successfully!');
        window.setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Stamp upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData?.user) {
      setUser(userData.user);
      const s = userData.school;
      setSchool(s);
      
      const fetchProfile = async () => {
        try {
          const res = await schoolAPI.getProfile(s.id);
          if (res.success && res.data) {
            setForm(res.data);
          }
        } catch (err) {
          console.error('Failed to fetch school profile:', err);
          // Fallback to basic school data if API fails
          setForm(prev => ({
            ...prev,
            name: s?.name || '',
            email: s?.email || '',
            phone: s?.phone || '',
            address: s?.address || '',
            website: s?.website || '',
            schoolType: s?.schoolType || 'HIGH_SCHOOL',
            logoUrl: s?.logoUrl || '',
          }));
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [locale, router]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await schoolAPI.updateProfile(school?.id, form);
      
      // Update system-wide school object for UI consistency
      const schoolRaw = localStorage.getItem('school');
      if (schoolRaw) {
        const currentSchool = JSON.parse(schoolRaw);
        localStorage.setItem('school', JSON.stringify({ ...currentSchool, name: form.name }));
      }
      
      setSuccess('School profile synchronized with backend successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="form" />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0b1120_52%,#020617_100%)]">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 pb-20">
          <AnimatedContent animation="fade">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="flex-1">
                <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500 mb-6">
                  <Link href={`/${locale}/dashboard`} className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-700 dark:hover:text-gray-300">
                    <Home className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-slate-900 dark:text-white">School Profile</span>
                </nav>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Enterprise Management
                </div>
                <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  School Profile
                </h1>
                <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">
                  Complete your school information to enable dynamic branding across all reports and system interfaces.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  form="profile-form"
                  disabled={submitting}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-slate-900 px-8 py-4 text-sm font-black text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 dark:bg-blue-600 dark:shadow-blue-500/20 dark:hover:bg-blue-500 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </div>

            {success && (
              <div className="mb-8 p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 flex items-center gap-4 text-emerald-800 text-sm font-bold shadow-sm dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                {success}
              </div>
            )}

            <form id="profile-form" onSubmit={handleSave} className="space-y-10">
              
              {/* Primary Identity Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                  <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-gray-800 p-8 shadow-sm">
                    <label className={labelClass}>School Logo</label>
                    <div className="relative group mx-auto w-fit">
                      <div className="w-48 h-48 rounded-[3rem] bg-slate-50 dark:bg-gray-800 border-2 border-dashed border-slate-200 dark:border-gray-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500 shadow-inner">
                        {form.logoUrl ? (
                          <img src={resolveMediaUrl(form.logoUrl)} alt="Logo Preview" className="w-full h-full object-contain p-6" />
                        ) : (
                          <School className="w-16 h-16 text-slate-300 dark:text-gray-600" />
                        )}
                      </div>
                      <input
                        type="file"
                        id="logo-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        className="absolute -bottom-2 -right-2 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-slate-100 dark:border-gray-800 text-blue-600 dark:text-blue-400 hover:scale-110 transition-all"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center leading-relaxed">
                      Used for reports & navigation
                    </p>
                  </section>

                  <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-gray-800 p-8 shadow-sm">
                    <label className={labelClass}>Official Stamp</label>
                    <div className="relative group mx-auto w-fit">
                      <div className="w-48 h-48 rounded-full bg-slate-50 dark:bg-gray-800 border-2 border-dashed border-slate-200 dark:border-gray-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500 shadow-inner">
                        {form.stampUrl ? (
                          <img src={resolveMediaUrl(form.stampUrl)} alt="Stamp Preview" className="w-full h-full object-contain p-8" />
                        ) : (
                          <ShieldCheck className="w-16 h-16 text-slate-300 dark:text-gray-600" />
                        )}
                      </div>
                      <input
                        type="file"
                        id="stamp-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleStampUpload}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('stamp-upload')?.click()}
                        className="absolute -bottom-2 -right-2 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-slate-100 dark:border-gray-800 text-red-600 dark:text-red-400 hover:scale-110 transition-all"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center leading-relaxed">
                      Used for certificates & official letters
                    </p>
                  </section>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-gray-800 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-black text-slate-800 dark:text-white">General Information</h2>
                    </div>

                    <div className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className={labelClass}>School Name (Native/Khmer)</label>
                          <input
                            type="text"
                            required
                            value={form.nameKh}
                            onChange={(e) => setForm({ ...form, nameKh: e.target.value })}
                            className={inputClass}
                            placeholder="e.g. វិទ្យាល័យស្វាយធំ"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>School Name (English)</label>
                          <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className={inputClass}
                            placeholder="e.g. Svaythom High School"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className={labelClass}>Office of Education (មន្ទីរអប់រំ)</label>
                          <input
                            type="text"
                            value={form.officeName}
                            onChange={(e) => setForm({ ...form, officeName: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Established Year</label>
                          <input
                            type="text"
                            value={form.establishedYear}
                            onChange={(e) => setForm({ ...form, establishedYear: e.target.value })}
                            className={inputClass}
                            placeholder="e.g. 1995"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>School Category / Type</label>
                        <select
                          value={form.schoolType}
                          onChange={(e) => setForm({ ...form, schoolType: e.target.value })}
                          className={inputClass}
                        >
                          <option value="PRIMARY_SCHOOL">Primary School</option>
                          <option value="MIDDLE_SCHOOL">Middle School</option>
                          <option value="HIGH_SCHOOL">High School</option>
                          <option value="COMPLETE_SCHOOL">General Education (K-12)</option>
                          <option value="INTERNATIONAL">International School</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>School Slogan (ពាក្យស្លោក)</label>
                        <div className="relative">
                          <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={form.slogan}
                            onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                            className={`${inputClass} pl-11`}
                            placeholder="e.g. កូនល្អ សិស្សល្អ មិត្តល្អ"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-gray-800 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        <ScrollText className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-black text-slate-800 dark:text-white">Vision & Mission</h2>
                    </div>

                    <div className="grid gap-8">
                      <div className="space-y-2">
                        <label className={labelClass}>School Vision (ចក្ខុវិស័យ)</label>
                        <textarea
                          value={form.vision}
                          onChange={(e) => setForm({ ...form, vision: e.target.value })}
                          className={`${inputClass} min-h-[100px] resize-none`}
                          placeholder="What is your long-term goal for the school?"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>School Mission (បេសកកម្ម)</label>
                        <textarea
                          value={form.mission}
                          onChange={(e) => setForm({ ...form, mission: e.target.value })}
                          className={`${inputClass} min-h-[100px] resize-none`}
                          placeholder="How do you plan to achieve your vision?"
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Location & Contact Section */}
              <section className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-gray-800 p-10 shadow-sm">
                <div className="flex items-center gap-3 mb-10">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">Location & Contact Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                  <div className="space-y-2">
                    <label className={labelClass}>Province (ខេត្ត៖)</label>
                    <input
                      type="text"
                      value={form.province}
                      onChange={(e) => setForm({ ...form, province: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. សៀមរាប"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>District (ស្រុក/ខណ្ឌ)</label>
                    <input
                      type="text"
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. ស្រុកប្រាសាទបាគង"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Commune (ឃុំ/សង្កាត់)</label>
                    <input
                      type="text"
                      value={form.commune}
                      onChange={(e) => setForm({ ...form, commune: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. ឃុំកណ្តែក"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Village (ភូមិ)</label>
                    <input
                      type="text"
                      value={form.village || ''}
                      onChange={(e) => setForm({ ...form, village: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. ភូមិអញ្ចាញ"
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-10">
                  <label className={labelClass}>Complete Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className={inputClass}
                    placeholder="Full street address and landmarks..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className={labelClass}>Official Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputClass}
                      placeholder="+855 ..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Email Address</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputClass}
                      placeholder="office@school.edu.kh"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClass}>Website</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        className={`${inputClass} pl-11`}
                        placeholder="www.school.edu.kh"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Data Export / Info Box */}
              <div className="p-8 rounded-[2rem] bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-2">Automated Report Synchronization</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400/80 leading-relaxed">
                    All information provided here is automatically synchronized with your official reports, including the <strong>Master Timetable</strong>, <strong>Student Report Cards</strong>, and <strong>Administrative Letters</strong>. Ensure the spelling is correct as it will appear exactly as typed in generated PDFs.
                  </p>
                </div>
              </div>

            </form>
          </AnimatedContent>
        </main>
      </div>
    </div>
  );
}
