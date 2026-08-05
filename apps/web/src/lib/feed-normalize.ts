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
  myReaction?: string | null;
  reactionCounts?: Record<string, number>;
  isValued?: boolean;
  valuesCount?: number;
  isBookmarked?: boolean;
  likes?: { userId: string }[];
  pollOptions?: { id: string; text: string; _count?: { votes: number } }[];
  userVotedOptionId?: string;
  studyClubId?: string;
  resourceUrl?: string | null;
  resourceType?: string | null;
  questionBounty?: number;
  difficultyLevel?: number | null;
  topicTags?: string[];
  repostOfId?: string | null;
  repostComment?: string | null;
  repostOf?: {
    id: string;
    title?: string | null;
    content?: string | null;
    postType?: string;
    mediaUrls?: string[];
    createdAt?: string;
    author?: {
      id: string;
      firstName?: string;
      lastName?: string;
      profilePictureUrl?: string | null;
    };
  } | null;
  // Assignment
  assignmentDueDate?: string | null;
  assignmentPoints?: number | null;
  assignmentSubmissionType?: string | null;
  // Course
  courseCode?: string | null;
  courseLevel?: string | null;
  courseDuration?: string | null;
  // Exam
  examDate?: string | null;
  examDuration?: number | null;
  examTotalPoints?: number | null;
  examPassingScore?: number | null;
  // Announcement
  announcementUrgency?: string | null;
  announcementExpiryDate?: string | null;
  // Tutorial
  tutorialDifficulty?: string | null;
  tutorialEstimatedTime?: string | null;
  // Project
  projectStatus?: string | null;
  projectDeadline?: string | null;
  projectTeamSize?: number | null;
  // Research
  researchField?: string | null;
  researchCollaborators?: string | null;
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
  coverPhotoUrl?: string | null;
  role?: string;
  headline?: string | null;
  isFollowing?: boolean;
}

export interface FeedSuggestedCourse {
  id: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  enrollmentCount?: number;
  rating?: number;
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
  questionCount?: number;
  totalPoints?: number;
  thumbnailUrl?: string | null;
  questions?: unknown[];
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

  const myReaction =
    typeof p.myReaction === 'string' && p.myReaction
      ? p.myReaction
      : null;
  const isLikedByMe = Boolean(p.isLikedByMe ?? p.isLiked ?? myReaction);
  const reactionCounts =
    p.reactionCounts && typeof p.reactionCounts === 'object' && !Array.isArray(p.reactionCounts)
      ? (p.reactionCounts as Record<string, number>)
      : undefined;

  const repostOfRaw = p.repostOf;
  const repostOf =
    repostOfRaw && typeof repostOfRaw === 'object'
      ? (() => {
          const r = repostOfRaw as Record<string, unknown>;
          const ra = (r.author && typeof r.author === 'object' ? r.author : {}) as Record<string, unknown>;
          return {
            id: String(r.id ?? ''),
            title: typeof r.title === 'string' ? r.title : null,
            content: typeof r.content === 'string' ? r.content : null,
            postType: typeof r.postType === 'string' ? r.postType : undefined,
            mediaUrls: Array.isArray(r.mediaUrls) ? (r.mediaUrls as string[]) : undefined,
            createdAt: typeof r.createdAt === 'string' ? r.createdAt : undefined,
            author: {
              id: typeof ra.id === 'string' ? ra.id : '',
              firstName: typeof ra.firstName === 'string' ? ra.firstName : '',
              lastName: typeof ra.lastName === 'string' ? ra.lastName : '',
              profilePictureUrl: typeof ra.profilePictureUrl === 'string' ? ra.profilePictureUrl : null,
            },
          };
        })()
      : null;
  const optionalString = (v: unknown): string | undefined =>
    typeof v === 'string' && v ? v : undefined;
  const optionalNullableString = (v: unknown): string | null | undefined =>
    typeof v === 'string' ? v : v === null ? null : undefined;
  const optionalNullableNumber = (v: unknown): number | null | undefined => {
    if (v === null) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

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
    myReaction: myReaction ?? (isLikedByMe ? 'LIKE' : null),
    reactionCounts,
    isValued: Boolean(p.isValued ?? p.isValuedByMe),
    valuesCount: num(p.valuesCount, 0),
    isBookmarked: Boolean(p.isBookmarked),
    pollOptions,
    userVotedOptionId: typeof p.userVotedOptionId === 'string' ? p.userVotedOptionId : undefined,
    studyClubId: optionalString(p.studyClubId),
    resourceUrl: optionalNullableString(p.resourceUrl),
    repostOfId: optionalNullableString(p.repostOfId),
    repostComment: optionalNullableString(p.repostComment),
    repostOf: repostOf?.id ? repostOf : null,
    resourceType: optionalNullableString(p.resourceType),
    questionBounty: num(p.questionBounty, 0) || undefined,
    difficultyLevel: optionalNullableNumber(p.difficultyLevel),
    topicTags: Array.isArray(p.topicTags) ? (p.topicTags as string[]) : undefined,
    assignmentDueDate: optionalNullableString(p.assignmentDueDate) ?? (p.assignmentDueDate instanceof Date ? p.assignmentDueDate.toISOString() : undefined),
    assignmentPoints: optionalNullableNumber(p.assignmentPoints),
    assignmentSubmissionType: optionalNullableString(p.assignmentSubmissionType),
    courseCode: optionalNullableString(p.courseCode),
    courseLevel: optionalNullableString(p.courseLevel),
    courseDuration: optionalNullableString(p.courseDuration),
    examDate: optionalNullableString(p.examDate) ?? (p.examDate instanceof Date ? (p.examDate as Date).toISOString() : undefined),
    examDuration: optionalNullableNumber(p.examDuration),
    examTotalPoints: optionalNullableNumber(p.examTotalPoints),
    examPassingScore: optionalNullableNumber(p.examPassingScore),
    announcementUrgency: optionalNullableString(p.announcementUrgency),
    announcementExpiryDate: optionalNullableString(p.announcementExpiryDate) ?? (p.announcementExpiryDate instanceof Date ? (p.announcementExpiryDate as Date).toISOString() : undefined),
    tutorialDifficulty: optionalNullableString(p.tutorialDifficulty),
    tutorialEstimatedTime: optionalNullableString(p.tutorialEstimatedTime),
    projectStatus: optionalNullableString(p.projectStatus),
    projectDeadline: optionalNullableString(p.projectDeadline) ?? (p.projectDeadline instanceof Date ? (p.projectDeadline as Date).toISOString() : undefined),
    projectTeamSize: optionalNullableNumber(p.projectTeamSize),
    researchField: optionalNullableString(p.researchField),
    researchCollaborators: optionalNullableString(p.researchCollaborators),
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
    coverPhotoUrl:
      typeof o.coverPhotoUrl === 'string'
        ? o.coverPhotoUrl
        : typeof o.coverImageUrl === 'string'
          ? o.coverImageUrl
          : undefined,
    role: typeof o.role === 'string' ? o.role : undefined,
    headline: typeof o.headline === 'string' ? o.headline : null,
    isFollowing: Boolean(o.isFollowing),
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
    rating: typeof o.rating === 'number' ? o.rating : undefined,
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
  const questions = Array.isArray(o.questions) ? o.questions : undefined;
  const questionCount =
    typeof o.questionCount === 'number'
      ? o.questionCount
      : questions
        ? questions.length
        : undefined;
  return {
    id,
    postId,
    title: typeof o.title === 'string' ? o.title : null,
    topicTags: Array.isArray(o.topicTags) ? (o.topicTags as string[]) : undefined,
    timeLimit: typeof o.timeLimit === 'number' ? o.timeLimit : undefined,
    passingScore: typeof o.passingScore === 'number' ? o.passingScore : undefined,
    questionCount,
    totalPoints: typeof o.totalPoints === 'number' ? o.totalPoints : undefined,
    thumbnailUrl:
      (typeof o.thumbnailUrl === 'string' && o.thumbnailUrl) ||
      (typeof o.coverImageUrl === 'string' && o.coverImageUrl) ||
      (typeof o.imageUrl === 'string' && o.imageUrl) ||
      null,
    questions,
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

/** Maps a normalized feed post into the PostCard prop shape. */
export function feedPostToCardData(
  post: FeedPost,
  opts?: {
    isLiked?: boolean;
    isBookmarked?: boolean;
    comments?: Array<{
      id: string;
      content: string;
      author: { firstName: string; lastName: string };
      createdAt: string;
    }>;
  },
) {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    postType: post.postType || 'ARTICLE',
    visibility: post.visibility,
    author: {
      id: post.author.id,
      firstName: post.author.firstName,
      lastName: post.author.lastName,
      profileImage: post.author.profilePictureUrl,
      role: post.author.role,
      isVerified: post.author.isVerified,
      professionalTitle: post.author.professionalTitle,
      level: post.author.level,
      achievements: post.author.achievements,
    },
    createdAt: post.createdAt,
    likesCount: post.likesCount,
    valuesCount: post.valuesCount,
    commentsCount: post.commentsCount,
    sharesCount: post.sharesCount,
    isLiked: opts?.isLiked ?? post.isLiked ?? post.isLikedByMe,
    myReaction: post.myReaction ?? null,
    reactionCounts: post.reactionCounts,
    isValued: post.isValued,
    isBookmarked: opts?.isBookmarked ?? post.isBookmarked,
    mediaUrls: post.mediaUrls,
    mediaDisplayMode: post.mediaDisplayMode,
    resourceUrl: post.resourceUrl ?? undefined,
    resourceType: post.resourceType ?? undefined,
    studyClubId: post.studyClubId,
    questionBounty: post.questionBounty,
    difficultyLevel: post.difficultyLevel ?? undefined,
    topicTags: post.topicTags,
    assignmentDueDate: post.assignmentDueDate ?? undefined,
    assignmentPoints: post.assignmentPoints ?? undefined,
    assignmentSubmissionType: post.assignmentSubmissionType ?? undefined,
    courseCode: post.courseCode ?? undefined,
    courseLevel: post.courseLevel ?? undefined,
    courseDuration: post.courseDuration ?? undefined,
    examDate: post.examDate ?? undefined,
    examDuration: post.examDuration ?? undefined,
    examTotalPoints: post.examTotalPoints ?? undefined,
    examPassingScore: post.examPassingScore ?? undefined,
    announcementUrgency: post.announcementUrgency ?? undefined,
    announcementExpiryDate: post.announcementExpiryDate ?? undefined,
    tutorialDifficulty: post.tutorialDifficulty ?? undefined,
    tutorialEstimatedTime: post.tutorialEstimatedTime ?? undefined,
    projectStatus: post.projectStatus ?? undefined,
    projectDeadline: post.projectDeadline ?? undefined,
    projectTeamSize: post.projectTeamSize ?? undefined,
    researchField: post.researchField ?? undefined,
    researchCollaborators: post.researchCollaborators ?? undefined,
    pollOptions: post.pollOptions?.map((opt) => ({
      id: opt.id,
      text: opt.text,
      votes: opt._count?.votes || 0,
    })),
    userVotedOptionId: post.userVotedOptionId,
    quizData:
      post.quizData ||
      (post.quiz
        ? {
            questions: post.quiz.questions,
            timeLimit: post.quiz.timeLimit,
            passingScore: post.quiz.passingScore,
          }
        : post.postType === 'QUIZ'
          ? { questions: [], timeLimit: undefined, passingScore: 70 }
          : undefined),
    quiz: post.quiz?.id ? { id: post.quiz.id } : undefined,
    userAttempt: post.userAttempt || post.quiz?.userAttempt || undefined,
    comments: opts?.comments,
    repostOfId: post.repostOfId ?? null,
    repostComment: post.repostComment ?? null,
    repostOf: post.repostOf
      ? {
          id: post.repostOf.id,
          title: post.repostOf.title ?? undefined,
          content: post.repostOf.content ?? undefined,
          postType: post.repostOf.postType,
          mediaUrls: post.repostOf.mediaUrls,
          createdAt: post.repostOf.createdAt,
          author: post.repostOf.author
            ? {
                id: post.repostOf.author.id,
                firstName: post.repostOf.author.firstName || '',
                lastName: post.repostOf.author.lastName || '',
                profileImage: post.repostOf.author.profilePictureUrl,
              }
            : undefined,
        }
      : null,
  };
}
