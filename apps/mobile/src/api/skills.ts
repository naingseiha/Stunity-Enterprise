import { feedApi } from './client';
import { track } from '@/services/analytics';

export interface SkillEndorser {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl: string | null;
  headline?: string | null;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillName: string;
  category: string;
  level: string;
  isVerified: boolean;
  endorsementCount: number;
  endorsedByMe: boolean;
  endorsements: { id: string; endorser: SkillEndorser }[];
}

export async function fetchUserSkills(userId: string = 'me'): Promise<UserSkill[]> {
  const { data } = await feedApi.get<{ success: boolean; skills: UserSkill[] }>(
    `/users/${userId}/skills`,
  );
  return data.skills || [];
}

export async function endorseSkill(skillId: string) {
  const { data } = await feedApi.post(`/skills/${skillId}/endorse`);
  track('endorsement_given', { skillId });
  return data;
}

export async function unendorseSkill(skillId: string) {
  const { data } = await feedApi.delete(`/skills/${skillId}/endorse`);
  return data;
}
