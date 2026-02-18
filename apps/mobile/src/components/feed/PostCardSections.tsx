/**
 * PostCard Sections — Extracted memoized sub-components
 * 
 * Reduces PostCardInner from 770 lines to ~500 lines by extracting
 * post-type-specific rendering into focused, independently memoized sections.
 * Each section only receives the data it needs (not the full Post object),
 * so React.memo comparison is cheap.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// ═══════════════════════════════════════════
// Deadline Banner
// ═══════════════════════════════════════════

interface DeadlineBannerProps {
    deadlineInfo: { text: string; isUrgent: boolean };
}

export const DeadlineBanner = React.memo<DeadlineBannerProps>(({ deadlineInfo }) => (
    <View style={[sectionStyles.deadlineBanner, deadlineInfo.isUrgent && sectionStyles.deadlineBannerUrgent]}>
        <Ionicons
            name={deadlineInfo.isUrgent ? 'warning' : 'time-outline'}
            size={16}
            color={deadlineInfo.isUrgent ? '#EF4444' : '#F59E0B'}
        />
        <Text style={[sectionStyles.deadlineText, deadlineInfo.isUrgent && sectionStyles.deadlineTextUrgent]}>
            {deadlineInfo.isUrgent ? '⚡ Due soon: ' : 'Due: '}{deadlineInfo.text}
        </Text>
    </View>
));

// ═══════════════════════════════════════════
// Club Announcement Banner
// ═══════════════════════════════════════════

interface ClubAnnouncementProps {
    typeConfig: { bgColor: string; color: string };
    onPress?: () => void;
}

export const ClubAnnouncement = React.memo<ClubAnnouncementProps>(({ typeConfig, onPress }) => (
    <LinearGradient
        colors={[typeConfig.bgColor, '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={sectionStyles.clubBanner}
    >
        <View style={sectionStyles.clubBannerContent}>
            <View style={[sectionStyles.clubIconCircle, { backgroundColor: typeConfig.color + '20' }]}>
                <Ionicons name="people" size={24} color={typeConfig.color} />
            </View>
            <View style={sectionStyles.clubBannerText}>
                <View style={sectionStyles.clubBannerHeader}>
                    <Ionicons name="sparkles" size={14} color={typeConfig.color} />
                    <Text style={[sectionStyles.clubBannerTitle, { color: typeConfig.color }]}>
                        New Study Club Available
                    </Text>
                </View>
                <Text style={sectionStyles.clubBannerSubtitle}>
                    Join this community and start learning together!
                </Text>
            </View>
        </View>
        <TouchableOpacity
            style={[sectionStyles.clubJoinButton, { backgroundColor: typeConfig.color }]}
            onPress={onPress}
        >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={sectionStyles.clubJoinButtonText}>View Club</Text>
        </TouchableOpacity>
    </LinearGradient>
));

// ═══════════════════════════════════════════
// Quiz Section — Largest extracted section (~160 lines → standalone)
// ═══════════════════════════════════════════

interface QuizSectionProps {
    quizData: {
        id: string;
        questions?: any[];
        timeLimit?: number | null;
        totalPoints?: number | null;
        passingScore?: number | null;
        userAttempt?: {
            id: string;
            score: number;
            passed: boolean;
            pointsEarned?: number;
            answers?: any[];
            results?: any[];
        } | null;
    };
    postTitle?: string;
    postContent: string;
    postId: string;
    quizThemeColor: string;
    quizGradient: [string, string];
}

export const QuizSection = React.memo<QuizSectionProps>(({
    quizData,
    postTitle,
    postContent,
    postId,
    quizThemeColor,
    quizGradient,
}) => {
    const navigation = useNavigation<any>();

    const handleTakeQuiz = React.useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('TakeQuiz', {
            quiz: {
                id: quizData.id,
                title: postTitle || 'Quiz',
                description: postContent,
                questions: quizData.questions,
                timeLimit: quizData.timeLimit,
                passingScore: quizData.passingScore,
                totalPoints: quizData.totalPoints,
            },
        });
    }, [quizData, postTitle, postContent]);

    const handleViewResults = React.useCallback(() => {
        if (!quizData.userAttempt) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('QuizResults', {
            quiz: {
                id: quizData.id,
                title: postTitle || 'Quiz',
                description: postContent,
                questions: quizData.questions,
                timeLimit: quizData.timeLimit,
                passingScore: quizData.passingScore,
                totalPoints: quizData.totalPoints,
            },
            answers: quizData.userAttempt.answers || [],
            score: quizData.userAttempt.score,
            passed: quizData.userAttempt.passed,
            pointsEarned: quizData.userAttempt.pointsEarned || 0,
            results: quizData.userAttempt.results || [],
            viewMode: true,
            attemptId: quizData.userAttempt.id,
        });
    }, [quizData, postTitle, postContent]);

    return (
        <View style={sectionStyles.quizSection}>
            <LinearGradient
                colors={quizGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={sectionStyles.quizGradientCard}
            >
                {/* Quiz Header */}
                <View style={sectionStyles.quizHeader}>
                    <View style={sectionStyles.quizIconCircle}>
                        <Ionicons name="rocket" size={24} color={quizThemeColor} />
                    </View>
                    <View style={sectionStyles.quizHeaderText}>
                        <Text style={sectionStyles.quizHeaderTitle}>Test Your Knowledge</Text>
                        <Text style={sectionStyles.quizHeaderSubtitle}>Complete this quiz to earn points!</Text>
                    </View>
                </View>

                {/* Quiz Stats Grid */}
                <View style={sectionStyles.quizStatsGrid}>
                    <View style={sectionStyles.quizStatItem}>
                        <View style={sectionStyles.quizStatIconBg}>
                            <Ionicons name="document-text-outline" size={20} color={quizThemeColor} />
                        </View>
                        <Text style={sectionStyles.quizStatValue}>{quizData.questions?.length || 0}</Text>
                        <Text style={sectionStyles.quizStatLabel}>Questions</Text>
                    </View>

                    <View style={sectionStyles.quizStatItem}>
                        <View style={sectionStyles.quizStatIconBg}>
                            <Ionicons name="time-outline" size={20} color={quizThemeColor} />
                        </View>
                        <Text style={sectionStyles.quizStatValue}>
                            {quizData.timeLimit ? `${quizData.timeLimit}m` : 'No limit'}
                        </Text>
                        <Text style={sectionStyles.quizStatLabel}>Time</Text>
                    </View>

                    <View style={sectionStyles.quizStatItem}>
                        <View style={sectionStyles.quizStatIconBg}>
                            <Ionicons name="star" size={20} color="#F59E0B" />
                        </View>
                        <Text style={sectionStyles.quizStatValue}>{quizData.totalPoints || 100}</Text>
                        <Text style={sectionStyles.quizStatLabel}>Points</Text>
                    </View>

                    <View style={sectionStyles.quizStatItem}>
                        <View style={sectionStyles.quizStatIconBg}>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                        </View>
                        <Text style={sectionStyles.quizStatValue}>{quizData.passingScore || 70}%</Text>
                        <Text style={sectionStyles.quizStatLabel}>Pass</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                {quizData.userAttempt ? (
                    <View style={sectionStyles.quizActionButtons}>
                        {/* Previous Attempt Info */}
                        <View style={sectionStyles.attemptInfoBar}>
                            <View style={sectionStyles.attemptIconBg}>
                                <Ionicons
                                    name={quizData.userAttempt.passed ? 'checkmark-circle' : 'close-circle'}
                                    size={16}
                                    color={quizData.userAttempt.passed ? '#10B981' : '#EF4444'}
                                />
                            </View>
                            <Text style={sectionStyles.attemptText}>
                                Previous: {quizData.userAttempt.score}%
                            </Text>
                            <View style={[
                                sectionStyles.attemptBadge,
                                quizData.userAttempt.passed ? sectionStyles.passedBadge : sectionStyles.failedBadge,
                            ]}>
                                <Text style={sectionStyles.attemptBadgeText}>
                                    {quizData.userAttempt.passed ? 'Passed' : 'Not Passed'}
                                </Text>
                            </View>
                        </View>

                        {/* View Results */}
                        <TouchableOpacity onPress={handleViewResults} style={sectionStyles.viewResultsButton}>
                            <Ionicons name="eye-outline" size={20} color="#6366F1" />
                            <Text style={sectionStyles.viewResultsButtonText}>View Results</Text>
                        </TouchableOpacity>

                        {/* Retake Quiz */}
                        <TouchableOpacity onPress={handleTakeQuiz} style={sectionStyles.retakeQuizButton}>
                            <Ionicons name="refresh" size={20} color={quizThemeColor} />
                            <Text style={[sectionStyles.retakeQuizButtonText, { color: quizThemeColor }]}>Retake Quiz</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity onPress={handleTakeQuiz} style={sectionStyles.takeQuizButton}>
                        <Ionicons name="play-circle" size={22} color={quizThemeColor} />
                        <Text style={[sectionStyles.takeQuizButtonText, { color: quizThemeColor }]}>Take Quiz Now</Text>
                        <Ionicons name="arrow-forward" size={18} color={quizThemeColor} />
                    </TouchableOpacity>
                )}
            </LinearGradient>
        </View>
    );
});

// ═══════════════════════════════════════════
// Styles (extracted from PostCard)
// ═══════════════════════════════════════════

const sectionStyles = StyleSheet.create({
    // Deadline
    deadlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFBEB',
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 8,
        gap: 8,
    },
    deadlineBannerUrgent: {
        backgroundColor: '#FEE2E2',
    },
    deadlineText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#92400E',
    },
    deadlineTextUrgent: {
        color: '#DC2626',
    },

    // Club
    clubBanner: {
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 16,
        padding: 16,
    },
    clubBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    clubIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clubBannerText: {
        flex: 1,
    },
    clubBannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    clubBannerTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    clubBannerSubtitle: {
        fontSize: 13,
        color: '#6B7280',
    },
    clubJoinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    clubJoinButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },

    // Quiz
    quizSection: {
        marginTop: 4,
    },
    quizGradientCard: {
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 20,
    },
    quizHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    quizIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quizHeaderText: {
        flex: 1,
    },
    quizHeaderTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    quizHeaderSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    quizStatsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    quizStatItem: {
        alignItems: 'center',
        gap: 4,
    },
    quizStatIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    quizStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    quizStatLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
    },
    quizActionButtons: {
        gap: 8,
    },
    attemptInfoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    attemptIconBg: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    attemptText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    attemptBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    passedBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
    },
    failedBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
    },
    attemptBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
    },
    viewResultsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 8,
    },
    viewResultsButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6366F1',
    },
    retakeQuizButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        paddingVertical: 10,
        gap: 6,
    },
    retakeQuizButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    takeQuizButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 14,
        paddingVertical: 14,
        gap: 8,
    },
    takeQuizButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
