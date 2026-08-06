import React, { memo, useCallback, useRef } from 'react';
import { useThemeContext } from '@/contexts';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Animated, Platform } from 'react-native';
import { ScalePressable } from '@/components/common';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/common';
import { formatRelativeTime } from '@/utils';
import { Haptics } from '@/services/haptics';
import { useTranslation } from 'react-i18next';
import { feedBodyPreferKhmer, feedTextStyle, textContainsKhmer } from '@/config/feedTypography';
import { renderProfileNameText } from '@/utils/renderEmojiText';
import EdScoreBadge from './EdScoreBadge';
import TeacherVerifiedBadge from './TeacherVerifiedBadge';

interface PostHeaderProps {
  author: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    profilePictureUrl?: string;
    isVerified?: boolean;
    role?: string;
    isOnline?: boolean;
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
  // Ed-Score (Educational Value) badge — additive overlay; nothing renders
  // when score is missing or below the visibility threshold (3.5).
  edScore?: number;
  // Teacher-verified post badge — additive overlay.
  teacherVerified?: boolean;
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
  edScore,
  teacherVerified,
}: PostHeaderProps) => {
  const { colors, isDark } = useThemeContext();
  const { t, i18n } = useTranslation();
  const authorName = `${author.lastName || ''} ${author.firstName || ''}`.trim() || author.name || '';
  // Koulen metrics only apply when the name itself has Khmer — not merely UI locale.
  const nameHasKhmer = textContainsKhmer(authorName);
  const preferKhmer = feedBodyPreferKhmer(authorName, i18n.resolvedLanguage || i18n.language);
  const styles = React.useMemo(
    () => createStyles(colors, isDark, preferKhmer, nameHasKhmer),
    [colors, isDark, preferKhmer, nameHasKhmer],
  );
  const menuScale = useRef(new Animated.Value(1)).current;

  const handleMenuPress = useCallback(() => {
    Animated.sequence([
      Animated.spring(menuScale, { toValue: 0.9, damping: 14, stiffness: 380, useNativeDriver: true }),
      Animated.spring(menuScale, { toValue: 1, damping: 16, stiffness: 360, useNativeDriver: true }),
    ]).start();
    onMenuToggle();
  }, [menuScale, onMenuToggle]);

  // Role Badge Logic
  const roleBadge = React.useMemo(() => {
    const role = author.role;
    if (role === 'TEACHER') {
      return { icon: 'school', color: '#3B82F6', label: t('common.teacher') };
    } else if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') {
      return { icon: 'shield-checkmark', color: '#8B5CF6', label: t('common.admin') };
    }
    return null;
  }, [author.role, t]);

  return (
    <View style={styles.header}>
      <ScalePressable pressScale={0.94} onPress={onUserPress}>
        <Avatar
          uri={author.profilePictureUrl}
          name={authorName}
          size="md"
          variant="post"
          showOnline={!!author.isOnline}
          isOnline={!!author.isOnline}
        />
      </ScalePressable>

      <View style={styles.authorInfo}>
        {/* Name + badges + ··· on the top line */}
        <View style={styles.nameActionsRow}>
          <ScalePressable pressScale={0.98} pressOpacity={false} onPress={onUserPress} style={styles.nameBadges}>
            <View style={styles.authorRow}>
              {renderProfileNameText(authorName, styles.authorName, 1)}

              {(author.isVerified || isCurrentUser) && (
                <View style={styles.verifiedBadge}>
                  <View style={styles.twitterBlueTick}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                </View>
              )}

              {roleBadge && (
                <View style={styles.roleBadge}>
                  <Ionicons name={roleBadge.icon as any} size={12} color={roleBadge.color} />
                  <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
                </View>
              )}

              {typeof edScore === 'number' ? <EdScoreBadge score={edScore} /> : null}
            </View>
          </ScalePressable>

          <View style={styles.menuContainer}>
            <Animated.View style={{ transform: [{ scale: menuScale }] }}>
              <Pressable
                style={styles.moreButton}
                onPress={handleMenuPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
              </Pressable>
            </Animated.View>
            {showMenu ? menuContent : null}
          </View>
        </View>

        {/* Meta + teacher verified + Follow on the second line */}
        <View style={styles.metaRow}>
          <ScalePressable pressScale={0.98} pressOpacity={false} onPress={onUserPress} style={styles.metaLeft}>
            <Text style={styles.timeText}>{formatRelativeTime(createdAt, t)}</Text>
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

            {teacherVerified ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <TeacherVerifiedBadge />
              </>
            ) : null}

            {!!learningMeta?.studyGroupName && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <View style={styles.studyGroupTag}>
                  <Ionicons name="people" size={10} color="#8B5CF6" />
                  <Text style={styles.studyGroupText}>{learningMeta.studyGroupName}</Text>
                </View>
              </>
            )}
          </ScalePressable>

          {!isCurrentUser && (
            <>
              <Text style={styles.metaDot}>•</Text>
              <ScalePressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onFollow();
                }}
                disabled={followLoading}
                pressScale={0.94}
                style={styles.followBtnWrap}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                {followLoading ? (
                  <ActivityIndicator size={11} color="#0EA5E9" />
                ) : isFollowing ? (
                  <Text style={styles.followBtnTextFollowing}>{t('common.following')}</Text>
                ) : (
                  <Text style={styles.followBtnText}>{t('common.follow')}</Text>
                )}
              </ScalePressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = (
  colors: any,
  isDark: boolean,
  preferKhmer: boolean,
  nameHasKhmer: boolean,
) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    position: 'relative',
    zIndex: 50,
    overflow: 'visible',
    gap: 12,
  },
  authorInfo: {
    flex: 1,
    minWidth: 0,
    overflow: 'visible',
  },
  nameActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    overflow: 'visible',
    // Keep room for Koulen ascenders without inflating the gap to meta.
    minHeight: nameHasKhmer ? 24 : 20,
  },
  nameBadges: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
    overflow: 'visible',
    justifyContent: 'center',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    overflow: 'visible',
  },
  authorName: {
    ...feedTextStyle('name', { preferKhmer: nameHasKhmer, color: colors.text }),
    fontWeight: '700',
    flexShrink: 1,
    overflow: 'visible',
    // Padding only on top — bottom padding was opening a large gap above meta.
    // Koulen's line box already has unused descent below the glyph mass.
    ...(nameHasKhmer
      ? {
          paddingTop: Platform.OS === 'ios' ? 3 : 2,
          paddingBottom: 0,
          transform: [{ translateY: 1 }],
        }
      : null),
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
    paddingHorizontal: 2,
    paddingVertical: 1,
    gap: 3,
    marginLeft: 4,
  },
  roleBadgeText: {
    ...feedTextStyle('chip', { preferKhmer }),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    // Pull meta up into Koulen's unused descent so name→date feels tight.
    marginTop: nameHasKhmer ? -4 : 1,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  timeText: {
    ...feedTextStyle('meta', { preferKhmer, color: colors.textTertiary }),
  },
  metaDot: {
    ...feedTextStyle('meta', { preferKhmer, color: colors.textTertiary }),
    marginHorizontal: 6,
  },
  visibilityIndicator: {
    marginLeft: 2,
  },
  studyGroupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: isDark ? colors.surfaceVariant : '#F0FDFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  studyGroupText: {
    ...feedTextStyle('chip', { preferKhmer, color: '#0D9488' }),
    fontWeight: '500',
  },
  followBtnWrap: {
    paddingVertical: 1,
    flexShrink: 0,
  },
  followBtnText: {
    ...feedTextStyle('meta', { preferKhmer, color: '#0EA5E9' }),
    fontWeight: '700',
  },
  followBtnTextFollowing: {
    ...feedTextStyle('meta', { preferKhmer, color: colors.textTertiary }),
    fontWeight: '500',
  },
  menuContainer: {
    position: 'relative',
    zIndex: 1000,
    overflow: 'visible',
    flexShrink: 0,
    justifyContent: 'center',
  },
  moreButton: {
    padding: 4,
    marginRight: -4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(PostHeader);
