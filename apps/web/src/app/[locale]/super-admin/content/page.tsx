'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getSuperAdminPosts,
  deleteSuperAdminPost,
  getSuperAdminSchools,
  ModerationPost,
  SuperAdminSchool,
} from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import {
  FileText,
  Home,
  ChevronRight,
  Search,
  Trash2,
  Loader2,
  User,
  MessageSquare,
  Heart,
  Share2,
  ExternalLink,
} from 'lucide-react';

export default function SuperAdminContentPage() {
    const autoT = useTranslations();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const t = useTranslations('common');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [schools, setSchools] = useState<SuperAdminSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSuperAdminPosts({ page, limit: 20, search: search || undefined, schoolId: schoolId || undefined });
      setPosts(res.data.posts);
      setPagination(res.data.pagination);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, schoolId]);

  const fetchSchools = useCallback(async () => {
    try {
      const res = await getSuperAdminSchools({ limit: 200 });
      setSchools(res.data.schools);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);
  useEffect(() => { fetchPosts(1); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts(1);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    setDeletingId(postId);
    try {
      await deleteSuperAdminPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const authorName = (p: ModerationPost) => [p.author.firstName, p.author.lastName].filter(Boolean).join(' ') || 'Unknown';
  const schoolName = (p: ModerationPost) => p.author.school?.name || 'No school';

  return (
    <div className="space-y-6">
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 flex items-center gap-1">
            <Home className="h-4 w-4" /> <AutoI18nText i18nKey="auto.web.super_admin_content_page.k_9503d4ea" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-white font-medium"><AutoI18nText i18nKey="auto.web.super_admin_content_page.k_390918fb" /></span>
        </nav>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={50}>
        <div className="flex items-center gap-4">
          <div className="p-4 bg-sky-100 rounded-xl">
            <FileText className="h-8 w-8 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.super_admin_content_page.k_390918fb" /></h1>
            <p className="text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.super_admin_content_page.k_bcb42d96" /></p>
          </div>
        </div>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={100}>
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/0 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={autoT("auto.web.super_admin_content_page.k_107d866d")}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
              />
            </div>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 min-w-[180px]"
            >
              <option value="">{autoT("auto.web.super_admin_content_page.k_00623991")}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-stunity-primary-600 text-white hover:bg-stunity-primary-700 font-medium"
          >
            <AutoI18nText i18nKey="auto.web.super_admin_content_page.k_ebc0aee7" />
          </button>
        </form>
      </AnimatedContent>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
      )}

      <AnimatedContent animation="slide-up" delay={150}>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 text-stunity-primary-500 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium"><AutoI18nText i18nKey="auto.web.super_admin_content_page.k_19b667c2" /></p>
              <p className="text-sm mt-1"><AutoI18nText i18nKey="auto.web.super_admin_content_page.k_874ae4a1" /></p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {posts.map((post) => (
                <div key={post.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600">{post.postType}</span>
                      <span className="text-xs text-gray-500">{schoolName(post)}</span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white line-clamp-2">{post.title || post.content?.slice(0, 100) || '—'}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {authorName(post)}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {post.likesCount}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {post.commentsCount}</span>
                      <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> {post.sharesCount}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{new Date(post.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/${locale}/feed/post/${post.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-gray-100 dark:bg-gray-800 text-gray-600"
                      title={autoT("auto.web.super_admin_content_page.k_dbbbceea")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-50"
                      title={autoT("auto.web.super_admin_content_page.k_3a5a2070")}
                    >
                      {deletingId === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <AutoI18nText i18nKey="auto.web.super_admin_content_page.k_d1981c7e" /> {pagination.page} <AutoI18nText i18nKey="auto.web.super_admin_content_page.k_31a9287d" /> {pagination.totalPages} · {pagination.total} <AutoI18nText i18nKey="auto.web.super_admin_content_page.k_38b1c11c" />
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchPosts(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:opacity-50 text-sm"
                >
                  <AutoI18nText i18nKey="auto.web.super_admin_content_page.k_7eb020f4" />
                </button>
                <button
                  onClick={() => fetchPosts(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:opacity-50 text-sm"
                >
                  <AutoI18nText i18nKey="auto.web.super_admin_content_page.k_f2d48bc1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </AnimatedContent>
    </div>
  );
}
