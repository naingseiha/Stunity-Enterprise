/**
 * PostCard Sections — Extracted memoized sub-components
 * 
 * Reduces PostCardInner from 770 lines to ~500 lines by extracting
 * post-type-specific rendering into focused, independently memoized sections.
 * Each section only receives the data it needs (not the full Post object),
 * so React.memo comparison is cheap.
 */

import React from 'react';
import { useThemeContext } from '@/contexts';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Haptics } from '@/services/haptics';
import { useTranslation } from 'react-i18next';

// ═══════════════════════════════════════════
// Deadline Banner
// ═══════════════════════════════════════════

interface DeadlineBannerProps {
    deadlineInfo: { text: string; isUrgent: boolean };
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    // Deadline
    deadlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: isDark ? colors.surfaceVariant : '#F0F9FF',
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 8,
        gap: 8,
    },
    deadlineBannerUrgent: {
        backgroundColor: isDark ? '#450a0a' : '#FEE2E2',
    },
    deadlineText: {
        fontSize: 13,
        fontWeight: '600',
        color: isDark ? colors.text : '#0C4A6E',
    },
    deadlineTextUrgent: {
        color: '#EF4444',
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
        color: colors.textSecondary,
    },
    clubJoinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        gap: 6,
    },
    clubJoinButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },

    // Quiz — clean flat design with stat cards
    quizSection: {
        marginHorizontal: 16,
        marginTop: 6,
        gap: 14,
    },
    quizHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    quizIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quizHeaderText: {
        flex: 1,
    },
    quizHeaderTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    quizHeaderSubtitle: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 1,
    },
    quizStatsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    quizStatCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 6,
    },
    quizStatIconBg: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quizStatValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    quizStatLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.textTertiary,
    },
    quizCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 50,
        gap: 8,
        marginTop: 4,
        marginBottom: 8,
    },
    quizCtaText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.2,
    },
    quizAttemptedBlock: {
        gap: 12,
        marginTop: 6,
        marginBottom: 8,
    },
    quizScoreBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 50,
        gap: 8,
    },
    quizScoreText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
    },
    quizPassBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 50,
    },
    quizPassBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    quizActionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    quizRoundedBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 50,
    },
    quizRoundedBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Event Created
    eventCreatedContainer: {
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 8,
    },
    eventTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    eventGradient: {
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    eventContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    eventIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eventInfo: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    eventMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 4,
    },
    eventMetaText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    metaSeparator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.border,
        marginHorizontal: 4,
    },
    eventActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 999,
        gap: 8,
    },
    eventActionButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },

    // Club Created
    clubCreatedContainer: {
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 8,
    },
    clubTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    clubTitleTextWrap: {
        flex: 1,
    },
    clubCard: {
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
    },
    clubHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    clubIconCircleLarge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clubHeaderTextMain: {
        flex: 1,
    },
    clubName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        paddingHorizontal: 4,
    },
    clubCategory: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    clubStatsRowTiny: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 12,
    },
    clubStatTiny: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    clubStatTextTiny: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    clubActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 999,
        gap: 8,
    },
    clubActionBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
});

export const DeadlineBanner = React.memo<DeadlineBannerProps>(({ deadlineInfo }) => {
    const { t } = useTranslation();
    const { colors, isDark } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={[styles.deadlineBanner, deadlineInfo.isUrgent && styles.deadlineBannerUrgent]}>
            <Ionicons
                name={deadlineInfo.isUrgent ? 'warning' : 'time-outline'}
                size={16}
                color={deadlineInfo.isUrgent ? '#EF4444' : '#0EA5E9'}
            />
            <Text style={[styles.deadlineText, deadlineInfo.isUrgent && styles.deadlineTextUrgent]}>
                {deadlineInfo.isUrgent ? t('feed.sections.dueSoon') : t('feed.sections.due')}{deadlineInfo.text}
            </Text>
        </View>
    );
});

// ═══════════════════════════════════════════
// Club Announcement Banner
// ═══════════════════════════════════════════

interface ClubAnnouncementProps {
    typeConfig: { bgColor: string; color: string };
    onPress?: () => void;
}

export const ClubAnnouncement = React.memo<ClubAnnouncementProps>(({ typeConfig, onPress }) => {
    const { t } = useTranslation();
    const { colors, isDark } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
        <LinearGradient
            colors={[typeConfig.bgColor, isDark ? colors.card : '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.clubBanner}
        >
            <View style={styles.clubBannerContent}>
                <View style={[styles.clubIconCircle, { backgroundColor: typeConfig.color + '20' }]}>
                    <Ionicons name="people" size={24} color={typeConfig.color} />
                </View>
                <View style={styles.clubBannerText}>
                    <View style={styles.clubBannerHeader}>
                        <Ionicons name="sparkles" size={14} color={typeConfig.color} />
                        <Text style={[styles.clubBannerTitle, { color: typeConfig.color }]}>
                            {t('feed.sections.newStudyClub')}
                        </Text>
                    </View>
                    <Text style={styles.clubBannerSubtitle}>
                        {t('feed.sections.joinCommunity')}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.clubJoinButton, { backgroundColor: typeConfig.color }]}
                onPress={onPress}
            >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.clubJoinButtonText}>{t('feed.actions.viewClub')}</Text>
            </TouchableOpacity>
        </LinearGradient>
    );
});

// ═══════════════════════════════════════════
// Quiz Section — Clean flat design, no inner card
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
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const { colors, isDark } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const questionCount = quizData.questions?.length || 0;

    const handleTakeQuiz = React.useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('TakeQuiz', {
            quiz: {
                id: quizData.id,
                title: postTitle || t('feed.postTypes.quiz'),
                description: postContent,
                questions: quizData.questions,
                timeLimit: quizData.timeLimit,
                passingScore: quizData.passingScore,
                totalPoints: quizData.totalPoints,
            },
        });
    }, [quizData, postTitle, postContent, t, navigation]);

    const handleViewResults = React.useCallback(() => {
        if (!quizData.userAttempt) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('QuizResults', {
            quiz: {
                id: quizData.id,
                title: postTitle || t('feed.postTypes.quiz'),
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
    }, [quizData, postTitle, postContent, t, navigation]);

    return (
        <View style={styles.quizSection}>
            {/* Header with rocket icon */}
            <View style={styles.quizHeader}>
                <View style={[styles.quizIconCircle, { backgroundColor: quizGradient[0] + '18' }]}>
                    <Ionicons name="rocket" size={22} color={quizGradient[0]} />
                </View>
                <View style={styles.quizHeaderText}>
                    <Text style={styles.quizHeaderTitle}>{t('feed.sections.testKnowledge')}</Text>
                    <Text style={styles.quizHeaderSubtitle}>{t('feed.sections.completeQuiz')}</Text>
                </View>
            </View>

            {/* Three stat cards */}
            <View style={styles.quizStatsRow}>
                <View style={[styles.quizStatCard, { backgroundColor: quizGradient[0] + '0F' }]}>
                    <View style={[styles.quizStatIconBg, { backgroundColor: quizGradient[0] + '1A' }]}>
                        <Ionicons name="document-text-outline" size={18} color={quizGradient[0]} />
                    </View>
                    <Text style={[styles.quizStatValue, { color: quizGradient[0] }]}>{questionCount}</Text>
                    <Text style={styles.quizStatLabel}>{t('feed.sections.questions')}</Text>
                </View>

                <View style={[styles.quizStatCard, { backgroundColor: '#0EA5E9' + '0F' }]}>
                    <View style={[styles.quizStatIconBg, { backgroundColor: '#0EA5E9' + '1A' }]}>
                        <Ionicons name="time-outline" size={18} color="#0EA5E9" />
                    </View>
                    <Text style={[styles.quizStatValue, { color: '#0EA5E9' }]}>
                        {quizData.timeLimit ? t('feed.sections.minutesShort', { count: quizData.timeLimit }) : '∞'}
                    </Text>
                    <Text style={styles.quizStatLabel}>{t('feed.sections.time')}</Text>
                </View>

                <View style={[styles.quizStatCard, { backgroundColor: '#F59E0B' + '0F' }]}>
                    <View style={[styles.quizStatIconBg, { backgroundColor: '#F59E0B' + '1A' }]}>
                        <Ionicons name="star" size={18} color="#F59E0B" />
                    </View>
                    <Text style={[styles.quizStatValue, { color: '#F59E0B' }]}>{quizData.totalPoints || 100}</Text>
                    <Text style={styles.quizStatLabel}>{t('feed.sections.points')}</Text>
                </View>
            </View>

            {/* Attempted state */}
            {quizData.userAttempt ? (
                <View style={styles.quizAttemptedBlock}>
                    {/* Score bar */}
                    <View style={[
                        styles.quizScoreBar,
                        { backgroundColor: quizData.userAttempt.passed ? (isDark ? '#064e3b' : '#ECFDF5') : (isDark ? '#450a0a' : '#FEF2F2') },
                    ]}>
                        <Ionicons
                            name={quizData.userAttempt.passed ? 'checkmark-circle' : 'close-circle'}
                            size={20}
                            color={quizData.userAttempt.passed ? '#10B981' : '#EF4444'}
                        />
                        <Text style={[
                            styles.quizScoreText,
                            { color: quizData.userAttempt.passed ? '#10B981' : '#EF4444' },
                        ]}>
                            {t('feed.sections.scorePercent', { score: quizData.userAttempt.score })}
                        </Text>
                        <View style={[
                            styles.quizPassBadge,
                            { backgroundColor: quizData.userAttempt.passed ? (isDark ? '#065f46' : '#D1FAE5') : (isDark ? '#7f1d1d' : '#FEE2E2') },
                        ]}>
                            <Text style={[
                                styles.quizPassBadgeText,
                                { color: quizData.userAttempt.passed ? (isDark ? '#a7f3d0' : '#059669') : (isDark ? '#fecaca' : '#DC2626') },
                            ]}>
                                {quizData.userAttempt.passed ? t('feed.sections.passed') : t('feed.sections.notPassed')}
                            </Text>
                        </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.quizActionRow}>
                        <TouchableOpacity
                            onPress={handleViewResults}
                            style={[styles.quizRoundedBtn, { backgroundColor: '#6366F1' + '12' }]}
                        >
                            <Ionicons name="eye-outline" size={16} color="#6366F1" />
                            <Text style={[styles.quizRoundedBtnText, { color: '#6366F1' }]}>{t('feed.sections.viewResults')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleTakeQuiz}
                            style={[styles.quizRoundedBtn, { backgroundColor: quizGradient[0] + '12' }]}
                        >
                            <Ionicons name="refresh" size={16} color={quizGradient[0]} />
                            <Text style={[styles.quizRoundedBtnText, { color: quizGradient[0] }]}>{t('feed.sections.retake')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                /* CTA button */
                <TouchableOpacity onPress={handleTakeQuiz} activeOpacity={0.8}>
                    <LinearGradient
                        colors={quizGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.quizCta}
                    >
                        <Ionicons name="play-circle" size={20} color="#fff" />
                        <Text style={styles.quizCtaText}>{t('feed.sections.takeQuizNow')}</Text>
                        <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </View>
    );
});

// ═══════════════════════════════════════════
// Event Created Section
// ═══════════════════════════════════════════

interface EventCreatedSectionProps {
    eventData?: {
        id: string;
        title: string;
        startDate?: string;
        location?: string;
    };
    typeConfig: { color: string; bgColor: string };
    onPress?: () => void;
}

export const EventCreatedSection = React.memo<EventCreatedSectionProps>(({ eventData, typeConfig, onPress }) => {
    const { t } = useTranslation();
    const { colors, isDark } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const eventSurface = isDark
        ? [colors.surfaceVariant, `${typeConfig.color}18`] as [string, string]
        : [typeConfig.bgColor, '#FFFFFF'] as [string, string];

    return (
    <View style={styles.eventCreatedContainer}>
        {/* Title text only — clean, no icon */}
        <Text style={styles.eventTitle} numberOfLines={2}>
            {eventData?.title || t('feed.sections.upcomingEvent')}
        </Text>

        {/* Inner container: icon + meta info */}
        <LinearGradient
            colors={eventSurface}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.eventGradient}
        >
            <View style={styles.eventMetaRow}>
                <View style={[styles.eventIconBg, { backgroundColor: isDark ? typeConfig.color + '24' : typeConfig.color + '18' }]}>
                    <Ionicons name="calendar" size={20} color={typeConfig.color} />
                </View>
                <Ionicons name="time-outline" size={14} color={isDark ? colors.textSecondary : colors.textTertiary} />
                <Text style={styles.eventMetaText}>
                    {eventData?.startDate ? new Date(eventData.startDate).toLocaleDateString() : t('feed.sections.dateTbd')}
                </Text>
                <View style={styles.metaSeparator} />
                <Ionicons name="location-outline" size={14} color={isDark ? colors.textSecondary : colors.textTertiary} />
                <Text style={styles.eventMetaText} numberOfLines={1}>
                    {eventData?.location || t('feed.sections.defaultCampus')}
                </Text>
            </View>
            <TouchableOpacity
                style={[styles.eventActionButton, { backgroundColor: typeConfig.color }]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <Ionicons name="ticket-outline" size={18} color="#FFF" />
                <Text style={styles.eventActionButtonText}>{t('feed.actions.joinEvent')}</Text>
            </TouchableOpacity>
        </LinearGradient>
    </View>
    );
});

// ═══════════════════════════════════════════
// Club Created Section
// ═══════════════════════════════════════════

interface ClubCreatedSectionProps {
    clubData?: {
        id: string;
        name: string;
        category?: string;
        memberCount?: number;
    };
    typeConfig: { color: string; bgColor: string };
    onPress?: () => void;
}

export const ClubCreatedSection = React.memo<ClubCreatedSectionProps>(({ clubData, typeConfig, onPress }) => {
    const { t } = useTranslation();
    const { colors, isDark } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
    <View style={styles.clubCreatedContainer}>
        {/* Club name + category outside — clean title only */}
        {!!clubData?.name && (
            <Text style={styles.clubName} numberOfLines={1}>{clubData.name}</Text>
        )}
        {!!clubData?.category && (
            <Text style={styles.clubCategory}>{clubData.category}</Text>
        )}

        {/* Inner container: icon + stats + button */}
        <View style={[styles.clubCard, { borderColor: typeConfig.color + '30' }]}>
            <View style={styles.clubStatsRowTiny}>
                <View style={[styles.clubIconCircleLarge, { backgroundColor: typeConfig.color + '18' }]}>
                    <Ionicons name="people" size={20} color={typeConfig.color} />
                </View>
                <Ionicons name="person-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.clubStatTextTiny}>
                    {t('feed.sections.memberCount', { count: clubData?.memberCount || 0 })}
                </Text>
                <View style={styles.metaSeparator} />
                <Ionicons name="shield-checkmark-outline" size={13} color={colors.textTertiary} />
                <Text style={styles.clubStatTextTiny}>{t('feed.sections.verifiedClub')}</Text>
            </View>

            <TouchableOpacity
                style={[styles.clubActionBtn, { backgroundColor: typeConfig.color }]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <Text style={styles.clubActionBtnText}>{t('feed.actions.viewClub')}</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </TouchableOpacity>
        </View>
    </View>
    );
});
