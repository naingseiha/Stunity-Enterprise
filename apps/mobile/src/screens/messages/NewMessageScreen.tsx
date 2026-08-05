/**
 * New Message Screen — school messaging compose
 *
 * Loads teacher↔parent directory from messaging API, supports search,
 * and creates/reuses a conversation before opening Chat.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/common';
import { useMessagingStore, useAuthStore } from '@/stores';
import { Shadows } from '@/config';
import { MessagesStackScreenProps } from '@/navigation/types';
import {
  MessagingDirectoryPerson,
} from '@/stores/messagingStore';
import { useThemeContext } from '@/contexts';

type NavigationProp = MessagesStackScreenProps<'NewMessage'>['navigation'];
type RouteProp = MessagesStackScreenProps<'NewMessage'>['route'];

const STAFF_ROLES = new Set(['TEACHER', 'ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN']);

export default function NewMessageScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { user } = useAuthStore();
  const fetchMessagingDirectory = useMessagingStore((s) => s.fetchMessagingDirectory);
  const startSchoolConversation = useMessagingStore((s) => s.startSchoolConversation);

  const [search, setSearch] = useState(route.params?.prefillSearch || '');
  const [directory, setDirectory] = useState<MessagingDirectoryPerson[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  const isParent = user?.role === 'PARENT';
  const canCompose = isParent || STAFF_ROLES.has(user?.role || '');

  const loadDirectory = useCallback(async (query?: string) => {
    if (!canCompose) {
      setDirectory([]);
      setLoadingDirectory(false);
      return;
    }
    setLoadingDirectory(true);
    try {
      const rows = await fetchMessagingDirectory(query);
      setDirectory(rows);
    } finally {
      setLoadingDirectory(false);
    }
  }, [canCompose, fetchMessagingDirectory]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadDirectory(search.trim() || undefined);
    }, search.trim() ? 280 : 0);
    return () => clearTimeout(handle);
  }, [search, loadDirectory]);

  const handlePersonPress = useCallback(async (person: MessagingDirectoryPerson) => {
    if (startingId) return;
    setStartingId(person.id);
    try {
      const conversation = isParent
        ? await startSchoolConversation({ targetTeacherId: person.id })
        : await startSchoolConversation({
            targetParentId: person.id,
            studentId: person.children?.[0]?.id,
          });

      if (!conversation?.id) {
        Alert.alert(
          t('common.error', 'Error'),
          t(
            'messages.startConversationFailed',
            'Could not start this conversation. Make sure you share a school class link.',
          ),
        );
        return;
      }

      (navigation as any).replace('Chat', {
        conversationId: conversation.id,
        userId: person.id,
      });
    } catch (error) {
      if (__DEV__) console.error('Failed to open conversation:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('messages.startConversationFailed', 'Could not start this conversation.'),
      );
    } finally {
      setStartingId(null);
    }
  }, [isParent, navigation, startSchoolConversation, startingId, t]);

  const keyExtractor = useCallback((item: MessagingDirectoryPerson) => item.id, []);

  const renderPerson = useCallback(({ item }: { item: MessagingDirectoryPerson }) => {
    const displayName =
      item.name ||
      `${item.firstName || ''} ${item.lastName || ''}`.trim() ||
      t('messages.unknownContact', 'Contact');
    const subtitle = isParent
      ? item.position || item.homeroomClass?.name || t('profile.roles.teacher', 'Teacher')
      : item.children?.length
        ? item.children
            .slice(0, 2)
            .map((child) => `${child.firstName} ${child.lastName}`.trim())
            .join(', ')
        : item.phone || t('profile.roles.parent', 'Parent');

    return (
      <TouchableOpacity
        style={styles.contactRow}
        onPress={() => handlePersonPress(item)}
        activeOpacity={0.6}
        disabled={!!startingId}
      >
        <View style={styles.contactAvatar}>
          <Avatar uri={item.photoUrl} name={displayName} size="md" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{displayName}</Text>
          <Text style={styles.contactStatus} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {startingId === item.id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
        )}
      </TouchableOpacity>
    );
  }, [colors.primary, colors.textTertiary, handlePersonPress, isParent, startingId, styles, t]);

  const renderEmpty = useCallback(() => {
    if (loadingDirectory) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }

    if (!canCompose) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="lock-closed-outline" size={36} color={colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>
            {t('messages.schoolMessagingOnlyTitle', 'School messaging')}
          </Text>
          <Text style={styles.emptyText}>
            {t(
              'messages.schoolMessagingOnlyBody',
              'Messaging is available for teachers/admins and parents who share a class link.',
            )}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="people-outline" size={36} color={colors.textTertiary} />
        </View>
        <Text style={styles.emptyTitle}>
          {search
            ? t('messages.noResults', 'No results found')
            : t('messages.noDirectoryContacts', 'No contacts available')}
        </Text>
        <Text style={styles.emptyText}>
          {search
            ? t('messages.noResultsForQuery', 'No contacts matching "{{query}}"', {
                query: search,
              })
            : isParent
              ? t(
                  'messages.parentDirectoryEmpty',
                  'Teachers linked to your children will appear here.',
                )
              : t(
                  'messages.staffDirectoryEmpty',
                  'Parents linked to your classes will appear here.',
                )}
        </Text>
      </View>
    );
  }, [
    canCompose,
    colors.primary,
    colors.textTertiary,
    isParent,
    loadingDirectory,
    search,
    styles,
    t,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('messages.newMessage', 'New Message')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                isParent
                  ? t('messages.searchTeachers', 'Search teachers')
                  : t('messages.searchParents', 'Search parents')
              }
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoFocus
              editable={canCompose}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.sectionLabel}>
        <Text style={styles.sectionLabelText}>
          {isParent
            ? t('messages.teachersSection', 'Teachers')
            : t('messages.parentsSection', 'Parents')}
        </Text>
        <Text style={styles.sectionCount}>{directory.length}</Text>
      </View>

      <FlatList
        data={canCompose ? directory : []}
        renderItem={renderPerson}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerSafe: { backgroundColor: colors.card },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: isDark ? colors.surfaceVariant : '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.sm,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    searchWrap: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
      paddingHorizontal: 14,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      height: '100%',
    },
    sectionLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    sectionLabelText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    sectionCount: {
      fontSize: 12,
      color: colors.textTertiary,
      fontWeight: '500',
    },
    listContent: {
      flexGrow: 1,
      paddingTop: 4,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    contactAvatar: {
      marginRight: 14,
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    contactStatus: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: 40,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
