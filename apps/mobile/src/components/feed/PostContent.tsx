import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ImageCarousel } from '@/components/common';
import { PollVoting } from './PollVoting';
import { ClubAnnouncement, DeadlineBanner, QuizSection } from './PostCardSections';
import { formatNumber, formatRelativeTime } from '@/utils';

const { width } = Dimensions.get('window');

// Placeholder for missing types, adjust based on actual types
interface PostContentProps {
  post: any; // Replace with proper Post type
  onPress: () => void;
  onImagePress: (index: number) => void;
  onVote?: (optionId: string) => void;
  navigate?: (screen: string, params: any) => void;
  typeConfig: any; // Replace with proper type
  learningMeta?: any; // Replace with proper type
  deadlineInfo?: any; // Replace with proper type
  DIFFICULTY_CONFIG: any; // Pass this config
}

const PostContent = ({
  post,
  onPress,
  onImagePress,
  onVote,
  navigate,
  typeConfig,
  learningMeta,
  deadlineInfo,
  DIFFICULTY_CONFIG,
}: PostContentProps) => {

  const isQuestion = post.postType === 'QUESTION';
  const showProgress = (post.postType === 'COURSE' || post.postType === 'QUIZ') && learningMeta?.progress !== undefined;

  // Quiz Gradient logic - simplified or passed down
  // Assuming quizGradient is handled inside QuizSection or passed if needed
  // If QuizSection needs it, we might need to calculate it here or accept it as prop.
  // For now, I'll use the default logic seen in PostCard or pass it if expensive.
  // In PostCard it was useMemo.

  return (
    <View>
      {/* Deadline Alert Banner */}
      {deadlineInfo && (
        <DeadlineBanner deadlineInfo={deadlineInfo} />
      )}

      {/* Club Announcement Banner */}
      {post.postType === 'CLUB_ANNOUNCEMENT' && (
        <ClubAnnouncement typeConfig={typeConfig} onPress={onPress} />
      )}

      {/* Media - Full Width */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <View style={styles.mediaWrapper}>
          <ImageCarousel
            images={post.mediaUrls}
            onImagePress={onImagePress}
            borderRadius={0}
            mode="auto"
          />
          {/* Rich content indicators */}
          {(learningMeta?.hasCode || learningMeta?.hasPdf || learningMeta?.hasFormula) && (
            <View style={styles.richContentIndicators}>
              {learningMeta.hasCode && (
                <View style={styles.richContentBadge}>
                  <Ionicons name="code-slash" size={12} color="#fff" />
                </View>
              )}
              {learningMeta.hasPdf && (
                <View style={styles.richContentBadge}>
                  <Ionicons name="document-text" size={12} color="#fff" />
                </View>
              )}
              {learningMeta.hasFormula && (
                <View style={styles.richContentBadge}>
                  <Text style={styles.formulaIcon}>∑</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Content Text */}
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.contentSection}>
        <Text style={styles.contentText} numberOfLines={4}>
          {post.content}
        </Text>
      </TouchableOpacity>

      {/* Embedded Repost Card */}
      {!!post.repostOfId && !!post.repostOf && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigate?.('PostDetail', { postId: post.repostOf!.id })}
          style={styles.repostEmbed}
        >
          <View style={styles.repostEmbedHeader}>
            {post.repostOf.author?.profilePictureUrl ? (
              <Image
                source={{ uri: post.repostOf.author.profilePictureUrl }}
                style={styles.repostEmbedAvatar}
              />
            ) : (
              <View style={[styles.repostEmbedAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={14} color="#9CA3AF" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.repostEmbedAuthor} numberOfLines={1}>
                {post.repostOf.author ? `${post.repostOf.author.firstName} ${post.repostOf.author.lastName}` : 'Unknown'}
              </Text>
              <Text style={styles.repostEmbedTime}>{formatRelativeTime(post.repostOf.createdAt)}</Text>
            </View>
          </View>
          {!!post.repostOf.title && (
            <Text style={styles.repostEmbedTitle} numberOfLines={1}>{post.repostOf.title}</Text>
          )}
          <Text style={styles.repostEmbedContent} numberOfLines={3}>{post.repostOf.content}</Text>
          {post.repostOf.mediaUrls && post.repostOf.mediaUrls.length > 0 && (
            <Image
              source={{ uri: post.repostOf.mediaUrls[0] }}
              style={styles.repostEmbedMedia}
              contentFit="cover"
            />
          )}
          <View style={styles.repostEmbedStats}>
            <Ionicons name="heart" size={12} color="#9CA3AF" />
            <Text style={styles.repostEmbedStatText}>{formatNumber(post.repostOf.likesCount || 0)}</Text>
            <Ionicons name="chatbubble" size={12} color="#9CA3AF" style={{ marginLeft: 8 }} />
            <Text style={styles.repostEmbedStatText}>{formatNumber(post.repostOf.commentsCount || 0)}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Poll Voting */}
      {post.postType === 'POLL' && post.pollOptions && post.pollOptions.length > 0 && (
        <View style={styles.pollSection}>
          <PollVoting
            options={post.pollOptions}
            userVotedOptionId={post.userVotedOptionId}
            onVote={onVote || (() => { })}
            endsAt={post.learningMeta?.deadline}
          />
        </View>
      )}

      {/* Quiz Card */}
      {post.postType === 'QUIZ' && post.quizData && (
        <QuizSection
          quizData={post.quizData}
          postTitle={post.title}
          postContent={post.content}
          postId={post.id}
          // Default colors if not passed
          quizThemeColor={'#EC4899'}
          quizGradient={['#EC4899', '#DB2777']}
        />
      )}

      {/* Topic Tags */}
      {post.topicTags && post.topicTags.length > 0 && (
        <View style={styles.topicTagsContainer}>
          {post.topicTags.slice(0, 4).map((tag: string, index: number) => (
            <TouchableOpacity key={index} style={styles.topicTag}>
              <Text style={styles.topicTagText}>#{tag}</Text>
            </TouchableOpacity>
          ))}
          {post.topicTags.length > 4 && (
            <Text style={styles.moreTagsText}>+{post.topicTags.length - 4}</Text>
          )}
        </View>
      )}

      {/* Q&A Section */}
      {isQuestion && (
        <View style={styles.qaSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.qaBadge, learningMeta?.isAnswered && styles.qaBadgeAnswered]}>
              <Ionicons
                name={learningMeta?.isAnswered ? 'checkmark-circle' : 'help-circle'}
                size={16}
                color={learningMeta?.isAnswered ? '#10B981' : '#0EA5E9'}
              />
              <Text style={[styles.qaBadgeText, learningMeta?.isAnswered && styles.qaBadgeTextAnswered]}>
                {learningMeta?.isAnswered ? 'Answered' : 'Awaiting Answer'}
              </Text>
            </View>

            {/* Bounty Badge */}
            {post.questionBounty ? (
              <View style={styles.bountyBadge}>
                <Ionicons name="diamond" size={14} color="#8B5CF6" />
                <Text style={styles.bountyBadgeText}>{post.questionBounty} Bounty</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.answerCount}>
            <Ionicons name="chatbubbles-outline" size={14} color="#6B7280" />
            <Text style={styles.answerCountText}>
              {learningMeta?.answerCount || 0} {(learningMeta?.answerCount || 0) === 1 ? 'answer' : 'answers'}
            </Text>
          </View>
        </View>
      )}

      {/* Progress Bar */}
      {showProgress && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercent}>{learningMeta?.progress || 0}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${learningMeta?.progress || 0}%`, backgroundColor: typeConfig.color }]}
            />
          </View>
          {learningMeta?.completedSteps !== undefined && learningMeta?.totalSteps && (
            <Text style={styles.progressSteps}>
              {learningMeta.completedSteps}/{learningMeta.totalSteps} steps completed
            </Text>
          )}
        </View>
      )}

      {/* Generic CTA Button (Courses, Projects, Events, Assignments) */}
      {!post.quizData && post.postType !== 'POLL' && post.postType !== 'QUESTION' && post.postType !== 'CLUB_ANNOUNCEMENT' && !!typeConfig.ctaLabel && (
        <View style={styles.genericCtaContainer}>
          <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
            <View style={[styles.genericCtaButton, { backgroundColor: typeConfig.color + '15' }]}>
              <Text style={[styles.genericCtaText, { color: typeConfig.color }]}>
                {typeConfig.ctaLabel}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={typeConfig.color} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Learning Info Bar */}
      <View style={styles.learningBar}>
        <View style={[styles.typeChip, { backgroundColor: typeConfig.color }]}>
          <Ionicons name={typeConfig.icon as any} size={13} color="#FFFFFF" />
          <Text style={styles.typeChipText}>{typeConfig.label}</Text>
        </View>

        {learningMeta?.difficulty && DIFFICULTY_CONFIG[learningMeta.difficulty] && (
          <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_CONFIG[learningMeta.difficulty].bgColor }]}>
            <Ionicons
              name={DIFFICULTY_CONFIG[learningMeta.difficulty].icon as any}
              size={12}
              color={DIFFICULTY_CONFIG[learningMeta.difficulty].color}
            />
            <Text style={[styles.difficultyText, { color: DIFFICULTY_CONFIG[learningMeta.difficulty].color }]}>
              {DIFFICULTY_CONFIG[learningMeta.difficulty].label}
            </Text>
          </View>
        )}

        {/* Academic Match Badge */}
        {post._scoreBreakdown?.academicRelevance > 0.5 && (
          <View style={[styles.difficultyBadge, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="school" size={12} color="#16A34A" />
            <Text style={[styles.difficultyText, { color: '#16A34A' }]}>Academic Match</Text>
          </View>
        )}

        <View style={styles.inlineMetrics}>
          {learningMeta?.xpReward != null && (
            <View style={styles.inlineMetric}>
              <Ionicons name="flash" size={13} color="#0EA5E9" />
              <Text style={styles.inlineMetricText}>+{learningMeta.xpReward} XP</Text>
            </View>
          )}
          <View style={styles.inlineMetric}>
            <Ionicons name="stats-chart" size={13} color="#0D9488" />
            <Text style={styles.inlineMetricText}>{formatNumber(post.likes + post.comments)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mediaWrapper: {
    width: '100%',
    marginBottom: 8,
    position: 'relative',
  },
  richContentIndicators: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  richContentBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formulaIcon: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
  },
  repostEmbed: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  repostEmbedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  repostEmbedAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  repostEmbedAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  repostEmbedTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  repostEmbedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  repostEmbedContent: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  repostEmbedMedia: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#E5E7EB',
  },
  repostEmbedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  repostEmbedStatText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  pollSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  topicTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  topicTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topicTagText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#9CA3AF',
    alignSelf: 'center',
  },
  qaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F0F9FF',
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  qaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qaBadgeAnswered: {
    backgroundColor: '#D1FAE5',
  },
  qaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0C4A6E',
  },
  qaBadgeTextAnswered: {
    color: '#065F46',
  },
  bountyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  bountyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D28D9',
  },
  answerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  answerCountText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  progressSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSteps: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  genericCtaContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  genericCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 50,
    gap: 8,
  },
  genericCtaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  learningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  inlineMetrics: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  inlineMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  inlineMetricText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default memo(PostContent);
