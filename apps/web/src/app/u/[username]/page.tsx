import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FEED_SERVICE_URL } from '@/lib/api/config';

interface PublicSkill {
  id: string;
  skillName: string;
  category: string | null;
  level: string | null;
}

interface PublicAchievement {
  id: string;
  title: string;
  description: string | null;
  badgeUrl: string | null;
}

interface PublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  profilePictureUrl: string | null;
  coverPhotoUrl: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  professionalTitle: string | null;
  isVerified: boolean;
  level: number;
  totalLearningHours: number;
  currentStreak: number;
  school: { name: string; slug: string | null } | null;
  userSkills: PublicSkill[];
  achievements: PublicAchievement[];
}

async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(
      `${FEED_SERVICE_URL}/public/u/${encodeURIComponent(username)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data as PublicProfile) : null;
  } catch {
    return null;
  }
}

function fullName(p: PublicProfile): string {
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Stunity learner';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  if (!profile) {
    return { title: 'Profile not found | Stunity' };
  }

  const name = fullName(profile);
  const description =
    profile.headline ||
    profile.bio ||
    `${name}'s learning profile on Stunity — skills, achievements, and progress.`;
  const title = `${name}${profile.username ? ` (@${profile.username})` : ''} · Stunity`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: profile.profilePictureUrl ? [{ url: profile.profilePictureUrl }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: profile.profilePictureUrl ? [profile.profilePictureUrl] : undefined,
    },
  };
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center px-4">
      <span className="text-2xl font-extrabold text-gray-900">{value}</span>
      <span className="text-xs font-medium text-gray-500">{label}</span>
    </div>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await fetchPublicProfile(username);
  if (!profile) notFound();

  const name = fullName(profile);
  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 pb-16">
        {/* Cover */}
        <div className="relative mt-6 h-40 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 sm:h-52">
          {profile.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.coverPhotoUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>

        {/* Avatar + identity */}
        <div className="-mt-12 flex flex-col items-center px-4 text-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-md">
            {profile.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profilePictureUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-500">
                {initials}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <h1 className="text-xl font-extrabold text-gray-900">{name}</h1>
            {profile.isVerified ? (
              <svg className="h-5 w-5 text-sky-500" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                <path d="M12 2l2.4 1.8 3 .2.9 2.9 2.2 2-1 2.9 1 2.9-2.2 2-.9 2.9-3 .2L12 22l-2.4-1.8-3-.2-.9-2.9-2.2-2 1-2.9-1-2.9 2.2-2 .9-2.9 3-.2L12 2zm-1.1 13.2l5-5-1.4-1.4-3.6 3.6-1.6-1.6L7.9 12l3 3.2z" />
              </svg>
            ) : null}
          </div>

          {profile.headline || profile.professionalTitle ? (
            <p className="mt-1 text-sm font-medium text-gray-600">
              {profile.headline || profile.professionalTitle}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {profile.school?.name ? <span>🎓 {profile.school.name}</span> : null}
            {profile.location ? <span>📍 {profile.location}</span> : null}
          </div>

          {profile.bio ? (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-700">{profile.bio}</p>
          ) : null}
        </div>

        {/* Stats */}
        <div className="mt-6 flex items-center justify-center divide-x divide-gray-200 rounded-2xl border border-gray-100 bg-white py-4 shadow-sm">
          <Stat value={`Lv ${profile.level}`} label="Level" />
          <Stat value={profile.totalLearningHours} label="Hours learned" />
          <Stat value={profile.currentStreak} label="Day streak" />
        </div>

        {/* Skills */}
        {profile.userSkills?.length ? (
          <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.userSkills.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700"
                >
                  {s.skillName}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* Achievements */}
        {profile.achievements?.length ? (
          <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Achievements</h2>
            <ul className="space-y-3">
              {profile.achievements.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className="mt-0.5 text-xl">🏆</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                    {a.description ? (
                      <p className="text-xs text-gray-500">{a.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Growth CTA — every share is a recruiting funnel */}
        <div className="mt-8 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-6 text-center text-white shadow-md">
          <p className="text-base font-bold">Build your own learning profile</p>
          <p className="mt-1 text-sm text-sky-100">
            Track skills, earn achievements, and keep your streak alive on Stunity.
          </p>
          <a
            href="https://stunity.app"
            className="mt-4 inline-block rounded-full bg-white px-6 py-2 text-sm font-bold text-sky-600"
          >
            Get started
          </a>
        </div>
      </div>
    </main>
  );
}
