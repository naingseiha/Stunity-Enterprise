/**
 * Profile API Service
 * 
 * Wrapper around feed-service profile endpoints.
 * All profile, education, experience, certification, and follow
 * endpoints live on the feed-service (port 3010).
 */

import { feedApi } from './client';
import type { User, UserStats, Education, Experience, Certification } from '@/types';

// ── Response shapes ──────────────────────────────────────────────

interface ProfileResponse {
    success: boolean;
    profile: User & {
        isOwnProfile: boolean;
        isFollowing: boolean;
        stats: UserStats;
    };
}

interface EducationResponse {
    success: boolean;
    education: Education[];
}

interface ExperienceResponse {
    success: boolean;
    experiences: Experience[];
}

interface CertificationResponse {
    success: boolean;
    certifications: Certification[];
}

// ── API functions ────────────────────────────────────────────────

/**
 * Fetch a user's full profile (stats included).
 * Pass 'me' as userId for the current user's profile.
 */
export async function fetchProfile(userId: string = 'me') {
    const { data } = await feedApi.get<ProfileResponse>(`/users/${userId}/profile`);
    return data.profile;
}

/** Fetch education history for a user. */
export async function fetchEducation(userId: string = 'me') {
    const { data } = await feedApi.get<EducationResponse>(`/users/${userId}/education`);
    return data.education;
}

/** Fetch experiences for a user. */
export async function fetchExperiences(userId: string = 'me') {
    const { data } = await feedApi.get<ExperienceResponse>(`/users/${userId}/experiences`);
    return data.experiences;
}

/** Fetch certifications for a user. */
export async function fetchCertifications(userId: string = 'me') {
    const { data } = await feedApi.get<CertificationResponse>(`/users/${userId}/certifications`);
    return data.certifications;
}

/** Follow a user. */
export async function followUser(userId: string) {
    const { data } = await feedApi.post(`/users/${userId}/follow`);
    return data;
}

/** Unfollow a user. */
export async function unfollowUser(userId: string) {
    const { data } = await feedApi.delete(`/users/${userId}/follow`);
    return data;
}

export default {
    fetchProfile,
    fetchEducation,
    fetchExperiences,
    fetchCertifications,
    followUser,
    unfollowUser,
};
