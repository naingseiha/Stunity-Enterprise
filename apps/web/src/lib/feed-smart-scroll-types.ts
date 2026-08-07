/** Smart Scroll overlay types (Recall / Feynman Bounty / Quiz War). */

export type RecallGrade = 'again' | 'good' | 'easy';

export type RecallCardSubject =
  | 'biology'
  | 'mathematics'
  | 'physics'
  | 'chemistry'
  | 'english'
  | 'history'
  | 'geography'
  | 'computerScience'
  | string;

export interface RecallCard {
  id: string;
  questionId: string;
  subject: RecallCardSubject;
  subjectLabel: string;
  courseTitle?: string;
  questionText: string;
  answerText: string;
  hint?: string;
  daysSinceLastSeen: number;
  recallStrength: number;
  classmatesReviewingCount: number;
  xpReward: number;
  protectsStreak: boolean;
}

export type MasterExplainerTier = 'bronze' | 'silver' | 'gold';

export interface FeynmanBounty {
  id: string;
  asker: {
    id: string;
    name: string;
    gradeLabel?: string;
    avatarUrl?: string;
  };
  subject: string;
  subjectColor?: string;
  questionText: string;
  attachmentName?: string;
  bountyXp: number;
  hoursLeft: number;
  tutorsWorking: number;
  answersCount: number;
  topTutor?: {
    id: string;
    name: string;
    tier: MasterExplainerTier;
  };
  createdAt: string;
}

export type QuizWarStatus = 'PRE_MATCH' | 'LIVE' | 'POST_MATCH';

export interface QuizWarTeam {
  id: string;
  name: string;
  color: string;
  score: number;
}

export interface QuizWar {
  id: string;
  status: QuizWarStatus;
  subject: string;
  round: number;
  totalRounds: number;
  timeRemainingSec: number;
  teamA: QuizWarTeam;
  teamB: QuizWarTeam;
  classmatesFighting: number;
  isUserParticipating: boolean;
  userTeamId?: string | null;
  rewardXp: number;
  createdAt: string;
}
