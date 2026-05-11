/**
 * Normalizes ranked feed API payloads (`GET /posts/feed`) into renderable rows
 * (posts + injected suggestion carousels).
 */

export interface FeedPostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl: string | null;
  role: string;
  isVerified?: boolean;
  professionalTitle?: string;
  level?: number;
  achievements?: Array<{
    id: string;
    type: string;
    title: string;
    rarity: string;
    badgeUrl?: string;
  }>;
}

/** Post shape used by the main feed / PostCard plumbing */
export interface FeedPost {
  id: string;
  title?: string;
  content: string;
  visibility: string;
  postType: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  mediaUrls?: string[];
  mediaDisplayMode?: 'AUTO' | 'FIXED_HEIGHT' | 'FULL_HEIGHT';
  author: FeedPostAuthor;
  isLiked?: boolean;
  isLikedByMe?: boolean;
  isBookmarked?: boolean;
  likes?: { userId: string }[];
  pollOptions?: { id: string; text: string; _count?: { votes: number } }[];
  userVotedOptionId?: string;
  studyClubId?: string;
  quizData?: {
    questions?: { id: string; text: string }[];
    timeLimit?: number;
    passingScore?: number;
  };
  userAttempt?: {
    score: number;
    passed: boolean;
  };
  quiz?: {
    id: string;
    questions?: { id: string; text: string }[];
    timeLimit?: number;
    passingScore?: number;
    userAttempt?: { score: number; passed: boolean } | null;
  };
}

export interface FeedSuggestedUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
  role?: string;
  headline?: string | null;
}

export interface FeedSuggestedCourse {
  id: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  enrollmentCount?: number;
  instructor?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    profilePictureUrl?: string | null;
  };
}

export interface FeedSuggestedQuiz {
  id?: string;
  postId?: string;
  title?: string | null;
  topicTags?: string[];
  timeLimit?: number | null;
  passingScore?: number | null;
}

export type FeedRow =
  | { kind: 'post'; key: string; post: FeedPost }
  | { kind: 'suggested_users'; key: string; users: FeedSuggestedUser[] }
  | { kind: 'suggested_courses'; key: string; courses: FeedSuggestedCourse[] }
  | { kind: 'suggested_quizzes'; key: string; quizzes: FeedSuggestedQuiz[] };

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function feedApiPostToPost(raw: unknown): FeedPost | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== 'string' || !p.id) return null;

  const author = (p.author && typeof p.author === 'object' ? p.author : {}) as Record<string, unknown>;

  const pollOptionsRaw = p.pollOptions;
  const pollOptions = Array.isArray(pollOptionsRaw)
    ? pollOptionsRaw.map((opt: unknown) => {
        const o = (opt && typeof opt === 'object' ? opt : {}) as Record<string, unknown>;
        const votes =
          num(o.votes, NaN) ||
          num((o._count as Record<string, unknown> | undefined)?.votes, 0) ||
          num(o.votesCount, 0);
        return {
          id: String(o.id ?? ''),
          text: String(o.text ?? ''),
          _count: { votes: Number.isFinite(votes) ? votes : 0 },
        };
      }).filter((o) => o.id)
    : undefined;

  const quizRaw = p.quiz;
  const quiz =
    quizRaw && typeof quizRaw === 'object'
      ? (() => {
          const q = quizRaw as Record<string, unknown>;
          const ua = q.userAttempt as Record<string, unknown> | undefined | null;
          return {
            id: String(q.id ?? ''),
            questions: Array.isArray(q.questions) ? (q.questions as NonNullable<FeedPost['quiz']>['questions']) : undefined,
            timeLimit: typeof q.timeLimit === 'number' ? q.timeLimit : undefined,
            passingScore: typeof q.passingScore === 'number' ? q.passingScore : undefined,
            userAttempt:
              ua && typeof ua === 'object'
                ? {
                    score: num(ua.score, 0),
                    passed: Boolean(ua.passed),
                  }
                : null,
          };
        })()
      : undefined;

  const isLikedByMe = Boolean(p.isLikedByMe ?? p.isLiked);

  return {
    id: p.id,
    title: typeof p.title === 'string' ? p.title : undefined,
    content: typeof p.content === 'string' ? p.content : '',
    visibility: typeof p.visibility === 'string' ? p.visibility : 'PUBLIC',
    postType: typeof p.postType === 'string' ? p.postType : 'ARTICLE',
    likesCount: num(p.likesCount, 0),
    commentsCount: num(p.commentsCount, 0),
    sharesCount: num(p.sharesCount, 0),
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
    mediaUrls: Array.isArray(p.mediaUrls) ? (p.mediaUrls as string[]) : undefined,
    mediaDisplayMode:
      p.mediaDisplayMode === 'AUTO' || p.mediaDisplayMode === 'FIXED_HEIGHT' || p.mediaDisplayMode === 'FULL_HEIGHT'
        ? p.mediaDisplayMode
        : undefined,
    author: {
      id: typeof author.id === 'string' ? author.id : '',
      firstName: typeof author.firstName === 'string' ? author.firstName : '',
      lastName: typeof author.lastName === 'string' ? author.lastName : '',
      profilePictureUrl: typeof author.profilePictureUrl === 'string' ? author.profilePictureUrl : null,
      role: typeof author.role === 'string' ? author.role : 'STUDENT',
      isVerified: Boolean(author.isVerified),
      professionalTitle: typeof author.professionalTitle === 'string' ? author.professionalTitle : undefined,
      level: typeof author.level === 'number' ? author.level : undefined,
      achievements: Array.isArray(author.achievements)
        ? (author.achievements as FeedPostAuthor['achievements'])
        : undefined,
    },
    isLiked: isLikedByMe,
    isLikedByMe,
    isBookmarked: Boolean(p.isBookmarked),
    pollOptions,
    userVotedOptionId: typeof p.userVotedOptionId === 'string' ? p.userVotedOptionId : undefined,
    studyClubId: typeof p.studyClubId === 'string' ? p.studyClubId : undefined,
    quiz,
    quizData:
      p.quizData && typeof p.quizData === 'object'
        ? (p.quizData as FeedPost['quizData'])
        : quiz && !p.quizData
          ? {
              questions: quiz.questions,
              timeLimit: quiz.timeLimit,
              passingScore: quiz.passingScore,
            }
          : undefined,
    userAttempt:
      p.userAttempt && typeof p.userAttempt === 'object'
        ? (p.userAttempt as FeedPost['userAttempt'])
        : quiz?.userAttempt ?? undefined,
  };
}

function mapSuggestedUser(u: unknown): FeedSuggestedUser | null {
  if (!u || typeof u !== 'object') return null;
  const o = u as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : null;
  if (!id) return null;
  return {
    id,
    firstName: typeof o.firstName === 'string' ? o.firstName : null,
    lastName: typeof o.lastName === 'string' ? o.lastName : null,
    profilePictureUrl: typeof o.profilePictureUrl === 'string' ? o.profilePictureUrl : undefined,
    role: typeof o.role === 'string' ? o.role : undefined,
    headline: typeof o.headline === 'string' ? o.headline : null,
  };
}

function mapSuggestedCourse(c: unknown): FeedSuggestedCourse | null {
  if (!c || typeof c !== 'object') return null;
  const o = c as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : null;
  if (!id) return null;
  const inst = o.instructor && typeof o.instructor === 'object' ? (o.instructor as Record<string, unknown>) : null;
  return {
    id,
    title: typeof o.title === 'string' ? o.title : null,
    thumbnailUrl:
      (typeof o.thumbnailUrl === 'string' && o.thumbnailUrl) ||
      (typeof o.thumbnail === 'string' && o.thumbnail) ||
      null,
    enrollmentCount: num(o.enrollmentCount ?? o.enrolledCount, 0),
    instructor: inst
      ? {
          id: typeof inst.id === 'string' ? inst.id : undefined,
          firstName: typeof inst.firstName === 'string' ? inst.firstName : null,
          lastName: typeof inst.lastName === 'string' ? inst.lastName : null,
          profilePictureUrl: typeof inst.profilePictureUrl === 'string' ? inst.profilePictureUrl : undefined,
        }
      : undefined,
  };
}

function mapSuggestedQuiz(q: unknown): FeedSuggestedQuiz | null {
  if (!q || typeof q !== 'object') return null;
  const o = q as Record<string, unknown>;
  const postId = typeof o.postId === 'string' ? o.postId : undefined;
  const id = typeof o.id === 'string' ? o.id : undefined;
  if (!postId && !id) return null;
  return {
    id,
    postId,
    title: typeof o.title === 'string' ? o.title : null,
    topicTags: Array.isArray(o.topicTags) ? (o.topicTags as string[]) : undefined,
    timeLimit: typeof o.timeLimit === 'number' ? o.timeLimit : undefined,
    passingScore: typeof o.passingScore === 'number' ? o.passingScore : undefined,
  };
}

/** Parses `data.data` array from `/posts/feed` (or chronological `/posts`). */
export function parseFeedPayloadItems(items: unknown, indexSeed = 0): FeedRow[] {
  if (!Array.isArray(items)) return [];

  const rows: FeedRow[] = [];

  items.forEach((raw, i) => {
    const idx = indexSeed + i;
    if (!raw || typeof raw !== 'object') return;
    const item = raw as { type?: string; data?: unknown };

    if (item.type === 'POST' && item.data) {
      const post = feedApiPostToPost(item.data);
      if (post) rows.push({ kind: 'post', key: `post:${post.id}`, post });
      return;
    }

    if (item.type === 'SUGGESTED_USERS' && Array.isArray(item.data)) {
      const users = item.data.map(mapSuggestedUser).filter(Boolean) as FeedSuggestedUser[];
      if (users.length) rows.push({ kind: 'suggested_users', key: `suggested_users:${idx}`, users });
      return;
    }

    if (item.type === 'SUGGESTED_COURSES' && Array.isArray(item.data)) {
      const courses = item.data.map(mapSuggestedCourse).filter(Boolean) as FeedSuggestedCourse[];
      if (courses.length) rows.push({ kind: 'suggested_courses', key: `suggested_courses:${idx}`, courses });
      return;
    }

    if (item.type === 'SUGGESTED_QUIZZES' && Array.isArray(item.data)) {
      const quizzes = item.data.map(mapSuggestedQuiz).filter(Boolean) as FeedSuggestedQuiz[];
      if (quizzes.length) rows.push({ kind: 'suggested_quizzes', key: `suggested_quizzes:${idx}`, quizzes });
      return;
    }

    const post = feedApiPostToPost(raw);
    if (post) rows.push({ kind: 'post', key: `post:${post.id}`, post });
  });

  return rows;
}

export function mergeFeedRows(current: FeedRow[], incoming: FeedRow[], maxRows = 800): FeedRow[] {
  const seenPostIds = new Set(
    current.filter((r): r is Extract<FeedRow, { kind: 'post' }> => r.kind === 'post').map((r) => r.post.id)
  );

  const merged = [...current];
  for (const row of incoming) {
    if (row.kind === 'post') {
      if (seenPostIds.has(row.post.id)) continue;
      seenPostIds.add(row.post.id);
    }
    merged.push(row);
  }

  return merged.slice(0, maxRows);
}

export function countPostRows(rows: FeedRow[]): number {
  return rows.filter((r) => r.kind === 'post').length;
}

export function flattenPosts(rows: FeedRow[]): FeedPost[] {
  return rows.filter((r): r is Extract<FeedRow, { kind: 'post' }> => r.kind === 'post').map((r) => r.post);
}
