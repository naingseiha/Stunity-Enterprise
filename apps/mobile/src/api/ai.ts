/**
 * AI API Client
 * 
 * Handles all requests to the ai-service microservice.
 */

import axios, { AxiosInstance } from 'axios';
import { Config, APP_CONFIG } from '@/config';
import { tokenService } from '@/services/token';
import { ApiResponse } from '@/types';

// Create a dedicated AI client separate from feed client due to different timeout needs
// AI generation can take 5-15 seconds
const aiClient: AxiosInstance = axios.create({
    baseURL: Config.aiUrl,
    timeout: 30000, // 30 seconds timeout for AI generation
    headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': APP_CONFIG.APP_VERSION,
        'X-Platform': 'mobile',
    },
});

// Add auth token interceptor
aiClient.interceptors.request.use(async (config) => {
    const token = await tokenService.getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for logging
aiClient.interceptors.response.use(
    (response) => {
        if (__DEV__) console.log(`✅ [AI API] ${response.config.url} - ${response.status}`);
        return response;
    },
    (error) => {
        if (__DEV__) console.error(`❌ [AI API] Error:`, error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export const aiApi = {
    // Quiz
    generateQuiz: async (params: { topic: string; gradeLevel?: string; questionCount?: number; difficulty?: string }) => {
        const response = await aiClient.post<ApiResponse<any[]>>('/ai/generate/quiz', params);
        return response.data;
    },

    // Lesson
    generateLesson: async (params: { topic: string; gradeLevel?: string; length?: string; tone?: string }) => {
        const response = await aiClient.post<ApiResponse<any>>('/ai/generate/lesson', params);
        return response.data;
    },

    // Poll
    generatePollOptions: async (params: { topic: string; optionCount?: number }) => {
        const response = await aiClient.post<ApiResponse<{ question: string; options: string[] }>>('/ai/generate/poll-options', params);
        return response.data;
    },

    // Course
    generateCourse: async (params: { topic: string; gradeLevel?: string; weekCount?: number }) => {
        const response = await aiClient.post<ApiResponse<any>>('/ai/generate/course', params);
        return response.data;
    },

    // Content Enhancer
    enhanceContent: async (params: { content: string; tone?: string; type?: string }) => {
        const response = await aiClient.post<ApiResponse<{ enhanced: string; changes: string }>>('/ai/enhance/content', params);
        return response.data;
    },

    // Announcement Draft
    generateAnnouncement: async (params: { notes: string; schoolName?: string; urgency?: string }) => {
        const response = await aiClient.post<ApiResponse<{ subject: string; body: string }>>('/ai/generate/announcement', params);
        return response.data;
    },

    // Milestones
    generateMilestones: async (params: { projectTitle: string; description: string; durationWeeks?: number }) => {
        const response = await aiClient.post<ApiResponse<{ milestones: any[] }>>('/ai/generate/milestones', params);
        return response.data;
    },

    // Tags
    suggestTags: async (params: { content: string; existingTags?: string[]; maxTags?: number }) => {
        const response = await aiClient.post<ApiResponse<{ tags: string[] }>>('/ai/suggest/tags', params);
        return response.data;
    },
};

export default aiApi;
