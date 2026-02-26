import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/common';
import { formatRelativeTime } from '@/utils';
import * as Haptics from 'expo-haptics';

interface PostHeaderProps {
  author: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    profilePictureUrl?: string;
    isVerified?: boolean;
    role?: string;
  };
  createdAt: string;
  visibility: 'PUBLIC' | 'SCHOOL' | 'CLASS' | 'FOLLOWERS' | 'PRIVATE';
  learningMeta?: {
    studyGroupName?: string;
    isLive?: boolean;
    liveViewers?: number;
  };
  isCurrentUser: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  onUserPress: () => void;
  onFollow: () => void;
  onMenuToggle: () => void;
  showMenu: boolean;
  menuContent: React.ReactNode; // Pass the menu dropdown as children or a prop
}

const PostHeader = ({
  author,
  createdAt,
  visibility,
  learningMeta,
  isCurrentUser,
  isFollowing,
  followLoading,
  onUserPress,
  onFollow,
  onMenuToggle,
  showMenu,
  menuContent,
}: PostHeaderProps) => {

  const authorName = author.name || `${author.firstName} ${author.lastName}`;

  // Role Badge Logic
  const roleBadge = React.useMemo(() => {
    const role = author.role;
    if (role === 'TEACHER') {
      return { icon: 'school', color: '#3B82F6', label: 'Teacher' };
    } else if (role === 'ADMIN' || role === 'SCHOOL_ADMIN') {
      return { icon: 'shield-checkmark', color: '#8B5CF6', label: 'Admin' };
    }
    return null;
  }, [author.role]);

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onUserPress} style={styles.authorSection}>
        <Avatar
          uri={author.profilePictureUrl}
          name={authorName}
          size="md"
          variant="post"
        />
        <View style={styles.authorInfo}>
          <View style={styles.authorRow}>
            <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>

            {/* Verified Badge */}
            {(author.isVerified || isCurrentUser) && (
              <View style={styles.verifiedBadge}>
                <View style={styles.twitterBlueTick}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              </View>
            )}

            {/* Role Badge */}
            {roleBadge && (
              <View style={[styles.roleBadge, { backgroundColor: roleBadge.color + '20' }]}>
                <Ionicons name={roleBadge.icon as any} size={12} color={roleBadge.color} />
                <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.timeText}>{formatRelativeTime(createdAt)}</Text>

            {/* Visibility */}
            <Text style={styles.metaDot}>•</Text>
            <View style={styles.visibilityIndicator}>
              <Ionicons
                name={
                  visibility === 'PUBLIC' ? 'earth' :
                    visibility === 'SCHOOL' ? 'school' :
                      visibility === 'CLASS' ? 'people' :
                        'lock-closed'
                }
                size={10}
                color={
                  visibility === 'PUBLIC' ? '#10B981' :
                    visibility === 'SCHOOL' ? '#3B82F6' :
                      visibility === 'CLASS' ? '#8B5CF6' :
                        '#6B7280'
                }
              />
            </View>

            {/* Study Group Tag */}
            {!!learningMeta?.studyGroupName && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <View style={styles.studyGroupTag}>
                  <Ionicons name="people" size={10} color="#8B5CF6" />
                  <Text style={styles.studyGroupText}>{learningMeta.studyGroupName}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Follow Button */}
      {!isCurrentUser && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onFollow();
          }}
          disabled={followLoading}
          activeOpacity={0.5}
          style={styles.followBtnWrap}
        >
          {followLoading ? (
            <ActivityIndicator size={11} color="#0EA5E9" />
          ) : isFollowing ? (
            <Text style={styles.followBtnTextFollowing}>Following</Text>
          ) : (
            <Text style={styles.followBtnText}>Follow</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Menu */}
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.moreButton} onPress={onMenuToggle}>
          <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
        </TouchableOpacity>
        {showMenu ? menuContent : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  authorSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flexShrink: 1,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  twitterBlueTick: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1D9BF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    marginLeft: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  metaDot: {
    fontSize: 13,
    color: '#9CA3AF',
    marginHorizontal: 6,
  },
  visibilityIndicator: {
    marginLeft: 2,
  },
  studyGroupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  studyGroupText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#0D9488',
  },
  followBtnWrap: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginRight: 2,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  followBtnTextFollowing: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  menuContainer: {
    position: 'relative',
    zIndex: 100,
  },
  moreButton: {
    padding: 6,
    marginRight: -6,
  },
});

export default memo(PostHeader);
