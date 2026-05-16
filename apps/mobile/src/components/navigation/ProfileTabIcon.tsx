/**
 * Profile tab icon — shows the user's photo when set, otherwise a person icon.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores';
import { cdnAvatar } from '@/utils/cdnUrl';

const ICON_SIZE = 28;
const PHOTO_SIZE = 26;

interface ProfileTabIconProps {
  focused: boolean;
  color: string;
}

export const ProfileTabIcon = React.memo(function ProfileTabIcon({
  focused,
  color,
}: ProfileTabIconProps) {
  const profilePictureUrl = useAuthStore((s) => s.user?.profilePictureUrl);
  const imageUri = profilePictureUrl ? cdnAvatar(profilePictureUrl, 'sm') : '';

  if (!imageUri) {
    return (
      <Ionicons
        name={focused ? 'person-circle' : 'person-circle-outline'}
        size={ICON_SIZE}
        color={color}
      />
    );
  }

  return (
    <View
      style={[
        styles.photoWrap,
        focused ? styles.photoWrapFocused : styles.photoWrapIdle,
        focused && { borderColor: color },
      ]}
    >
      <Image
        source={{ uri: imageUri, cacheKey: imageUri }}
        style={styles.photo}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  photoWrap: {
    width: PHOTO_SIZE + 4,
    height: PHOTO_SIZE + 4,
    borderRadius: (PHOTO_SIZE + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoWrapIdle: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  photoWrapFocused: {
    borderWidth: 2,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
  },
});

export default ProfileTabIcon;
