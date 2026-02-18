/**
 * Conversations Screen - Redesigned
 * 
 * Beautiful, modern messaging interface with Instagram/Telegram inspiration
 * Features: Active now carousel, clean conversation cards, smooth animations
 * Real-time updates via Supabase Realtime + REST API
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
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

const StunityLogo = require('../../../../../Stunity.png');

import { Avatar, Input, Card } from '@/components/common';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '@/config';
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
  const [refreshing, setRefreshing] = useState(false);

  // Initial fetch + realtime subscription
  useEffect(() => {
    fetchConversations();
    if (user?.id) {
      subscribeToConversations(user.id);
    }
    return () => unsubscribeAll();
  }, [user?.id]);

  // Refresh on screen focus
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

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.displayName.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const renderConversation = ({ item, index }: { item: DMConversation; index: number }) => {
    const isUnread = item.unreadCount > 0;
    const firstParticipant = item.participants[0];
    const displayName = item.displayName;
    const displayAvatar = item.displayAvatar || firstParticipant?.profilePictureUrl;
    const participantOnline = firstParticipant?.isOnline;

    return (
      <Animated.View
        entering={FadeInDown.delay(30 * Math.min(index, 5)).duration(400)}
        style={styles.conversationWrapper}
      >
        <TouchableOpacity
          onPress={() => handleConversationPress(item)}
          style={[
            styles.conversationCard,
            isUnread && styles.conversationCardUnread,
          ]}
          activeOpacity={0.6}
        >
          {/* Avatar with gradient border for unread */}
          <View style={styles.avatarContainer}>
            {isUnread ? (
              <LinearGradient
                colors={['#FFA500', '#FF8C00', '#FF6B35']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradientBorder}
              >
                <View style={styles.avatarInner}>
                  <Avatar
                    uri={displayAvatar}
                    name={displayName}
                    size="lg"
                    showBorder={false}
                  />
                </View>
              </LinearGradient>
            ) : (
              <Avatar
                uri={displayAvatar}
                name={displayName}
                size="lg"
                showOnline={participantOnline}
              />
            )}
          </View>

          {/* Content */}
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={[
                styles.userName,
                isUnread && styles.userNameUnread,
              ]}>
                {displayName}
              </Text>
              <View style={styles.timestampRow}>
                {item.lastMessage && (
                  <Text style={[
                    styles.timestamp,
                    isUnread && styles.timestampUnread
                  ]}>
                    {formatRelativeTime(item.lastMessage.createdAt)}
                  </Text>
                )}
                {isUnread && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.messageRow}>
              <Text
                style={[
                  styles.lastMessage,
                  isUnread && styles.lastMessageUnread
                ]}
                numberOfLines={2}
              >
                {item.lastMessage?.senderId === user?.id && (
                  <Text style={styles.youPrefix}>You: </Text>
                )}
                {item.lastMessage?.content || 'No messages yet'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptyText}>
        Start a conversation with your classmates or teachers
      </Text>
      <TouchableOpacity onPress={handleNewMessage} style={styles.emptyButton}>
        <LinearGradient
          colors={['#FFA500', '#FF8C00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyButtonGradient}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>New Message</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header - matching Feed/Learn style */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          {/* Menu Button - Left */}
          <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#374151" />
          </TouchableOpacity>

          {/* Stunity Logo - Center */}
          <Image
            source={StunityLogo}
            style={styles.headerLogo}
            resizeMode="contain"
          />

          {/* Actions - Right */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleNewMessage}
            >
              <Ionicons name="create-outline" size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="search-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerDivider} />
      </SafeAreaView>

      {/* Active Now Section - Instagram Stories style */}
      {conversations.filter((c) => c.participants.some(p => p.isOnline)).length > 0 && (
        <View style={styles.onlineSection}>
          <View style={styles.onlineHeader}>
            <Text style={styles.onlineTitle}>Active Now</Text>
            <Text style={styles.onlineCount}>
              {conversations.filter((c) => c.participants.some(p => p.isOnline)).length}
            </Text>
          </View>
          <FlatList
            horizontal
            data={conversations.filter((c) => c.participants.some(p => p.isOnline))}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.onlineList}
            renderItem={({ item, index }) => {
              const onlineParticipant = item.participants.find(p => p.isOnline) || item.participants[0];
              return (
                <Animated.View entering={FadeInRight.delay(50 * index).duration(400)}>
                  <TouchableOpacity
                    onPress={() => handleConversationPress(item)}
                    style={styles.onlineUser}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#10B981', '#06B6D4', '#3B82F6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.onlineGradientBorder}
                    >
                      <View style={styles.onlineAvatarInner}>
                        <Avatar
                          uri={onlineParticipant?.profilePictureUrl}
                          name={item.displayName}
                          size="md"
                          showBorder={false}
                        />
                      </View>
                    </LinearGradient>
                    <Text style={styles.onlineUserName} numberOfLines={1}>
                      {onlineParticipant?.firstName || item.displayName.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            }}
          />
        </View>
      )}

      {/* Conversations List Header */}
      <View style={styles.conversationsHeader}>
        <Text style={styles.conversationsTitle}>All Messages</Text>
        <Text style={styles.conversationsCount}>
          {filteredConversations.length}
        </Text>
      </View>

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
            tintColor="#FFA500"
            colors={['#FFA500']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  headerSafe: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  headerLogo: {
    height: 32,
    width: 120,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },

  // Active Now Section
  onlineSection: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    marginBottom: 8,
  },
  onlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  onlineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  onlineCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  onlineList: {
    paddingHorizontal: 12,
    gap: 14,
  },
  onlineUser: {
    alignItems: 'center',
    width: 68,
  },
  onlineGradientBorder: {
    padding: 3,
    borderRadius: 34,
  },
  onlineAvatarInner: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 2,
  },
  onlineUserName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Conversations Header
  conversationsHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  conversationsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  conversationsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  // Conversation Cards
  listContent: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingTop: 4,
  },
  conversationWrapper: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  conversationCardUnread: {
    backgroundColor: '#FFFBF5',
    ...Platform.select({
      ios: {
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarGradientBorder: {
    padding: 3,
    borderRadius: 32,
  },
  avatarInner: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 2,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  userNameUnread: {
    color: '#1F2937',
    fontWeight: '700',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  timestampUnread: {
    color: '#FFA500',
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  lastMessageUnread: {
    color: '#374151',
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
    backgroundColor: '#FFA500',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FFA500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
