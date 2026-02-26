/**
 * AI Service Wrapper
 * 
 * Provides a clean interface for UI components to interact with the AI API,
 * including error handling and standardizing the response.
 */

import { aiApi } from '@/api/ai';

class AIService {
    async generateQuiz(topic: string, gradeLevel = 'Grade 8', questionCount = 5, difficulty = 'MEDIUM') {
        try {
            const response = await aiApi.generateQuiz({ topic, gradeLevel, questionCount, difficulty });
            if (!response.success) throw new Error((response as any).error || (response as any).errors || 'API Error');
            return response.data;
        } catch (error: any) {
            console.error('AIService.generateQuiz failed:', error);
            throw new Error(error?.response?.data?.error || error.message || 'Failed to generate quiz');
        }
    }

    async generateLesson(topic: string, gradeLevel = 'Grade 8', length = 'MEDIUM', tone = 'engaging') {
        try {
            const response = await aiApi.generateLesson({ topic, gradeLevel, length, tone });
            if (!response.success) throw new Error((response as any).error || (response as any).errors || 'API Error');
            return response.data;
        } catch (error: any) {
            throw new Error(error?.response?.data?.error || error.message || 'Failed to generate lesson');
        }
    }

    async generatePollOptions(topic: string, optionCount = 4) {
        try {
            const response = await aiApi.generatePollOptions({ topic, optionCount });
            if (!response.success) throw new Error((response as any).error || (response as any).errors || 'API Error');
            return response.data;
        } catch (error: any) {
            throw new Error(error?.response?.data?.error || error.message || 'Failed to generate poll options');
        }
    }

    async generateCourseOutline(topic: string, gradeLevel = 'Grade 8', weekCount = 4) {
        try {
            const response = await aiApi.generateCourse({ topic, gradeLevel, weekCount });
            if (!response.success) throw new Error((response as any).error || (response as any).errors || 'API Error');
            return response.data;
        } catch (error: any) {
            throw new Error(error?.response?.data?.error || error.message || 'Failed to generate course outline');
        }
    }

    async enhanceContent(content: string, tone = 'educational', type = 'general') {
        try {
            const response = await aiApi.enhanceContent({ content, tone, type });
            if (!response.success) throw new Error((response as any).error || (response as any).errors || 'API Error');
            return response.data;
        } catch (error: any) {
            throw new Error(error?.response?.data?.error || error.message || 'Failed to enhance content');
        }
    }

    async generateAnnouncement(notes: string, schoolName?: string, urgency = 'info') {
        try {
            const response = await aiApi.generateAnnouncement({ notes, schoolName, urgency });
            if (!response.success) throw new Error((response as any).error || (response as any).errors || 'API Error');
            return response.data;
        } catch (error: any) {
            throw new Error(error?.response?.data?.error || 'Failed to draft announcement');
        }
    }

    async generateMilestones(projectTitle: string, description: string, durationWeeks = 2) {
        try {
            const response = await aiApi.generateMilestones({ projectTitle, description, durationWeeks });
            if (!response.success) throw new Error((response as any).error || (response as any).errors || 'API Error');
            return response.data;
        } catch (error: any) {
            throw new Error(error?.response?.data?.error || 'Failed to generate milestones');
        }
    }

    async suggestTags(content: string, existingTags: string[] = []) {
        try {
            const response = await aiApi.suggestTags({ content, existingTags });
            if (!response.success) throw new Error((response as any).error || (response as any).errors || 'API Error');
            return response.data;
        } catch (error: any) {
            throw new Error(error?.response?.data?.error || 'Failed to suggest tags');
        }
    }
}

export const aiService = new AIService();
