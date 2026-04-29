import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    StatusBar
, Animated} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { quizService, QuizItem } from '@/services/quiz';
import { liveQuizService } from '@/services/liveQuiz';
import { useFeedStore } from '@/stores';
import { Alert } from 'react-native';
import { QuizAnalyticsModal } from '@/components/quiz/QuizAnalyticsModal';
import { useTranslation } from 'react-i18next';

const BACKGROUND_COLOR = '#0F172A';
const ALL_TOPICS_KEY = '__ALL_TOPICS__';

export function QuizStudioScreen() {
    const { t, i18n } = useTranslation();
    const isKhmer = i18n.language?.startsWith('km');
    const navigation = useNavigation<any>();
    const { deletePost } = useFeedStore();
    const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT'>('ALL'); // Currently backend returns all mapped as published; we can refine this later.
    const [activeTag, setActiveTag] = useState<string | null>(null);

    // Analytics Modal State
    const [selectedAnalyticsQuiz, setSelectedAnalyticsQuiz] = useState<{ id: string, title: string } | null>(null);

    const loadQuizzes = async () => {
        try {
            const data = await quizService.getMyCreatedQuizzes();
            setQuizzes(data);
        } catch (e) {
            console.warn('Failed to load created quizzes:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuizzes();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadQuizzes();
        setRefreshing(false);
    };

    const handleStartLive = async (quizId: string) => {
        try {
            // Create session
            const session = await liveQuizService.createSession(quizId);
            navigation.navigate('LiveQuizLobby', {
                sessionCode: session.sessionCode,
                participantId: '', // Host doesn't need this
                isHost: true
            });
        } catch (e) {
            console.error('Failed to start live session:', e);
            // Alert could be added here
        }
    };

    const handleEdit = (item: QuizItem) => {
        // Construct a partial Post object that EditPostScreen expects for a quiz
        const mockPost = {
            id: item.postId,
            postId: item.postId,
            title: item.title,
            content: item.description || '',
            postType: 'QUIZ',
            visibility: 'PUBLIC',
            quizData: {
                id: item.id,
                questions: item.questions,
                timeLimit: item.timeLimit,
                passingScore: item.passingScore,
                totalPoints: item.totalPoints,
            }
        };
        navigation.navigate('EditPost', { post: mockPost });
    };

    const handleDelete = (item: QuizItem) => {
        Alert.alert(
            t('quiz.studio.deleteTitle'),
            t('quiz.studio.deleteMessage', { title: item.title }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Deleting the associated feed post deletes the quiz in the backend
                            await deletePost(item.postId!);
                            // Remove from local list to reflect instantly without reloading
                            setQuizzes(prev => prev.filter(q => q.id !== item.id));
                        } catch (error) {
                            Alert.alert(t('common.error'), t('quiz.studio.deleteFailed'));
                        }
                    }
                }
            ]
        );
    };

    const renderQuizItem = ({ item, index }: { item: QuizItem; index: number }) => {
        return (
            <Animated.View style={styles.cardContainer}>
                <LinearGradient
                    colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                    style={styles.card}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.titleWrap}>
                            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                            <View style={styles.statusBadge}>
                                <View style={styles.statusDot} />
                                <Text style={[styles.statusText, isKhmer && styles.khmerInlineText]}>{t('quiz.studio.published')}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.moreBtn}>
                            <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.description} numberOfLines={2}>
                        {item.description || t('quiz.studio.noDescription')}
                    </Text>

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Ionicons name="help-circle-outline" size={14} color="#94A3B8" />
                            <Text style={[styles.statText, isKhmer && styles.khmerInlineText]}>{t('quiz.dashboard.questionsShort', { count: item.questions.length })}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Ionicons name="people-outline" size={14} color="#94A3B8" />
                            <Text style={[styles.statText, isKhmer && styles.khmerInlineText]}>{t('quiz.studio.attemptCount', { count: item.attemptCount || 0 })}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Ionicons name="star-outline" size={14} color="#94A3B8" />
                            <Text style={[styles.statText, isKhmer && styles.khmerInlineText]}>{t('feed.createPost.quizQuestion.pts', { count: item.totalPoints })}</Text>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
                            <Ionicons name="pencil" size={16} color="#FFF" />
                            <Text style={[styles.editBtnText, isKhmer && styles.khmerInlineText]}>{t('common.edit')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.editBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} onPress={() => handleDelete(item)}>
                            <Ionicons name="trash" size={16} color="#EF4444" />
                            <Text style={[styles.editBtnText, isKhmer && styles.khmerInlineText, { color: '#EF4444' }]}>{t('common.delete')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.editBtn, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]} onPress={() => setSelectedAnalyticsQuiz({ id: item.id, title: item.title })}>
                            <Ionicons name="bar-chart-outline" size={16} color="#60A5FA" />
                            <Text style={[styles.editBtnText, isKhmer && styles.khmerInlineText, { color: '#60A5FA' }]}>{t('quiz.studio.stats')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.liveBtn}
                            onPress={() => handleStartLive(item.id)}
                        >
                            <LinearGradient
                                colors={['#7C3AED', '#EC4899']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={styles.liveBtnGradient}
                            >
                                <Ionicons name="radio-outline" size={16} color="#FFF" />
                                <Text style={[styles.liveBtnText, isKhmer && styles.khmerInlineText]}>{t('quiz.studio.hostLive')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isKhmer && styles.khmerInlineText]}>{t('quiz.studio.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'ALL' && styles.activeTab]}
                    onPress={() => setActiveTab('ALL')}
                >
                    <Text style={[styles.tabText, isKhmer && styles.khmerInlineText, activeTab === 'ALL' && styles.activeTabText]}>{t('quiz.studio.allQuizzes')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'DRAFT' && styles.activeTab]}
                    onPress={() => setActiveTab('DRAFT')}
                >
                    <Text style={[styles.tabText, isKhmer && styles.khmerInlineText, activeTab === 'DRAFT' && styles.activeTabText]}>{t('quiz.studio.drafts')}</Text>
                </TouchableOpacity>
            </View>

            {/* Tags Strip */}
            {!loading && quizzes.length > 0 && (
                <View style={styles.tagsContainer}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={[ALL_TOPICS_KEY, ...Array.from(new Set(quizzes.flatMap(q => q.topicTags || []))).filter(Boolean)]}
                        keyExtractor={item => item}
                        contentContainerStyle={styles.tagsContent}
                        renderItem={({ item }) => {
                            const isSelected = item === ALL_TOPICS_KEY ? activeTag === null : activeTag === item;
                            return (
                                <TouchableOpacity
                                    style={[styles.tagPill, isSelected && styles.tagPillSelected]}
                                    onPress={() => setActiveTag(item === ALL_TOPICS_KEY ? null : item)}
                                >
                                    <View style={styles.tagContent}>
                                        <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                                            {item === ALL_TOPICS_KEY ? t('quiz.studio.allTopics') : `#${item}`}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            )}

            {/* List */}
            <View style={styles.listContainer}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#7C3AED" />
                    </View>
                ) : quizzes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="folder-open-outline" size={64} color="rgba(255,255,255,0.2)" />
                        <Text style={[styles.emptyTitle, isKhmer && styles.khmerInlineText]}>{t('quiz.studio.emptyTitle')}</Text>
                        <Text style={[styles.emptyDesc, isKhmer && styles.khmerInlineText]}>{t('quiz.studio.emptyDesc')}</Text>

                        <TouchableOpacity
                            style={styles.emptyCreateBtn}
                            onPress={() => navigation.navigate('CreatePost', { initialPostType: 'QUIZ' })}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add-circle" size={20} color="#FFF" />
                            <Text style={[styles.emptyCreateBtnText, isKhmer && styles.khmerInlineText]}>{t('quiz.dashboard.createQuiz')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={quizzes.filter(q => !activeTag || (q.topicTags || []).includes(activeTag))}
                        keyExtractor={item => item.id}
                        renderItem={renderQuizItem}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
                    />
                )}
            </View>

            {/* Create Quiz FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CreatePost', { initialPostType: 'QUIZ' })}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={32} color="#FFF" />
            </TouchableOpacity>

            {/* Analytics Modal */}
            <QuizAnalyticsModal
                visible={!!selectedAnalyticsQuiz}
                onClose={() => setSelectedAnalyticsQuiz(null)}
                quizId={selectedAnalyticsQuiz?.id || ''}
                quizTitle={selectedAnalyticsQuiz?.title || ''}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    activeTab: {
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.5)',
    },
    tabText: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
        fontSize: 14,
    },
    activeTabText: {
        color: '#FFF',
    },
    khmerInlineText: {
        includeFontPadding: false,
        textAlignVertical: 'center',
        lineHeight: 20,
    },
    tagsContainer: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 12,
    },
    tagsContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    tagPill: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    tagPillSelected: {
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
        borderColor: '#7C3AED',
    },
    tagContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600',
    },
    tagTextSelected: {
        color: '#FFF',
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    cardContainer: {
        marginBottom: 16,
    },
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    titleWrap: {
        flex: 1,
        gap: 6,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F8FAFC',
        marginRight: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    statusText: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '600',
    },
    moreBtn: {
        padding: 4,
    },
    description: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '500',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    editBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    editBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    liveBtn: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    liveBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    liveBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        marginTop: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyCreateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7C3AED',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        marginTop: 24,
        gap: 8,
    },
    emptyCreateBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#EC4899',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
});
