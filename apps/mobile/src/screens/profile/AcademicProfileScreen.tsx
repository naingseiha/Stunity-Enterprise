import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/navigation/types';
import { feedApi } from '@/api/client';
import { useAuthStore } from '@/stores';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AcademicProfile'>;

interface AcademicProfile {
    currentLevel: number;
    weakTopics: string[];
    strongTopics: string[];
    lastUpdated: string;
}

export const AcademicProfileScreen = ({ navigation }: Props) => {
    const [profile, setProfile] = useState<AcademicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            try {
                const response = await feedApi.get(`/users/${user.id}/academic-profile`);
                if (response.data.success) {
                    setProfile(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch academic profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Academic Proficiency</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.levelCard}>
                    <Text style={styles.levelTitle}>Current Academic Level</Text>
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelValue}>{profile?.currentLevel != null ? Number(profile.currentLevel).toFixed(1) : 'O.O'}</Text>
                    </View>
                    <Text style={styles.levelDesc}>Based on your quiz and assignment performance</Text>
                </View>

                <View style={styles.topicsSection}>
                    <View style={styles.topicHeader}>
                        <Ionicons name="trending-up" size={20} color="#10B981" />
                        <Text style={styles.topicTitle}>Strong Topics</Text>
                    </View>
                    <View style={styles.tagsContainer}>
                        {profile?.strongTopics && profile.strongTopics.length > 0 ? (
                            profile.strongTopics.map((topic, i) => (
                                <View key={`strong-${i}`} style={[styles.tag, styles.strongTag]}>
                                    <Text style={styles.strongTagText}>{topic}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No data yet. Keep completing quizzes!</Text>
                        )}
                    </View>
                </View>

                <View style={styles.topicsSection}>
                    <View style={styles.topicHeader}>
                        <Ionicons name="trending-down" size={20} color="#EF4444" />
                        <Text style={styles.topicTitle}>Needs Improvement</Text>
                    </View>
                    <View style={styles.tagsContainer}>
                        {profile?.weakTopics && profile.weakTopics.length > 0 ? (
                            profile.weakTopics.map((topic, i) => (
                                <View key={`weak-${i}`} style={[styles.tag, styles.weakTag]}>
                                    <Text style={styles.weakTagText}>{topic}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No weak topics detected. Great job!</Text>
                        )}
                    </View>
                </View>

                {profile?.lastUpdated && (
                    <Text style={styles.lastUpdatedText}>
                        Last updated: {new Date(profile.lastUpdated).toLocaleDateString()}
                    </Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    content: {
        padding: 16,
    },
    levelCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    levelTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 16,
    },
    levelBadge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3E8FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 4,
        borderColor: '#C4B5FD',
    },
    levelValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#7C3AED',
    },
    levelDesc: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    topicsSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    topicHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    topicTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    strongTag: {
        backgroundColor: '#D1FAE5',
    },
    strongTagText: {
        color: '#047857',
        fontWeight: '600',
        fontSize: 14,
    },
    weakTag: {
        backgroundColor: '#FEE2E2',
    },
    weakTagText: {
        color: '#B91C1C',
        fontWeight: '600',
        fontSize: 14,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    lastUpdatedText: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 16,
    }
});
