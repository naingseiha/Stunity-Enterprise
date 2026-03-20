import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Club } from '@/api/clubs';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CLUB_TYPE_META: Record<
  Club['type'],
  { label: string; icon: keyof typeof Ionicons.glyphMap; accent: string; soft: string }
> = {
  CASUAL_STUDY_GROUP: { label: 'Study Group', icon: 'people',  accent: '#8B5CF6', soft: '#F3E8FF' }, // Purple
  STRUCTURED_CLASS:   { label: 'Class',       icon: 'school',  accent: '#06A8CC', soft: '#E0F9FD' }, // Brand Teal
  PROJECT_GROUP:      { label: 'Project',     icon: 'rocket',  accent: '#F59E0B', soft: '#FEF3C7' }, // Amber
  EXAM_PREP:          { label: 'Exam Prep',   icon: 'book',    accent: '#6366F1', soft: '#E0E7FF' }, // Indigo
};

const COLORS = {
  primary:       '#09CFF7', // Bright Cyan
  primaryDark:   '#06A8CC', // Deep Cyan
  border:        '#E2E8F0',
  textSecondary: '#475569',
};

interface ClubCardProps {
  item: Club;
  isJoined: boolean;
  isBusy: boolean;
  onPress: (clubId: string) => void;
  onToggleMembership: (clubId: string) => void;
}

export const ClubCard = React.memo(function ClubCard({
  item,
  isJoined,
  isBusy,
  onPress,
  onToggleMembership,
}: ClubCardProps) {
  const typeMeta = CLUB_TYPE_META[item.type] || CLUB_TYPE_META.CASUAL_STUDY_GROUP;
  const memberCount = item.memberCount || 0;
  
  // Use real avatars if joined and we have member info (simulated here with colors)
  // In a real app, we'd have a list of member avatars
  const avatarColors = ['#0D9488', '#4B7BEC', '#F59E0B', '#F43F5E'];
  const visibleAvatars = avatarColors.slice(0, Math.min(4, memberCount > 0 ? memberCount : 4));

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => { scale.value = withSpring(0.96, { damping: 15 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15 }); };

  return (
    <AnimatedPressable
      style={[styles.clubCard, animatedStyle]}
      onPress={() => onPress(item.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <LinearGradient
        colors={[`${typeMeta.accent}15`, `${typeMeta.accent}00`]}
        style={styles.abstractShape}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {/* Card Header: icon chip + title + view button */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardHeaderIcon, { backgroundColor: typeMeta.soft }]}>
          <Ionicons name={typeMeta.icon} size={18} color={typeMeta.accent} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => onPress(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.viewAllText}>View</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Description */}
      <Text style={styles.cardDescription} numberOfLines={2}>
        {item.description || `${typeMeta.label} · Join to explore topics and connect with peers.`}
      </Text>

      {/* Member avatars row + member count */}
      <View style={styles.cardMembersRow}>
        <View style={styles.avatarStack}>
          {visibleAvatars.map((c, i) => (
            <View
              key={i}
              style={[styles.avatarCircle, { backgroundColor: c, marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }]}
            >
              {/* If we had real member avatars, we'd use <Image /> here */}
              <Ionicons name="person" size={10} color="#FFF" />
            </View>
          ))}
          <Text style={styles.memberCountText}>
            {memberCount > 0 ? `+${memberCount}` : 'Be first!'}
          </Text>
        </View>

        {/* Join / Joined */}
        <TouchableOpacity
          onPress={() => onToggleMembership(item.id)}
          disabled={isBusy}
          activeOpacity={0.85}
        >
          {isJoined ? (
            <View style={[styles.joinPill, styles.joinPillJoined]}>
              {isBusy ? (
                <ActivityIndicator size="small" color={COLORS.primaryDark} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.primaryDark} />
                  <Text style={styles.joinPillTextJoined}>Joined</Text>
                </>
              )}
            </View>
          ) : (
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinPill}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.joinPillText}>Join Now →</Text>
              )}
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.cardProgressTrack}>
        <View
          style={[
            styles.cardProgressFill,
            { width: `${Math.min(100, Math.max(5, memberCount * 2))}%`, backgroundColor: typeMeta.accent },
          ]}
        />
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  clubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  abstractShape: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    zIndex: -1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  cardMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCountText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  joinPill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  joinPillJoined: {
    backgroundColor: '#E0F9FD',
    borderWidth: 1,
    borderColor: '#06A8CC',
  },
  joinPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  joinPillTextJoined: {
    fontSize: 13,
    fontWeight: '800',
    color: '#06A8CC',
  },
  cardProgressTrack: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
