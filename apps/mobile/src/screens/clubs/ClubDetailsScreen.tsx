/**
 * Club Details Screen
 * 
 * Beautiful, modern club details with members, stats, and actions
 * Matches the redesigned club card style
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Avatar } from '@/components/common';
import { Colors } from '@/config';
import { clubsApi, Club, ClubMember } from '@/api';
import { useAuthStore } from '@/stores';

const { width } = Dimensions.get('window');

const CLUB_TYPE_CONFIG: Record<string, {
  icon: string;
  color: string;
  lightColor: string;
  lightColorEnd: string;
  label: string;
}> = {
  CASUAL_STUDY_GROUP: {
    icon: 'people',
    color: '#2563EB',
    lightColor: '#DBEAFE',
    lightColorEnd: '#BFDBFE',
    label: 'Study Group'
  },
  STRUCTURED_CLASS: {
    icon: 'school',
    color: '#059669',
    lightColor: '#D1FAE5',
    lightColorEnd: '#A7F3D0',
    label: 'Class'
  },
  PROJECT_GROUP: {
    icon: 'rocket',
    color: '#DC2626',
    lightColor: '#FEE2E2',
    lightColorEnd: '#FECACA',
    label: 'Project'
  },
  EXAM_PREP: {
    icon: 'book',
    color: '#7C3AED',
    lightColor: '#EDE9FE',
    lightColorEnd: '#DDD6FE',
    label: 'Exam Prep'
  },
};

export default function ClubDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { clubId } = route.params as { clubId: string };
  const { user } = useAuthStore();

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningLoading, setJoiningLoading] = useState(false);

  const isJoined = members?.some(m => m.userId === user?.id && m.isActive) || false;
  const userMembership = members?.find(m => m.userId === user?.id && m.isActive);
  const isOwner = userMembership?.role === 'OWNER' || club?.creatorId === user?.id;

  // Fetch club details
  const fetchClubDetails = useCallback(async () => {
    try {
      setError(null);
      const [clubData, membersData] = await Promise.all([
        clubsApi.getClubById(clubId),
        clubsApi.getClubMembers(clubId),
      ]);

      setClub(clubData);
      setMembers(membersData || []);
    } catch (err: any) {
      console.error('Failed to fetch club details:', err);
      setError(err.message || 'Failed to load club details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClubDetails();
  }, [fetchClubDetails]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClubDetails();
  }, [fetchClubDetails]);

  // Join/Leave club
  const handleToggleMembership = useCallback(async () => {
    if (!club) return;

    try {
      setJoiningLoading(true);

      if (isJoined) {
        Alert.alert(
          'Leave Club',
          `Are you sure you want to leave ${club.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: async () => {
                await clubsApi.leaveClub(clubId);
                await fetchClubDetails();
              },
            },
          ]
        );
      } else {
        await clubsApi.joinClub(clubId);
        await fetchClubDetails();
        Alert.alert('Success', `You've joined ${club.name}!`);
      }
    } catch (err: any) {
      console.error('Failed to toggle membership:', err);
      Alert.alert('Error', err.message || 'Failed to update membership');
    } finally {
      setJoiningLoading(false);
    }
  }, [club, clubId, isJoined, fetchClubDetails]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Club Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !club) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Club Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Club not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchClubDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const typeConfig = CLUB_TYPE_CONFIG[club.type] || CLUB_TYPE_CONFIG.CASUAL_STUDY_GROUP;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Club Details</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Cover with Type Badge */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.coverContainer}>
          <LinearGradient
            colors={[typeConfig.lightColor, typeConfig.lightColorEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cover}
          >
            <Ionicons name={typeConfig.icon as any} size={64} color={typeConfig.color} />
          </LinearGradient>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color }]}>
            <Ionicons name={typeConfig.icon as any} size={14} color="#fff" />
            <Text style={styles.typeBadgeText}>{typeConfig.label}</Text>
          </View>
        </Animated.View>

        {/* Club Info Card */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.infoCard}>
          {/* Club Name */}
          <Text style={styles.clubName}>{club.name}</Text>

          {/* Creator */}
          {club.creator && (
            <View style={styles.creatorRow}>
              <Text style={styles.creatorLabel}>by </Text>
              <Avatar
                uri={club.creator.profilePictureUrl}
                name={`${club.creator.firstName} ${club.creator.lastName}`}
                size="xs"
                variant="post"
              />
              <Text style={styles.creatorName}>
                {club.creator.firstName} {club.creator.lastName}
              </Text>
            </View>
          )}

          {/* Tags */}
          {club.tags && club.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {club.tags.map((tag, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: typeConfig.color + '15' }]}>
                  <Text style={[styles.tagText, { color: typeConfig.color }]}>
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="people" size={18} color="#6B7280" />
              <Text style={styles.statText}>{club.memberCount || members?.length || 0} members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Ionicons
                name={club.mode === 'PUBLIC' ? 'globe-outline' : club.mode === 'INVITE_ONLY' ? 'lock-closed' : 'checkmark-circle'}
                size={18}
                color="#6B7280"
              />
              <Text style={styles.statText}>
                {club.mode === 'PUBLIC' ? 'Public' : club.mode === 'INVITE_ONLY' ? 'Invite Only' : 'Approval'}
              </Text>
            </View>
          </View>

          {/* Join/Leave Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              isJoined && [styles.actionButtonJoined, { borderColor: typeConfig.color }]
            ]}
            onPress={handleToggleMembership}
            disabled={joiningLoading}
            activeOpacity={0.7}
          >
            {joiningLoading ? (
              <ActivityIndicator size="small" color={isJoined ? typeConfig.color : '#fff'} />
            ) : (
              <>
                <LinearGradient
                  colors={isJoined ? ['#fff', '#fff'] : [typeConfig.color, typeConfig.color + 'DD']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons
                    name={isJoined ? 'checkmark' : 'add'}
                    size={20}
                    color={isJoined ? typeConfig.color : '#fff'}
                  />
                  <Text style={[styles.actionButtonText, isJoined && { color: typeConfig.color }]}>
                    {isJoined ? 'Joined' : 'Join Club'}
                  </Text>
                </LinearGradient>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* About Section */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>{club.description}</Text>
        </Animated.View>

        {/* Members Section */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members ({members?.length || 0})</Text>
            {(members?.length || 0) > 6 && (
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.membersGrid}>
            {members?.slice(0, 6).map((member, index) => (
              <View key={member.id} style={styles.memberItem}>
                <Avatar
                  uri={member.user.profilePictureUrl}
                  name={`${member.user.firstName} ${member.user.lastName}`}
                  size="lg"
                  variant="post"
                />
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.user.firstName}
                </Text>
                {member.role === 'OWNER' && (
                  <View style={[styles.roleBadge, { backgroundColor: typeConfig.color }]}>
                    <Text style={styles.roleBadgeText}>Owner</Text>
                  </View>
                )}
                {member.role === 'INSTRUCTOR' && (
                  <View style={[styles.roleBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.roleBadgeText}>Instructor</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -40,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  clubName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 32,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  creatorLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonJoined: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  memberItem: {
    width: (width - 32 - 40 - 32) / 3,
    alignItems: 'center',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  roleBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
