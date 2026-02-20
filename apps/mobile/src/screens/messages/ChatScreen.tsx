/**
 * Chat Screen
 * 
 * Individual chat conversation with real-time messaging.
 * Features: send, edit, delete, reply, read receipts, media attachments.
 * Uses messagingStore for API calls + Supabase Realtime for instant updates.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StatusBar,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp, SlideInRight, FadeOut } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { Avatar } from '@/components/common';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '@/config';
import { formatRelativeTime } from '@/utils';
import { useAuthStore, useMessagingStore } from '@/stores';
import { MessagesStackScreenProps } from '@/navigation/types';
import { DirectMessage } from '@/stores/messagingStore';

type RouteProp = MessagesStackScreenProps<'Chat'>['route'];
type NavigationProp = MessagesStackScreenProps<'Chat'>['navigation'];

export default function ChatScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const {
    messages,
    isLoadingMessages,
    typingUsers,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    subscribeToMessages,
    unsubscribeFromMessages,
    markAsRead,
    sendTypingIndicator,
    setActiveConversation,
  } = useMessagingStore();

  const conversationId = route.params?.conversationId;
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find conversation info from the store
  const conversations = useMessagingStore(state => state.conversations);
  const conversation = useMemo(
    () => conversations.find(c => c.id === conversationId),
    [conversations, conversationId]
  );
  const otherParticipant = useMemo(
    () => conversation?.participants?.[0],
    [conversation]
  );

  // Initialize: fetch messages + subscribe
  useEffect(() => {
    if (!conversationId) return;

    setActiveConversation(conversationId);
    fetchMessages(conversationId, true);
    subscribeToMessages(conversationId);
    markAsRead(conversationId);

    return () => {
      unsubscribeFromMessages();
      setActiveConversation(null);
    };
  }, [conversationId]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Compute typing indicator text
  const typingText = useMemo(() => {
    const typers = Array.from(typingUsers.values()).filter(
      t => t.userId !== user?.id
    );
    if (typers.length === 0) return null;
    if (typers.length === 1) return `${typers[0].firstName} is typing...`;
    return `${typers.length} people are typing...`;
  }, [typingUsers, user?.id]);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !conversationId) return;

    if (editingMessage) {
      // Edit existing message
      editMessage(editingMessage.id, inputText.trim());
      setEditingMessage(null);
    } else {
      // Send new message (with optional reply)
      sendMessage(conversationId, inputText.trim());
    }

    setInputText('');
    setReplyTo(null);
    Keyboard.dismiss();

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, conversationId, sendMessage, editMessage, editingMessage]);

  const handleTextChange = useCallback((text: string) => {
    setInputText(text);

    if (conversationId && user?.id && text.length > 0) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(conversationId, user.id, user.firstName || 'User');
      }, 500);
    }
  }, [conversationId, user, sendTypingIndicator]);

  const handleLongPress = useCallback((message: DirectMessage) => {
    if (message.isDeleted || message._isPending) return;
    const isMe = message.senderId === user?.id;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const options = ['Reply'];
    if (isMe) {
      options.push('Edit', 'Delete');
    }
    options.push('Cancel');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: isMe ? options.indexOf('Delete') : undefined,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (options[buttonIndex] === 'Reply') {
            setReplyTo(message);
            inputRef.current?.focus();
          } else if (options[buttonIndex] === 'Edit') {
            setEditingMessage(message);
            setInputText(message.content);
            inputRef.current?.focus();
          } else if (options[buttonIndex] === 'Delete') {
            Alert.alert('Delete Message', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete', style: 'destructive',
                onPress: () => deleteMessage(message.id),
              },
            ]);
          }
        }
      );
    } else {
      // Android fallback
      Alert.alert(
        'Message Options',
        undefined,
        [
          {
            text: 'Reply',
            onPress: () => { setReplyTo(message); inputRef.current?.focus(); },
          },
          ...(isMe ? [
            {
              text: 'Edit',
              onPress: () => {
                setEditingMessage(message);
                setInputText(message.content);
                inputRef.current?.focus();
              },
            },
            {
              text: 'Delete',
              style: 'destructive' as const,
              onPress: () => deleteMessage(message.id),
            },
          ] : []),
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    }
  }, [user?.id, deleteMessage]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0] && conversationId) {
      // For now, send as text with image URI placeholder
      // Full upload integration requires Supabase Storage setup
      sendMessage(conversationId, `📷 Image shared`, 'IMAGE');
    }
  }, [conversationId, sendMessage]);

  const cancelReplyOrEdit = useCallback(() => {
    setReplyTo(null);
    setEditingMessage(null);
    setInputText('');
  }, []);

  const renderMessage = ({ item, index }: { item: DirectMessage; index: number }) => {
    const isMe = item.senderId === user?.id || item.senderId === 'me';
    const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== item.senderId);

    // Find reply-to message
    const replyMessage = item.replyToId
      ? messages.find(m => m.id === item.replyToId)
      : null;

    return (
      <Animated.View
        entering={FadeInUp.delay(50 * Math.min(index, 5)).duration(300)}
        style={[
          styles.messageRow,
          isMe && styles.myMessageRow,
        ]}
      >
        {!isMe && (
          <View style={styles.messageAvatar}>
            {showAvatar && (
              <Avatar
                uri={otherParticipant?.profilePictureUrl}
                name={otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'User'}
                size="sm"
              />
            )}
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={400}
          style={[
            styles.messageBubble,
            isMe ? styles.myBubble : styles.otherBubble,
            item._isPending && styles.pendingBubble,
          ]}
        >
          {/* Reply preview */}
          {replyMessage && (
            <View style={[styles.replyPreview, isMe && styles.myReplyPreview]}>
              <View style={[styles.replyBar, isMe && styles.myReplyBar]} />
              <View style={styles.replyContent}>
                <Text style={[styles.replyAuthor, isMe && styles.myReplyAuthor]} numberOfLines={1}>
                  {replyMessage.senderId === user?.id ? 'You' : otherParticipant?.firstName || 'User'}
                </Text>
                <Text style={[styles.replyText, isMe && styles.myReplyText]} numberOfLines={1}>
                  {replyMessage.isDeleted ? 'Deleted message' : replyMessage.content}
                </Text>
              </View>
            </View>
          )}

          {item.isDeleted ? (
            <Text style={[styles.messageText, styles.deletedText]}>
              This message was deleted
            </Text>
          ) : (
            <Text style={[
              styles.messageText,
              isMe && styles.myMessageText,
            ]}>
              {item.content}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMe && styles.myMessageTime,
            ]}>
              {formatRelativeTime(item.createdAt)}
            </Text>
            {item.isEdited && (
              <Text style={[styles.editedLabel, isMe && styles.myMessageTime]}>
                edited
              </Text>
            )}
            {item._isPending && (
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" />
            )}
            {/* Read receipt for own messages */}
            {isMe && !item._isPending && !item.isDeleted && (
              <Ionicons
                name="checkmark-done"
                size={14}
                color="rgba(255,255,255,0.7)"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.gray[700]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => {
            if (otherParticipant?.id) {
              navigation.navigate('UserProfile' as any, { userId: otherParticipant.id });
            }
          }}
        >
          <Avatar
            uri={otherParticipant?.profilePictureUrl}
            name={conversation?.displayName || 'Chat'}
            size="md"
            showOnline={otherParticipant?.isOnline}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {conversation?.displayName || 'Chat'}
            </Text>
            <Text style={styles.userStatus}>
              {otherParticipant?.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="call-outline" size={22} color={Colors.gray[700]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="videocam-outline" size={22} color={Colors.gray[700]} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoadingMessages && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            extraData={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Typing Indicator */}
        {typingText && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.typingIndicator}>
            <Text style={styles.typingText}>{typingText}</Text>
          </Animated.View>
        )}

        {/* Reply/Edit Banner */}
        {(replyTo || editingMessage) && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.replyBanner}>
            <View style={styles.replyBannerBar} />
            <View style={styles.replyBannerContent}>
              <Text style={styles.replyBannerTitle}>
                {editingMessage ? '✏️ Editing message' : `↩️ Replying to ${replyTo?.senderId === user?.id ? 'yourself' : otherParticipant?.firstName || 'User'}`}
              </Text>
              <Text style={styles.replyBannerText} numberOfLines={1}>
                {editingMessage?.content || replyTo?.content}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelReplyOrEdit} style={styles.replyBannerClose}>
              <Ionicons name="close" size={20} color={Colors.gray[500]} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Input Area */}
        <Animated.View entering={SlideInRight.duration(300)} style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
            <Ionicons name="image-outline" size={24} color={Colors.gray[500]} />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={handleTextChange}
              placeholder={editingMessage ? 'Edit message...' : replyTo ? 'Reply...' : 'Type a message...'}
              placeholderTextColor={Colors.gray[400]}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Ionicons name="happy-outline" size={24} color={Colors.gray[400]} />
            </TouchableOpacity>
          </View>

          {inputText.trim() ? (
            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
              <Ionicons name={editingMessage ? 'checkmark' : 'send'} size={20} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.voiceButton}>
              <Ionicons name="mic-outline" size={24} color={Colors.gray[500]} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[1],
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: Spacing[3],
  },
  userName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  userStatus: {
    fontSize: Typography.fontSize.xs,
    color: Colors.success.main,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing[1],
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
  },
  messagesList: {
    padding: Spacing[4],
    paddingBottom: Spacing[2],
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing[2],
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    marginRight: Spacing[2],
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.xl,
  },
  myBubble: {
    backgroundColor: '#0EA5E9',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    ...Shadows.sm,
  },
  pendingBubble: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[800],
    lineHeight: 22,
  },
  myMessageText: {
    color: Colors.white,
  },
  deletedText: {
    fontStyle: 'italic',
    color: Colors.gray[400],
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing[1],
    alignSelf: 'flex-end',
  },
  messageTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[400],
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  editedLabel: {
    fontSize: 10,
    color: Colors.gray[400],
    fontStyle: 'italic',
  },
  typingIndicator: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  typingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.gray[100],
    borderRadius: 24,
    paddingLeft: Spacing[4],
    paddingRight: Spacing[2],
    minHeight: 44,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.gray[900],
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    maxHeight: 100,
  },
  emojiButton: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing[2],
  },
  voiceButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing[1],
  },
  // Reply preview inside message bubble
  replyPreview: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  myReplyPreview: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  replyBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#0EA5E9',
    marginRight: 8,
  },
  myReplyBar: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  replyContent: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0EA5E9',
    marginBottom: 2,
  },
  myReplyAuthor: {
    color: 'rgba(255,255,255,0.9)',
  },
  replyText: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  myReplyText: {
    color: 'rgba(255,255,255,0.7)',
  },
  // Reply/Edit banner above input
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  replyBannerBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: '#0EA5E9',
    marginRight: Spacing[3],
  },
  replyBannerContent: {
    flex: 1,
  },
  replyBannerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0EA5E9',
    marginBottom: 2,
  },
  replyBannerText: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  replyBannerClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
