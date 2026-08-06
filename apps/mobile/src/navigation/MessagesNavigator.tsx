/**
 * Shared school messaging stack used by Main and Parent navigators.
 * Realtime remains gated separately; screens poll over REST while focused.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MessagesStackParamList } from './types';
import { useThemeContext } from '@/contexts';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import {
  ConversationsScreen,
  ChatScreen,
  NewMessageScreen,
} from '@/screens/messages';
import MessagingArchivedScreen from '@/features/archived/messaging/MessagingArchivedScreen';

const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesNavigator() {
  const { colors } = useThemeContext();

  if (!FEATURE_FLAGS.MESSAGING_ENABLED) {
    return <MessagingArchivedScreen />;
  }

  return (
    <MessagesStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MessagesStack.Screen name="Conversations" component={ConversationsScreen} />
      <MessagesStack.Screen name="Chat" component={ChatScreen} />
      <MessagesStack.Screen name="NewMessage" component={NewMessageScreen} />
    </MessagesStack.Navigator>
  );
}
