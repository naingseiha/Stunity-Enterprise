import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Animated} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Image } from 'expo-image';
import { formatDistanceToNow } from 'date-fns';
import { feedApi } from '@/api/client';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';

interface Props {
    visible: boolean;
    onClose: () => void;
    quizId: string;
    quizTitle: string;
}

export const QuizAnalyticsModal: React.FC<Props> = ({
    visible,
    onClose,
    quizId,
    quizTitle,
}) => {
    const { t } = useTranslation();
    const { colors, isDark } = useThemeContext();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);

    useEffect(() => {
        if (visible && quizId) {
            loadAnalytics();
        }
    }, [visible, quizId]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            // Fetch direct attempts data from feed-service quiz routes
            const response = await feedApi.get(`/quizzes/${quizId}/attempts`);
            if (response.data?.success) {
                setAnalytics(response.data.data);
            }
        } catch (e) {
            console.warn('Failed to load quiz analytics:', e);
        } finally {
            setLoading(false);
        }
    };

    const renderAttempt = ({ item, index }: { item: any, index: number }) => (
        <Animated.View
            style={styles.attemptCard}
        >
            <View style={styles.attemptHeader}>
                <Image
                    source={{ uri: item.user?.profilePictureUrl || 'https://via.placeholder.com/150' }}
                    style={styles.avatar}
                    contentFit="cover"
                />
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                        {item.user?.firstName} {item.user?.lastName}
                    </Text>
                    <Text style={styles.attemptDate}>
                        {formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })}
                    </Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.passed ? `${colors.success}26` : `${colors.error}26` }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.passed ? colors.success : colors.error }
                    ]}>
                        {item.passed ? t('quiz.results.passed') : t('quiz.results.failed')}
                    </Text>
                </View>
            </View>
            <View style={styles.attemptStats}>
                <View style={styles.statBox}>
                    <Text style={styles.statBoxLabel}>{t('quiz.analytics.score')}</Text>
                    <Text style={styles.statBoxValue}>{item.score}%</Text>
                </View>
                <View style={styles.statBoxDivider} />
                <View style={styles.statBox}>
                    <Text style={styles.statBoxLabel}>{t('quiz.analytics.points')}</Text>
                    <Text style={styles.statBoxValue}>+{item.pointsEarned}</Text>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.handle} />
                        <View style={styles.headerRow}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>{t('quiz.analytics.title')}</Text>
                                <Text style={styles.subtitle} numberOfLines={1}>{quizTitle}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator color="#8B5CF6" size="large" />
                            <Text style={styles.loadingText}>{t('quiz.analytics.analyzing')}</Text>
                        </View>
                    ) : !analytics || analytics.length === 0 ? (
                        <View style={styles.centerBox}>
                            <Ionicons name="bar-chart-outline" size={64} color={colors.border} />
                            <Text style={styles.emptyTitle}>{t('quiz.analytics.noAttemptsYet')}</Text>
                            <Text style={styles.emptyDesc}>
                                {t('quiz.analytics.noAttemptsDesc')}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={analytics}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContent}
                            renderItem={renderAttempt}
                            ListHeaderComponent={() => {
                                const totalAttempts = analytics.length;
                                const passedAttempts = analytics.filter((a: any) => a.passed).length;
                                const passRate = Math.round((passedAttempts / totalAttempts) * 100);
                                const avgScore = Math.round(
                                    analytics.reduce((acc: number, curr: any) => acc + curr.score, 0) / totalAttempts
                                );

                                return (
                                    <View style={styles.summaryGrid}>
                                        <LinearGradient
                                            colors={isDark ? ['rgba(79,70,229,0.20)', 'rgba(99,102,241,0.10)'] : ['#EEF2FF', '#E0E7FF']}
                                            style={styles.summaryCard}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Ionicons name="people" size={24} color={isDark ? '#818CF8' : '#4F46E5'} />
                                            <Text style={styles.summaryValue}>{totalAttempts}</Text>
                                            <Text style={styles.summaryLabel}>{t('quiz.analytics.totalAttempts')}</Text>
                                        </LinearGradient>

                                        <LinearGradient
                                            colors={isDark ? ['rgba(5,150,105,0.20)', 'rgba(16,185,129,0.10)'] : ['#ECFDF5', '#D1FAE5']}
                                            style={styles.summaryCard}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Ionicons name="trending-up" size={24} color={colors.success} />
                                            <Text style={styles.summaryValue}>{passRate}%</Text>
                                            <Text style={styles.summaryLabel}>{t('quiz.analytics.passRate')}</Text>
                                        </LinearGradient>

                                        <LinearGradient
                                            colors={isDark ? ['rgba(217,119,6,0.20)', 'rgba(245,158,11,0.10)'] : ['#FFFBEB', '#FEF3C7']}
                                            style={styles.summaryCard}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Ionicons name="star" size={24} color={colors.warning} />
                                            <Text style={styles.summaryValue}>{avgScore}%</Text>
                                            <Text style={styles.summaryLabel}>{t('quiz.analytics.avgScore')}</Text>
                                        </LinearGradient>
                                    </View>
                                );
                            }}
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
    },
    header: {
        padding: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    handle: {
        width: 48,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    titleContainer: {
        flex: 1,
        paddingRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    listContent: {
        padding: 24,
        paddingBottom: 40,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    summaryCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginTop: 12,
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    attemptCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: isDark ? 'transparent' : '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    attemptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surfaceVariant,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 22,
        color: colors.text,
        marginBottom: 4,
    },
    attemptDate: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    attemptStats: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        padding: 16,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statBoxDivider: {
        width: 1,
        backgroundColor: colors.border,
        marginHorizontal: 16,
    },
    statBoxLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
    },
    statBoxValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
});
