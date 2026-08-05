/**
 * Profile cache — mobile-parity instant paint.
 *
 * Layers:
 *  1. In-memory Map (sync first paint, like mobile module cache)
 *  2. localStorage (survives tab close; 24h stale-while-revalidate)
 *
 * Fresh window (60s): skip network revalidate.
 * Stale window (24h): paint instantly, revalidate in background.
 */

import type { PostData } from '@/components/feed/PostCard';

export type ProfileCachePayload = {
  profile: any | null;
  skills: any[];
  experiences: any[];
  projects: any[];
  certifications: any[];
  education: any[];
  achievements: any[];
  recommendations: any[];
  posts: PostData[];
  statsSummary?: any | null;
};

type CacheEntry = {
  data: ProfileCachePayload;
  cachedAt: number;
};

const MEMORY = new Map<string, CacheEntry>();
const FRESH_MS = 60_000;
const STALE_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'stunity:profile-cache:v1:';

function storageKey(id: string) {
  return `${STORAGE_PREFIX}${id}`;
}

/** Resolve URL param `me` → real user id when available. */
export function resolveProfileCacheId(userId: string): string {
  if (userId !== 'me' || typeof window === 'undefined') return userId;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'me';
    const parsed = JSON.parse(raw);
    return typeof parsed?.id === 'string' && parsed.id ? parsed.id : 'me';
  } catch {
    return 'me';
  }
}

function readDisk(id: string): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.data || typeof parsed.cachedAt !== 'number') return null;
    if (Date.now() - parsed.cachedAt > STALE_MS) {
      localStorage.removeItem(storageKey(id));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDisk(id: string, entry: CacheEntry) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(entry));
  } catch {
    // quota / private mode — memory still works
  }
}

export function readProfileCache(userId: string): ProfileCachePayload | null {
  const id = resolveProfileCacheId(userId);
  const mem = MEMORY.get(id) || (userId === 'me' ? MEMORY.get('me') : undefined);
  if (mem?.data?.profile) return mem.data;

  const disk = readDisk(id) || (userId === 'me' || id !== 'me' ? readDisk(userId) : null);
  if (disk?.data?.profile) {
    MEMORY.set(id, disk);
    if (userId === 'me' && id !== 'me') MEMORY.set('me', disk);
    return disk.data;
  }
  return null;
}

export function isProfileCacheFresh(userId: string, now = Date.now()): boolean {
  const id = resolveProfileCacheId(userId);
  const mem = MEMORY.get(id) || MEMORY.get(userId);
  if (mem) return now - mem.cachedAt < FRESH_MS;
  const disk = readDisk(id) || readDisk(userId);
  if (!disk) return false;
  MEMORY.set(id, disk);
  return now - disk.cachedAt < FRESH_MS;
}

export function writeProfileCache(userId: string, data: ProfileCachePayload): void {
  const id = resolveProfileCacheId(userId);
  const entry: CacheEntry = { data, cachedAt: Date.now() };
  MEMORY.set(id, entry);
  writeDisk(id, entry);
  // Alias `me` ↔ real id so nav links and /profile/me share one cache
  if (id !== 'me') {
    MEMORY.set('me', entry);
    writeDisk('me', entry);
  } else if (data.profile?.id) {
    MEMORY.set(data.profile.id, entry);
    writeDisk(data.profile.id, entry);
  }
}

export function patchProfileCache(
  userId: string,
  patch: Partial<ProfileCachePayload>,
): ProfileCachePayload | null {
  const prev = readProfileCache(userId);
  if (!prev) {
    if (patch.profile) {
      const next: ProfileCachePayload = {
        profile: patch.profile,
        skills: patch.skills || [],
        experiences: patch.experiences || [],
        projects: patch.projects || [],
        certifications: patch.certifications || [],
        education: patch.education || [],
        achievements: patch.achievements || [],
        recommendations: patch.recommendations || [],
        posts: patch.posts || [],
        statsSummary: patch.statsSummary ?? null,
      };
      writeProfileCache(userId, next);
      return next;
    }
    return null;
  }
  const next = { ...prev, ...patch };
  writeProfileCache(userId, next);
  return next;
}

/** Lightweight seed from auth user for first-ever own-profile paint. */
export function seedOwnProfileFromAuthUser(): ProfileCachePayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u?.id) return null;
    const existing = readProfileCache(u.id);
    if (existing?.profile) return existing;

    const seed: ProfileCachePayload = {
      profile: {
        id: u.id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        englishFirstName: u.englishFirstName,
        englishLastName: u.englishLastName,
        role: u.role || 'STUDENT',
        profilePictureUrl: u.profilePictureUrl || u.avatarUrl,
        coverPhotoUrl: u.coverPhotoUrl,
        bio: u.bio,
        headline: u.headline || u.professionalTitle,
        professionalTitle: u.professionalTitle,
        location: u.location,
        languages: u.languages || [],
        interests: u.interests || [],
        skills: u.skills || [],
        profileCompleteness: u.profileCompleteness || 0,
        profileVisibility: u.profileVisibility || 'PUBLIC',
        isVerified: Boolean(u.isVerified),
        totalLearningHours: u.totalLearningHours || 0,
        currentStreak: u.currentStreak || 0,
        longestStreak: u.longestStreak || 0,
        totalPoints: u.totalPoints || 0,
        level: u.level || 1,
        isOpenToOpportunities: Boolean(u.isOpenToOpportunities),
        createdAt: u.createdAt || new Date().toISOString(),
        school: u.school,
        isOwnProfile: true,
        isFollowing: false,
        stats: {
          posts: 0,
          followers: 0,
          following: 0,
          skills: 0,
          experiences: 0,
          certifications: 0,
          projects: 0,
          achievements: 0,
          recommendations: 0,
          postsThisMonth: 0,
          totalLikes: 0,
          totalViews: 0,
        },
        socialLinks: u.socialLinks || {},
      },
      skills: [],
      experiences: [],
      projects: [],
      certifications: [],
      education: [],
      achievements: [],
      recommendations: [],
      posts: [],
      statsSummary: null,
    };
    return seed;
  } catch {
    return null;
  }
}

/** Prefetch profile payload on nav hover — warms memory + localStorage. */
export async function prefetchProfile(
  userId: string,
  opts: { token: string | null; feedBaseUrl: string },
): Promise<void> {
  if (!userId || !opts.token) return;
  if (isProfileCacheFresh(userId)) return;

  try {
    const headers = { Authorization: `Bearer ${opts.token}` };
    const res = await fetch(`${opts.feedBaseUrl}/users/${userId}/profile`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.success || !data.profile) return;

    const prev = readProfileCache(userId);
    writeProfileCache(userId, {
      profile: data.profile,
      skills: prev?.skills || [],
      experiences: prev?.experiences || [],
      projects: prev?.projects || [],
      certifications: prev?.certifications || [],
      education: prev?.education || [],
      achievements: prev?.achievements || [],
      recommendations: prev?.recommendations || [],
      posts: prev?.posts || [],
      statsSummary: prev?.statsSummary ?? null,
    });
  } catch {
    // non-fatal
  }
}

export function clearProfileCache(userId?: string): void {
  if (userId) {
    const id = resolveProfileCacheId(userId);
    MEMORY.delete(id);
    MEMORY.delete(userId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey(id));
        localStorage.removeItem(storageKey(userId));
      } catch {
        // ignore
      }
    }
    return;
  }
  MEMORY.clear();
}
