/**
 * Story Circles Component
 * 
 * Instagram-style story circles - improved design
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
const STORY_SIZE = 64;

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

  if (storyGroups.length === 0) {
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
              <LinearGradient
                colors={[Colors.gray[100], Colors.gray[200]]}
                style={styles.createPlaceholder}
              >
                <Ionicons name="person" size={28} color={Colors.gray[400]} />
              </LinearGradient>
              <View style={styles.addIcon}>
                <Ionicons name="add" size={14} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.storyLabel} numberOfLines={1}>
              Add story
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    );
  }

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
              <LinearGradient
                colors={['#F59E0B', '#F97316', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyRing}
              >
                <View style={styles.storyInner}>
                  <Avatar
                    uri={storyGroups.find((g) => g.user.id === currentUserId)?.user.profilePictureUrl}
                    name="You"
                    size="md"
                  />
                </View>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={[Colors.gray[100], Colors.gray[200]]}
                style={styles.createPlaceholder}
              >
                <Ionicons name="person" size={28} color={Colors.gray[400]} />
              </LinearGradient>
            )}
            <View style={styles.addIcon}>
              <Ionicons name="add" size={14} color={Colors.white} />
            </View>
          </View>
          <Text style={styles.storyLabel} numberOfLines={1}>
            {hasOwnStory ? 'Your story' : 'Add story'}
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
                      ? ['#F59E0B', '#F97316', '#EF4444']
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
                      size="md"
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
    marginHorizontal: Spacing[3],
    marginTop: Spacing[2],
    marginBottom: Spacing[2],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  scrollContent: {
    paddingHorizontal: Spacing[3],
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
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
    padding: 2,
  },
  storyInner: {
    flex: 1,
    borderRadius: (STORY_SIZE - 4) / 2,
    backgroundColor: Colors.white,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLabel: {
    fontSize: 11,
    color: Colors.gray[600],
    marginTop: 4,
    textAlign: 'center',
    maxWidth: STORY_SIZE,
  },
});

export default StoryCircles;
