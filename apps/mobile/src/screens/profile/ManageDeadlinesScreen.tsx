import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/navigation/types';
import { feedApi } from '@/api/client';
import { useAuthStore } from '@/stores';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ManageDeadlines'>;

interface Deadline {
    id: string;
    title: string;
    deadlineDate: string;
    relatedTopics: string[];
    priority: string;
}

export const ManageDeadlinesScreen = ({ navigation }: Props) => {
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore(state => state.user);

    // Form states
    const [title, setTitle] = useState('');
    const [dateStr, setDateStr] = useState('');
    const [topic, setTopic] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchDeadlines();
    }, [user]);

    const fetchDeadlines = async () => {
        if (!user) return;
        try {
            const response = await feedApi.get(`/users/${user.id}/deadlines`);
            if (response.data.success) {
                setDeadlines(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch deadlines:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDeadline = async () => {
        if (!title || !dateStr || !topic) {
            Alert.alert('Error', 'Please fill in all fields (Title, Date, Topic).');
            return;
        }

        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            Alert.alert('Error', 'Invalid date format. Use YYYY-MM-DD.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await feedApi.post('/users/me/deadlines', {
                title,
                deadlineDate: d.toISOString(),
                relatedTopics: topic.split(',').map(t => t.trim()).filter(Boolean),
                priority: 'HIGH'
            });

            if (response.data.success) {
                setDeadlines([...deadlines, response.data.data]);
                setTitle('');
                setDateStr('');
                setTopic('');
                Alert.alert('Success', 'Deadline added!');
            }
        } catch (error) {
            console.error('Failed to add deadline:', error);
            Alert.alert('Error', 'Failed to add deadline.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await feedApi.delete(`/users/me/deadlines/${id}`);
            if (response.data.success) {
                setDeadlines(deadlines.filter(dl => dl.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete deadline:', error);
            Alert.alert('Error', 'Failed to delete deadline.');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#F59E0B" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Deadlines</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* ADD DEADLINE FORM */}
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Add New Deadline</Text>

                    <Text style={styles.label}>Title</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. History Midterm Essay"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 2024-12-01"
                        value={dateStr}
                        onChangeText={setDateStr}
                    />

                    <Text style={styles.label}>Related Topics (comma separated)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. History, Writing"
                        value={topic}
                        onChangeText={setTopic}
                    />

                    <TouchableOpacity
                        style={[styles.addButton, isSubmitting && styles.addButtonDisabled]}
                        onPress={handleAddDeadline}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.addButtonText}>Add Deadline</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* LIST DEADLINES */}
                <Text style={styles.listTitle}>Upcoming Deadlines</Text>

                {deadlines.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                        <Text style={styles.emptyText}>No upcoming deadlines.</Text>
                    </View>
                ) : (
                    deadlines.map((dl) => (
                        <View key={dl.id} style={styles.deadlineItem}>
                            <View style={styles.deadlineInfo}>
                                <Text style={styles.deadlineTitle}>{dl.title}</Text>
                                <View style={styles.deadlineMetaRow}>
                                    <Ionicons name="time-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                                    <Text style={styles.deadlineDate}>
                                        {new Date(dl.deadlineDate).toLocaleDateString()}
                                    </Text>
                                </View>
                                {dl.relatedTopics && dl.relatedTopics.length > 0 && (
                                    <Text style={styles.topicsText}>
                                        Topics: {dl.relatedTopics.join(', ')}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => handleDelete(dl.id)} style={styles.deleteButton}>
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))
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
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1F2937',
        marginBottom: 16,
    },
    addButton: {
        backgroundColor: '#F59E0B',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    addButtonDisabled: {
        opacity: 0.7,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: '#9CA3AF',
        marginTop: 12,
        fontSize: 15,
    },
    deadlineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    deadlineInfo: {
        flex: 1,
    },
    deadlineTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
    },
    deadlineMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    deadlineDate: {
        fontSize: 14,
        color: '#6B7280',
    },
    topicsText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    deleteButton: {
        padding: 8,
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
        marginLeft: 12,
    }
});
