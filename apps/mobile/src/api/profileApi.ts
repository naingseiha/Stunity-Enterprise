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

// ── Profile Update API functions ─────────────────────────────────

export interface UpdateProfileData {
    firstName?: string;
    lastName?: string;
    bio?: string;
    headline?: string;
    professionalTitle?: string;
    location?: string;
    languages?: string[];
    interests?: string[];
    careerGoals?: string;
    socialLinks?: {
        github?: string;
        linkedin?: string;
        facebook?: string;
        portfolio?: string;
    };
    profileVisibility?: string;
    isOpenToOpportunities?: boolean;
}

/** Update own profile fields. */
export async function updateProfile(profileData: UpdateProfileData) {
    const { data } = await feedApi.put('/users/me/profile', profileData);
    return data.profile;
}

/** Upload a new profile photo. Accepts a local file URI. */
export async function uploadProfilePhoto(fileUri: string, fileName: string, mimeType: string = 'image/jpeg') {
    const formData = new FormData();
    formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
    } as any);
    const { data } = await feedApi.post('/users/me/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

/** Upload a new cover photo. Accepts a local file URI. */
export async function uploadCoverPhoto(fileUri: string, fileName: string, mimeType: string = 'image/jpeg') {
    const formData = new FormData();
    formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
    } as any);
    const { data } = await feedApi.post('/users/me/cover-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

/** Remove cover photo. */
export async function deleteCoverPhoto() {
    const { data } = await feedApi.delete('/users/me/cover-photo');
    return data;
}

/** Fetch top users by reputation points */
export async function fetchLeaderboard(limit = 50) {
    const { data } = await feedApi.get<{ success: boolean; leaderboard: User[] }>(`/users/leaderboard?limit=${limit}`);
    return data.leaderboard;
}

export default {
    fetchProfile,
    fetchEducation,
    fetchExperiences,
    fetchCertifications,
    fetchLeaderboard,
    followUser,
    unfollowUser,
    updateProfile,
    uploadProfilePhoto,
    uploadCoverPhoto,
    deleteCoverPhoto,
};
