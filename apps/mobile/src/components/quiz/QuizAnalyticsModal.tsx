import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, SlideInDown, Layout } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { formatDistanceToNow } from 'date-fns';
import { feedApi } from '@/api/client';

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
            entering={FadeInUp.delay(index * 100).springify()}
            layout={Layout.springify()}
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
                    { backgroundColor: item.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.passed ? '#10B981' : '#EF4444' }
                    ]}>
                        {item.passed ? 'Passed' : 'Failed'}
                    </Text>
                </View>
            </View>
            <View style={styles.attemptStats}>
                <View style={styles.statBox}>
                    <Text style={styles.statBoxLabel}>Score</Text>
                    <Text style={styles.statBoxValue}>{item.score}%</Text>
                </View>
                <View style={styles.statBoxDivider} />
                <View style={styles.statBox}>
                    <Text style={styles.statBoxLabel}>Points</Text>
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
                <Animated.View entering={SlideInDown.springify()} style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.handle} />
                        <View style={styles.headerRow}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>Quiz Analytics</Text>
                                <Text style={styles.subtitle} numberOfLines={1}>{quizTitle}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator color="#8B5CF6" size="large" />
                            <Text style={styles.loadingText}>Analyzing results...</Text>
                        </View>
                    ) : !analytics || analytics.length === 0 ? (
                        <View style={styles.centerBox}>
                            <Ionicons name="bar-chart-outline" size={64} color="#E2E8F0" />
                            <Text style={styles.emptyTitle}>No Attempts Yet</Text>
                            <Text style={styles.emptyDesc}>
                                Students haven't taken this quiz yet. Check back later!
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
                                            colors={['#EEF2FF', '#E0E7FF']}
                                            style={styles.summaryCard}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Ionicons name="people" size={24} color="#4F46E5" />
                                            <Text style={styles.summaryValue}>{totalAttempts}</Text>
                                            <Text style={styles.summaryLabel}>Total Attempts</Text>
                                        </LinearGradient>

                                        <LinearGradient
                                            colors={['#ECFDF5', '#D1FAE5']}
                                            style={styles.summaryCard}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Ionicons name="trending-up" size={24} color="#059669" />
                                            <Text style={styles.summaryValue}>{passRate}%</Text>
                                            <Text style={styles.summaryLabel}>Pass Rate</Text>
                                        </LinearGradient>

                                        <LinearGradient
                                            colors={['#FFFBEB', '#FEF3C7']}
                                            style={styles.summaryCard}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Ionicons name="star" size={24} color="#D97706" />
                                            <Text style={styles.summaryValue}>{avgScore}%</Text>
                                            <Text style={styles.summaryLabel}>Avg Score</Text>
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

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    header: {
        padding: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    handle: {
        width: 48,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E2E8F0',
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
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
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
        color: '#64748B',
        fontWeight: '500',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 15,
        color: '#64748B',
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
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 12,
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    attemptCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#0F172A',
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
        backgroundColor: '#F1F5F9',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    attemptDate: {
        fontSize: 13,
        color: '#94A3B8',
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
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statBoxDivider: {
        width: 1,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 16,
    },
    statBoxLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 4,
    },
    statBoxValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
});
