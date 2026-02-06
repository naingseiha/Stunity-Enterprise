/**
 * Story Circles Component
 * 
 * Instagram-style story circles at top of feed
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { Colors, Typography, Spacing, BorderRadius } from '@/config';
import { StoryGroup } from '@/types';

const { width } = Dimensions.get('window');
const STORY_SIZE = 68;

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
  // Check if current user has a story
  const hasOwnStory = storyGroups.some(
    (group) => group.user.id === currentUserId
  );

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Create Story Button */}
        <TouchableOpacity onPress={onCreateStory} style={styles.storyItem}>
          <View style={styles.createStoryButton}>
            {hasOwnStory ? (
              <Avatar
                uri={storyGroups.find((g) => g.user.id === currentUserId)?.user.profilePictureUrl}
                name="You"
                size="lg"
              />
            ) : (
              <View style={styles.createPlaceholder}>
                <Ionicons name="person" size={32} color={Colors.gray[400]} />
              </View>
            )}
            <View style={styles.addIcon}>
              <Ionicons name="add" size={16} color={Colors.white} />
            </View>
          </View>
          <Text style={styles.storyLabel} numberOfLines={1}>
            Your story
          </Text>
        </TouchableOpacity>

        {/* Story Groups */}
        {storyGroups.map((group, index) => {
          // Skip own story in the list (shown first)
          if (group.user.id === currentUserId) return null;

          return (
            <TouchableOpacity
              key={group.user.id}
              onPress={() => onStoryPress(index)}
              style={styles.storyItem}
            >
              <View style={styles.storyCircle}>
                <LinearGradient
                  colors={
                    group.hasUnviewed
                      ? [Colors.primary[400], Colors.secondary[500], Colors.error.main]
                      : [Colors.gray[300], Colors.gray[300]]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storyRing}
                >
                  <View style={styles.storyInner}>
                    <Avatar
                      uri={group.user.profilePictureUrl}
                      name={`${group.user.firstName} ${group.user.lastName}`}
                      size="lg"
                    />
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>
                {group.user.firstName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  storyItem: {
    alignItems: 'center',
    width: STORY_SIZE,
  },
  createStoryButton: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    position: 'relative',
  },
  createPlaceholder: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  storyCircle: {
    width: STORY_SIZE,
    height: STORY_SIZE,
  },
  storyRing: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    padding: 3,
  },
  storyInner: {
    flex: 1,
    borderRadius: (STORY_SIZE - 6) / 2,
    backgroundColor: Colors.white,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[700],
    marginTop: Spacing[1],
    textAlign: 'center',
    maxWidth: STORY_SIZE,
  },
});

export default StoryCircles;
