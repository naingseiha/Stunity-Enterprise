/**
 * Conversations Screen — Clean Professional Design
 *
 * Flat conversation list, iOS-style header, inline search
 * Real-time updates via messagingStore + Supabase Realtime
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { Colors } from '@/config';
import { formatRelativeTime } from '@/utils';
import { MessagesStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';
import { useMessagingStore, useAuthStore } from '@/stores';
import { DMConversation } from '@/stores/messagingStore';

type NavigationProp = MessagesStackScreenProps<'Conversations'>['navigation'];

export default function ConversationsScreen() {
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

  const filteredConversations = conversations.filter((conv) =>
    conv.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineConversations = conversations.filter((c) =>
    c.participants.some(p => p.isOnline)
  );

  // ── Conversation Row ─────────────────────────────────────
  const renderConversation = ({ item, index }: { item: DMConversation; index: number }) => {
    const isUnread = item.unreadCount > 0;
    const firstParticipant = item.participants[0];
    const displayName = item.displayName;
    const displayAvatar = item.displayAvatar || firstParticipant?.profilePictureUrl;

    return (
      <Animated.View entering={FadeInDown.delay(20 * Math.min(index, 8)).duration(300)}>
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
            {isUnread && <View style={styles.unreadDot} />}
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
                  <Text style={styles.youPrefix}>You: </Text>
                )}
                {item.lastMessage?.content || 'No messages yet'}
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
  };

  // ── Empty State ──────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="chatbubbles-outline" size={40} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptyText}>
        Start a conversation with your classmates or teachers
      </Text>
      <TouchableOpacity onPress={handleNewMessage} activeOpacity={0.85}>
        <LinearGradient
          colors={['#0EA5E9', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyBtn}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.emptyBtnText}>New Message</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={openSidebar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="menu" size={26} color="#1F2937" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Messages</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={showSearch ? "close" : "search-outline"} size={22} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNewMessage}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        {showSearch && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
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
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.onlineList}
            renderItem={({ item }) => {
              const p = item.participants.find(p => p.isOnline) || item.participants[0];
              return (
                <TouchableOpacity
                  onPress={() => handleConversationPress(item)}
                  style={styles.onlineItem}
                  activeOpacity={0.7}
                >
                  <View style={styles.onlineAvatarWrap}>
                    <Avatar
                      uri={p?.profilePictureUrl}
                      name={item.displayName}
                      size="md"
                    />
                    <View style={styles.onlineIndicator} />
                  </View>
                  <Text style={styles.onlineName} numberOfLines={1}>
                    {p?.firstName || item.displayName.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ── Conversations List ─────────────────────────────── */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0EA5E9"
            colors={['#0EA5E9']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // ── Header ────────────────────────────────────────────
  headerSafe: { backgroundColor: '#fff' },
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
    color: '#1F2937',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
    height: '100%',
  },

  // ── Online Carousel ───────────────────────────────────
  onlineSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    borderColor: '#fff',
  },
  onlineName: {
    fontSize: 11,
    color: '#6B7280',
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
    borderColor: '#fff',
  },
  conversationContent: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
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
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  convNameUnread: {
    fontWeight: '700',
    color: '#1F2937',
  },
  convTime: {
    fontSize: 12,
    color: '#9CA3AF',
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
    color: '#9CA3AF',
    marginRight: 8,
  },
  convMessageUnread: {
    color: '#4B5563',
    fontWeight: '500',
  },
  youPrefix: {
    color: '#9CA3AF',
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
    color: '#fff',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
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
    color: '#fff',
  },
});
