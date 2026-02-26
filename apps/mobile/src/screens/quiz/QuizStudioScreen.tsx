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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { quizService, QuizItem } from '@/services/quiz';
import { liveQuizService } from '@/services/liveQuiz';
import { useFeedStore } from '@/stores';
import { Alert } from 'react-native';

const BACKGROUND_COLOR = '#0F172A';

export function QuizStudioScreen() {
    const navigation = useNavigation<any>();
    const { deletePost } = useFeedStore();
    const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT'>('ALL'); // Currently backend returns all mapped as published; we can refine this later.

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
            'Delete Quiz',
            `Are you sure you want to delete "${item.title}"? This will also remove the associated post and cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Deleting the associated feed post deletes the quiz in the backend
                            await deletePost(item.postId!);
                            // Remove from local list to reflect instantly without reloading
                            setQuizzes(prev => prev.filter(q => q.id !== item.id));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete quiz.');
                        }
                    }
                }
            ]
        );
    };

    const renderQuizItem = ({ item, index }: { item: QuizItem; index: number }) => {
        return (
            <Animated.View entering={FadeInDown.delay(index * 100).duration(400)} style={styles.cardContainer}>
                <LinearGradient
                    colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                    style={styles.card}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.titleWrap}>
                            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                            <View style={styles.statusBadge}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusText}>Published</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.moreBtn}>
                            <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.description} numberOfLines={2}>
                        {item.description || 'No description provided.'}
                    </Text>

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Ionicons name="help-circle-outline" size={14} color="#94A3B8" />
                            <Text style={styles.statText}>{item.questions.length} Questions</Text>
                        </View>
                        <View style={styles.stat}>
                            <Ionicons name="people-outline" size={14} color="#94A3B8" />
                            <Text style={styles.statText}>{item.attemptCount || 0} Attempts</Text>
                        </View>
                        <View style={styles.stat}>
                            <Ionicons name="star-outline" size={14} color="#94A3B8" />
                            <Text style={styles.statText}>{item.totalPoints} pts</Text>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
                            <Ionicons name="pencil" size={16} color="#FFF" />
                            <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.editBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} onPress={() => handleDelete(item)}>
                            <Ionicons name="trash" size={16} color="#EF4444" />
                            <Text style={[styles.editBtnText, { color: '#EF4444' }]}>Delete</Text>
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
                                <Text style={styles.liveBtnText}>Host Live</Text>
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
                <Text style={styles.headerTitle}>Quiz Studio</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'ALL' && styles.activeTab]}
                    onPress={() => setActiveTab('ALL')}
                >
                    <Text style={[styles.tabText, activeTab === 'ALL' && styles.activeTabText]}>All Quizzes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'DRAFT' && styles.activeTab]}
                    onPress={() => setActiveTab('DRAFT')}
                >
                    <Text style={[styles.tabText, activeTab === 'DRAFT' && styles.activeTabText]}>Drafts</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <View style={styles.listContainer}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#7C3AED" />
                    </View>
                ) : quizzes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="folder-open-outline" size={64} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.emptyTitle}>No Quizzes Yet</Text>
                        <Text style={styles.emptyDesc}>Create a quiz in a post to see it appear here in your studio.</Text>

                        <TouchableOpacity
                            style={styles.emptyCreateBtn}
                            onPress={() => navigation.navigate('CreatePost', { initialPostType: 'QUIZ' })}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add-circle" size={20} color="#FFF" />
                            <Text style={styles.emptyCreateBtnText}>Create Quiz</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={quizzes}
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
        color: '#A78BFA',
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
