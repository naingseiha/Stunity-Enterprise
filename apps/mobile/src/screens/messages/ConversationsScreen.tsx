/**
 * Conversations Screen
 * 
 * List of message conversations
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { Avatar, Input, Card } from '@/components/common';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '@/config';
import { formatRelativeTime } from '@/utils';
import { MessagesStackScreenProps } from '@/navigation/types';

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
    <Animated.View entering={FadeInDown.delay(50 * index).duration(300)}>
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
      <Ionicons name="chatbubbles-outline" size={64} color={Colors.gray[300]} />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptyText}>
        Start a conversation with your classmates or teachers
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={handleNewMessage} style={styles.newMessageButton}>
          <Ionicons name="create-outline" size={24} color={Colors.primary[500]} />
        </TouchableOpacity>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.searchContainer}>
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
          containerStyle={styles.searchInput}
        />
      </Animated.View>

      {/* Online Users */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.onlineContainer}>
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
              >
                <Avatar
                  uri={item.user.profilePictureUrl}
                  name={`${item.user.firstName} ${item.user.lastName}`}
                  size="lg"
                  showOnline
                />
                <Text style={styles.onlineUserName} numberOfLines={1}>
                  {item.user.firstName}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      </Animated.View>

      {/* Conversations List */}
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
            tintColor={Colors.primary[500]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.gray[900],
  },
  newMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  searchInput: {
    marginBottom: 0,
  },
  onlineContainer: {
    paddingTop: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
    paddingBottom: Spacing[3],
  },
  onlineTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.gray[500],
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[2],
  },
  onlineList: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[4],
  },
  onlineUser: {
    alignItems: 'center',
    width: 60,
  },
  onlineUserName: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[600],
    marginTop: Spacing[1],
    textAlign: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  avatarContainer: {
    marginRight: Spacing[3],
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[1],
  },
  userName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[400],
  },
  unreadTimestamp: {
    color: Colors.primary[500],
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
    marginRight: Spacing[2],
  },
  unreadMessage: {
    color: Colors.gray[900],
    fontWeight: '500',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[1],
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[16],
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '600',
    color: Colors.gray[700],
    marginTop: Spacing[4],
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[500],
    textAlign: 'center',
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[8],
  },
});
