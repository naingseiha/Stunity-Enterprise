/**
 * Conversations Screen — Clean Professional Design
 *
 * Flat conversation list, iOS-style header, inline search
 * Real-time updates via messagingStore + Supabase Realtime
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  TextInput,
  Image, Animated, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';


import { Avatar } from '@/components/common';
import { Colors } from '@/config';
import { formatRelativeTime } from '@/utils';
import { MessagesStackScreenProps } from '@/navigation/types';
import { useNavigationContext, useThemeContext } from '@/contexts';
import { useMessagingStore, useAuthStore } from '@/stores';
import { DMConversation } from '@/stores/messagingStore';

type NavigationProp = MessagesStackScreenProps<'Conversations'>['navigation'];

export default function ConversationsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NavigationProp>();
  const { openSidebar } = useNavigationContext();
  const { user } = useAuthStore();
  const {
    conversations,
    isLoadingConversations,
    fetchConversations,
    subscribeToConversations,
    unsubscribeAll,
  } = useMessagingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConversations();
    if (user?.id) {
      subscribeToConversations(user.id);
    }
    return () => unsubscribeAll();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const handleConversationPress = useCallback((conversation: DMConversation) => {
    const firstParticipant = conversation.participants[0];
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      userId: firstParticipant?.id || '',
    });
  }, [navigation]);

  const handleNewMessage = useCallback(() => {
    navigation.navigate('NewMessage' as any);
  }, [navigation]);

  const filteredConversations = useMemo(
    () => conversations.filter((conv) =>
      conv.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [conversations, searchQuery]
  );

  const onlineConversations = useMemo(
    () => conversations.filter((c) => c.participants.some(p => p.isOnline)),
    [conversations]
  );

  const keyExtractor = useCallback((item: DMConversation) => item.id, []);

  // ── Conversation Row ─────────────────────────────────────
  const renderConversation = useCallback(({ item }: { item: DMConversation; index: number }) => {
    const isUnread = item.unreadCount > 0;
    const firstParticipant = item.participants[0];
    const displayName = item.displayName;
    const displayAvatar = item.displayAvatar || firstParticipant?.profilePictureUrl;

    return (
      <Animated.View>
        <TouchableOpacity
          onPress={() => handleConversationPress(item)}
          style={styles.conversationRow}
          activeOpacity={0.6}
        >
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Avatar
              uri={displayAvatar}
              name={displayName}
              size="lg"
              showOnline={firstParticipant?.isOnline}
            />
            {!!isUnread && <View style={styles.unreadDot} />}
          </View>

          {/* Content */}
          <View style={styles.conversationContent}>
            <View style={styles.conversationTop}>
              <Text
                style={[styles.convName, isUnread && styles.convNameUnread]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {item.lastMessage && (
                <Text style={[styles.convTime, isUnread && styles.convTimeUnread]}>
                  {formatRelativeTime(item.lastMessage.createdAt)}
                </Text>
              )}
            </View>

            <View style={styles.conversationBottom}>
              <Text
                style={[styles.convMessage, isUnread && styles.convMessageUnread]}
                numberOfLines={1}
              >
                {item.lastMessage?.senderId === user?.id && (
                  <Text style={styles.youPrefix}>{t('messages.you')}</Text>
                )}
                {item.lastMessage?.content || t('messages.noMessages')}
              </Text>
              {isUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [handleConversationPress, t, user?.id]);

  const renderOnlineConversation = useCallback(({ item }: { item: DMConversation }) => {
    const participant = item.participants.find((p) => p.isOnline) || item.participants[0];
    return (
      <TouchableOpacity
        onPress={() => handleConversationPress(item)}
        style={styles.onlineItem}
        activeOpacity={0.7}
      >
        <View style={styles.onlineAvatarWrap}>
          <Avatar
            uri={participant?.profilePictureUrl}
            name={item.displayName}
            size="md"
          />
          <View style={styles.onlineIndicator} />
        </View>
        <Text style={styles.onlineName} numberOfLines={1}>
          {participant?.firstName || item.displayName.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  }, [handleConversationPress]);

  // ── Empty State ──────────────────────────────────────────
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="chatbubbles-outline" size={40} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>{t('messages.noConversations')}</Text>
      <Text style={styles.emptyText}>
        {t('messages.startConversation')}
      </Text>
      <TouchableOpacity onPress={handleNewMessage} activeOpacity={0.85}>
        <LinearGradient
          colors={['#0EA5E9', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyBtn}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.emptyBtnText}>{t('messages.newMessage')}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  ), [handleNewMessage, t]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* ── Header ─────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={openSidebar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t('messages.title')}</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={showSearch ? "close" : "search-outline"} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNewMessage}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        {showSearch && (
          <Animated.View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('messages.search')}
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* ── Online Carousel ────────────────────────────────── */}
      {onlineConversations.length > 0 && (
        <View style={styles.onlineSection}>
          <FlatList
            horizontal
            data={onlineConversations}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.onlineList}
            renderItem={renderOnlineConversation}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        </View>
      )}

      {/* ── Conversations List ─────────────────────────────── */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Header ────────────────────────────────────────────
  headerSafe: { backgroundColor: colors.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },

  // ── Search ────────────────────────────────────────────
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },

  // ── Online Carousel ───────────────────────────────────
  onlineSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 14,
  },
  onlineList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  onlineItem: {
    alignItems: 'center',
    width: 60,
  },
  onlineAvatarWrap: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.background,
  },
  onlineName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },

  // ── Conversation Row ──────────────────────────────────
  listContent: {
    flexGrow: 1,
    paddingTop: 4,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0EA5E9',
    borderWidth: 2,
    borderColor: colors.background,
  },
  conversationContent: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  conversationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  convNameUnread: {
    fontWeight: '700',
    color: colors.text,
  },
  convTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  convTimeUnread: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  conversationBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  convMessage: {
    flex: 1,
    fontSize: 14,
    color: colors.textTertiary,
    marginRight: 8,
  },
  convMessageUnread: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  youPrefix: {
    color: colors.textTertiary,
    fontWeight: '400',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Empty State ───────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    marginTop: 20,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
