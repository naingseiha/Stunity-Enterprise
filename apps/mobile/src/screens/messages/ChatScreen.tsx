/**
 * Chat Screen
 * 
 * Individual chat conversation
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp, SlideInRight } from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '@/config';
import { formatRelativeTime } from '@/utils';
import { useAuthStore } from '@/stores';
import { MessagesStackScreenProps } from '@/navigation/types';

type RouteProp = MessagesStackScreenProps<'Chat'>['route'];
type NavigationProp = MessagesStackScreenProps<'Chat'>['navigation'];

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
}

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    content: 'Hey! How are you doing?',
    senderId: 'other',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: '2',
    content: 'I\'m good! Just working on the project.',
    senderId: 'me',
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: '3',
    content: 'Nice! Did you complete the assignment?',
    senderId: 'other',
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: '4',
    content: 'Almost done, just need to review the last section 📚',
    senderId: 'me',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: '5',
    content: 'Great! Let me know if you need any help. We could study together tomorrow if you want.',
    senderId: 'other',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    isRead: false,
  },
];

export default function ChatScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const otherUser = {
    id: route.params?.userId || 'u1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    isOnline: true,
  };

  useEffect(() => {
    // Scroll to bottom on load
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputText.trim(),
      senderId: 'me',
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
    Keyboard.dismiss();

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === 'me';
    const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== item.senderId);

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
                uri={undefined}
                name={`${otherUser.firstName} ${otherUser.lastName}`}
                size="sm"
              />
            )}
          </View>
        )}

        <View style={[
          styles.messageBubble,
          isMe ? styles.myBubble : styles.otherBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isMe && styles.myMessageText,
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isMe && styles.myMessageTime,
          ]}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
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
          <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => navigation.navigate('UserProfile' as any, { userId: otherUser.id })}
        >
          <Avatar
            uri={undefined}
            name={`${otherUser.firstName} ${otherUser.lastName}`}
            size="md"
            showOnline={otherUser.isOnline}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {otherUser.firstName} {otherUser.lastName}
            </Text>
            <Text style={styles.userStatus}>
              {otherUser.isOnline ? 'Online' : 'Offline'}
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
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing Indicator */}
        {isTyping && (
          <Animated.View entering={FadeIn} style={styles.typingIndicator}>
            <Text style={styles.typingText}>
              {otherUser.firstName} is typing...
            </Text>
          </Animated.View>
        )}

        {/* Input Area */}
        <Animated.View entering={SlideInRight.duration(300)} style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.gray[500]} />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
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
              <Ionicons name="send" size={20} color={Colors.white} />
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
    backgroundColor: Colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
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
    backgroundColor: Colors.primary[500],
    borderBottomRightRadius: BorderRadius.sm,
  },
  otherBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: BorderRadius.sm,
    ...Shadows.sm,
  },
  messageText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[800],
    lineHeight: 22,
  },
  myMessageText: {
    color: Colors.white,
  },
  messageTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[400],
    marginTop: Spacing[1],
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
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
    borderTopColor: Colors.gray[100],
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
    backgroundColor: Colors.primary[500],
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
});
