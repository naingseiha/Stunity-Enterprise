import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common';
import { useThemeContext } from '@/contexts';
import {
  fetchBlockedUsers,
  unblockUser,
  type BlockedUserItem,
} from '@/api/profileApi';

export default function BlockedUsersScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useThemeContext();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const users = await fetchBlockedUsers();
      setBlockedUsers(users);
    } catch (error) {
      Alert.alert(t('common.error'), 'Unable to load blocked users right now.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  const confirmUnblock = useCallback((item: BlockedUserItem) => {
    const name = `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || item.user.username || 'this user';

    Alert.alert(
      'Unblock user',
      `Allow ${name} to interact with you again?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            setUnblockingId(item.blockedUserId);
            try {
              await unblockUser(item.blockedUserId);
              setBlockedUsers(current => current.filter(block => block.blockedUserId !== item.blockedUserId));
            } catch (error) {
              Alert.alert(t('common.error'), 'Unable to unblock this user right now.');
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ]
    );
  }, [t]);

  const renderItem = useCallback(({ item }: { item: BlockedUserItem }) => {
    const name = `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || item.user.username || 'Unknown user';
    const isUnblocking = unblockingId === item.blockedUserId;

    return (
      <View style={styles.userRow}>
        <Avatar
          uri={item.user.profilePictureUrl}
          name={name}
          size="md"
          showBorder={false}
          gradientBorder="none"
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{name}</Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            {item.user.headline || item.user.role?.replace('_', ' ') || item.user.username}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.unblockButton}
          onPress={() => confirmUnblock(item)}
          disabled={isUnblocking}
          activeOpacity={0.75}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.unblockText}>Unblock</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [colors.primary, confirmUnblock, styles, unblockingId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.blockedUsers', 'Blocked Users')}</Text>
        <View style={styles.headerButton} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={blockedUsers.length ? styles.listContent : styles.emptyContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadBlockedUsers(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No blocked users</Text>
              <Text style={styles.emptyText}>People you block will appear here, and you can unblock them anytime.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  userMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  unblockButton: {
    minWidth: 82,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? `${colors.primary}1F` : '#E0F2FE',
  },
  unblockText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContent: {
    flexGrow: 1,
    padding: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? `${colors.primary}1F` : '#E0F2FE',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    marginTop: 8,
    maxWidth: 280,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
