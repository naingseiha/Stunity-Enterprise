import { useTranslation } from 'react-i18next';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/navigation/types';
import { feedApi } from '@/api/client';
import { useAuthStore } from '@/stores';
import { useThemeContext } from '@/contexts';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ManageDeadlines'>;

interface Deadline {
    id: string;
    title: string;
    deadlineDate: string;
    relatedTopics: string[];
    priority: string;
}

export const ManageDeadlinesScreen = ({ navigation }: Props) => {
    const { t: autoT } = useTranslation();
    const { colors, isDark } = useThemeContext();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
            if (__DEV__) { console.error('Failed to fetch deadlines:', error); }
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
            if (__DEV__) { console.error('Failed to add deadline:', error); }
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
            if (__DEV__) { console.error('Failed to delete deadline:', error); }
            Alert.alert('Error', 'Failed to delete deadline.');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}><AutoI18nText i18nKey="auto.mobile.screens_profile_ManageDeadlinesScreen.k_72d0995f" /></Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* ADD DEADLINE FORM */}
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}><AutoI18nText i18nKey="auto.mobile.screens_profile_ManageDeadlinesScreen.k_f963bcbe" /></Text>

                    <Text style={styles.label}><AutoI18nText i18nKey="auto.mobile.screens_profile_ManageDeadlinesScreen.k_45d8e191" /></Text>
                    <TextInput
                        style={styles.input}
                        placeholder={autoT("auto.mobile.screens_profile_ManageDeadlinesScreen.k_9ae17242")}
                        placeholderTextColor={colors.textTertiary}
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text style={styles.label}><AutoI18nText i18nKey="auto.mobile.screens_profile_ManageDeadlinesScreen.k_bf53cf51" /></Text>
                    <TextInput
                        style={styles.input}
                        placeholder={autoT("auto.mobile.screens_profile_ManageDeadlinesScreen.k_ae61ec5f")}
                        placeholderTextColor={colors.textTertiary}
                        value={dateStr}
                        onChangeText={setDateStr}
                    />

                    <Text style={styles.label}><AutoI18nText i18nKey="auto.mobile.screens_profile_ManageDeadlinesScreen.k_d339207c" /></Text>
                    <TextInput
                        style={styles.input}
                        placeholder={autoT("auto.mobile.screens_profile_ManageDeadlinesScreen.k_d65c3ac2")}
                        placeholderTextColor={colors.textTertiary}
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
                            <Text style={styles.addButtonText}><AutoI18nText i18nKey="auto.mobile.screens_profile_ManageDeadlinesScreen.k_5c08b17e" /></Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* LIST DEADLINES */}
                <Text style={styles.listTitle}><AutoI18nText i18nKey="auto.mobile.screens_profile_ManageDeadlinesScreen.k_c462647e" /></Text>

                {deadlines.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
                        <Text style={styles.emptyText}><AutoI18nText i18nKey="auto.mobile.screens_profile_ManageDeadlinesScreen.k_cb2125ef" /></Text>
                    </View>
                ) : (
                    deadlines.map((dl) => (
                        <View key={dl.id} style={styles.deadlineItem}>
                            <View style={styles.deadlineInfo}>
                                <Text style={styles.deadlineTitle}>{dl.title}</Text>
                                <View style={styles.deadlineMetaRow}>
                                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                                    <Text style={styles.deadlineDate}>
                                        {new Date(dl.deadlineDate).toLocaleDateString()}
                                    </Text>
                                </View>
                                {dl.relatedTopics && dl.relatedTopics.length > 0 && (
                                    <Text style={styles.topicsText}>
                                        <AutoI18nText i18nKey="auto.mobile.screens_profile_ManageDeadlinesScreen.k_cc5f382e" /> {dl.relatedTopics.join(', ')}
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

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    content: {
        padding: 16,
    },
    formCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 6,
    },
    input: {
        backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: colors.text,
        marginBottom: 16,
    },
    addButton: {
        backgroundColor: colors.primary,
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
        color: colors.text,
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: colors.textTertiary,
        marginTop: 12,
        fontSize: 15,
    },
    deadlineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    deadlineInfo: {
        flex: 1,
    },
    deadlineTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 6,
    },
    deadlineMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    deadlineDate: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    topicsText: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    deleteButton: {
        padding: 8,
        backgroundColor: isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2',
        borderRadius: 8,
        marginLeft: 12,
    }
});
