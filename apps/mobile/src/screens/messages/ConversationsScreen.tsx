/**
 * Conversations Screen
 * 
 * Clean, professional design matching Feed/Learn screens
 * Instagram/WhatsApp-inspired messaging interface
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

const StunityLogo = require('../../../../../Stunity.png');

import { Avatar, Input, Card } from '@/components/common';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '@/config';
import { formatRelativeTime } from '@/utils';
import { MessagesStackScreenProps } from '@/navigation/types';
import { useNavigationContext } from '@/contexts';

type NavigationProp = MessagesStackScreenProps<'Conversations'>['navigation'];

interface Conversation {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    isOnline?: boolean;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    isRead: boolean;
    senderId: string;
  };
  unreadCount: number;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    user: {
      id: 'u1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      isOnline: true,
    },
    lastMessage: {
      content: 'Hey! Did you complete the assignment?',
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      isRead: false,
      senderId: 'u1',
    },
    unreadCount: 2,
  },
  {
    id: '2',
    user: {
      id: 'u2',
      firstName: 'Mike',
      lastName: 'Chen',
      isOnline: false,
    },
    lastMessage: {
      content: 'Thanks for the help! 🙏',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      senderId: 'u2',
    },
    unreadCount: 0,
  },
  {
    id: '3',
    user: {
      id: 'u3',
      firstName: 'Emily',
      lastName: 'Davis',
      isOnline: true,
    },
    lastMessage: {
      content: 'The study group is at 3pm tomorrow',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      senderId: 'me',
    },
    unreadCount: 0,
  },
];

export default function ConversationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { openSidebar } = useNavigationContext();
  
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Fetch from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleConversationPress = useCallback((conversation: Conversation) => {
    navigation.navigate('Chat', { 
      conversationId: conversation.id,
      userId: conversation.user.id,
    });
  }, [navigation]);

  const handleNewMessage = useCallback(() => {
    navigation.navigate('NewMessage' as any);
  }, [navigation]);

  const filteredConversations = conversations.filter((conv) => {
    const fullName = `${conv.user.firstName} ${conv.user.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => (
    <Animated.View entering={FadeInDown.delay(30 * Math.min(index, 5)).duration(300)}>
      <TouchableOpacity
        onPress={() => handleConversationPress(item)}
        style={styles.conversationItem}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Avatar
            uri={item.user.profilePictureUrl}
            name={`${item.user.firstName} ${item.user.lastName}`}
            size="lg"
            showOnline={item.user.isOnline}
          />
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName}>
              {item.user.firstName} {item.user.lastName}
            </Text>
            <Text style={[
              styles.timestamp,
              !item.lastMessage.isRead && styles.unreadTimestamp
            ]}>
              {formatRelativeTime(item.lastMessage.createdAt)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.lastMessage,
                !item.lastMessage.isRead && styles.unreadMessage
              ]}
              numberOfLines={1}
            >
              {item.lastMessage.senderId === 'me' && 'You: '}
              {item.lastMessage.content}
            </Text>

            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

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

      {/* Active Now Section */}
      {conversations.filter((c) => c.user.isOnline).length > 0 && (
        <View style={styles.onlineSection}>
          <Text style={styles.onlineTitle}>Active Now</Text>
          <FlatList
            horizontal
            data={conversations.filter((c) => c.user.isOnline)}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.onlineList}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInRight.delay(50 * index).duration(300)}>
                <TouchableOpacity 
                  onPress={() => handleConversationPress(item)}
                  style={styles.onlineUser}
                  activeOpacity={0.7}
                >
                  <View style={styles.onlineAvatarWrapper}>
                    <Avatar
                      uri={item.user.profilePictureUrl}
                      name={`${item.user.firstName} ${item.user.lastName}`}
                      size="lg"
                      showBorder={false}
                    />
                    <View style={styles.onlineDot} />
                  </View>
                  <Text style={styles.onlineUserName} numberOfLines={1}>
                    {item.user.firstName}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          />
        </View>
      )}

      {/* Conversations List */}
      <View style={styles.conversationsHeader}>
        <Text style={styles.conversationsTitle}>Messages</Text>
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
    backgroundColor: '#F8F7FC',
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
    backgroundColor: '#E5E7EB',
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
  },
  onlineSection: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  onlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  onlineList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  onlineUser: {
    alignItems: 'center',
    width: 64,
  },
  onlineAvatarWrapper: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineUserName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  conversationsHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  conversationsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  listContent: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  unreadTimestamp: {
    color: '#FFA500',
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  unreadMessage: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFA500',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
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
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
