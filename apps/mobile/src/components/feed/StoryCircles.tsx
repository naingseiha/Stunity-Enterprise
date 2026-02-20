/**
 * Story Circles Component
 * 
 * V1 App Design - Beautiful, clean, modern story circles
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { StoryGroup } from '@/types';

const STORY_SIZE = 68;
const RING_WIDTH = 3;

interface StoryCirclesProps {
  storyGroups: StoryGroup[];
  onStoryPress: (index: number) => void;
  onCreateStory: () => void;
  currentUserId?: string;
}

export const StoryCircles: React.FC<StoryCirclesProps> = ({
  storyGroups,
  onStoryPress,
  onCreateStory,
  currentUserId,
}) => {
  const hasOwnStory = storyGroups.some(
    (group) => group.user.id === currentUserId
  );

  const renderStoryAvatar = (
    uri: string | undefined,
    name: string,
    hasUnviewed: boolean
  ) => {
    const initials = name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();

    return (
      <View style={styles.avatarWrapper}>
        {hasUnviewed ? (
          <LinearGradient
            colors={['#0EA5E9', '#F97316', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientRing}
          >
            <View style={styles.avatarInner}>
              {uri ? (
                <Image source={{ uri }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.grayRing}>
            <View style={styles.avatarInner}>
              {uri ? (
                <Image source={{ uri }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Create Story / Your Story */}
        <TouchableOpacity onPress={onCreateStory} style={styles.storyItem}>
          <View style={styles.createStoryWrapper}>
            {hasOwnStory ? (
              renderStoryAvatar(
                storyGroups.find((g) => g.user.id === currentUserId)?.user
                  .profilePictureUrl,
                'You',
                true
              )
            ) : (
              <View style={styles.createCircle}>
                <Ionicons name="person" size={26} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.addButton}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.storyName} numberOfLines={1}>
            {hasOwnStory ? 'Your Story' : 'Add Story'}
          </Text>
        </TouchableOpacity>

        {/* Other Users' Stories */}
        {storyGroups.map((group, index) => {
          if (group.user.id === currentUserId) return null;

          const fullName = `${group.user.firstName} ${group.user.lastName}`;

          return (
            <TouchableOpacity
              key={group.user.id}
              onPress={() => onStoryPress(index)}
              style={styles.storyItem}
            >
              {renderStoryAvatar(
                group.user.profilePictureUrl,
                fullName,
                group.hasUnviewed
              )}
              <Text style={styles.storyName} numberOfLines={1}>
                {group.user.firstName}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Empty state placeholders */}
        {storyGroups.length <= 1 && (
          <>
            {[1, 2, 3, 4].map((i) => (
              <View key={`placeholder-${i}`} style={styles.storyItem}>
                <View style={styles.emptyCircle} />
                <View style={styles.emptyName} />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 0,
    borderRadius: 18,
    
    
    
    shadowRadius: 10,
    
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: STORY_SIZE + 8,
  },
  createStoryWrapper: {
    position: 'relative',
  },
  avatarWrapper: {
    width: STORY_SIZE,
    height: STORY_SIZE,
  },
  gradientRing: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    padding: RING_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grayRing: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    padding: RING_WIDTH,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: STORY_SIZE - RING_WIDTH * 2,
    height: STORY_SIZE - RING_WIDTH * 2,
    borderRadius: (STORY_SIZE - RING_WIDTH * 2) / 2,
    backgroundColor: '#fff',
    padding: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: (STORY_SIZE - RING_WIDTH * 2 - 4) / 2,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: (STORY_SIZE - RING_WIDTH * 2 - 4) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  createCircle: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyName: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
    width: STORY_SIZE + 8,
  },
  emptyCircle: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    backgroundColor: '#F3F4F6',
  },
  emptyName: {
    marginTop: 6,
    width: 40,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
});

export default StoryCircles;
