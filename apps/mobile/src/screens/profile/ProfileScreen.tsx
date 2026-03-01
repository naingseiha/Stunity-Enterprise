/**
 * Profile Screen — Premium Enterprise Design
 * 
 * Beautiful, modern profile with Instagram/SchoolApp inspired design
 * Features: Cover photo, avatar, stats, performance highlights, tabs
 * Compact edit button, settings icon, soft purple background
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
  FadeInDown,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';

import { Avatar, Button } from '@/components/common';
import { Skeleton } from '@/components/common/Loading';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useAuthStore } from '@/stores';
import { User, UserStats, Education, Experience, Certification } from '@/types';
import { formatNumber } from '@/utils';
import { ProfileStackScreenProps } from '@/navigation/types';
import * as Location from 'expo-location';
import { attendanceService } from '@/services/attendance';
import { fetchProfile as apiFetchProfile, fetchEducation, fetchExperiences, fetchCertifications, followUser, unfollowUser, uploadProfilePhoto, uploadCoverPhoto } from '@/api/profileApi';
import { statsAPI, type UserStats as QuizUserStats, type Streak, type UserAchievement, type Achievement } from '@/services/stats';
import { PerformanceTab, ActivityTab, CertificationsSection, SkillsSection, ProfileCompletenessCard, CareerGoalsCard, ProjectShowcase, LinkSchoolCard } from './components';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = 200;

type RouteProp = ProfileStackScreenProps<'Profile'>['route'];
type NavigationProp = ProfileStackScreenProps<'Profile'>['navigation'];

// Premium Stat card config with subtle gradients and glassmorphism hints
export const STAT_CARDS = [
  { icon: 'book-outline' as const, bgStart: '#F0F9FF', bgEnd: '#E0F2FE', accent: '#0EA5E9', tint: '#0C4A6E' },
  { icon: 'star-outline' as const, bgStart: '#FFF7ED', bgEnd: '#FFEDD5', accent: '#F59E0B', tint: '#92400E' },
  { icon: 'time-outline' as const, bgStart: '#F0FDF4', bgEnd: '#DCFCE7', accent: '#10B981', tint: '#065F46' },
  { icon: 'flame-outline' as const, bgStart: '#FFF1F2', bgEnd: '#FFE4E6', accent: '#F43F5E', tint: '#9F1239' },
  { icon: 'trophy-outline' as const, bgStart: '#FAF5FF', bgEnd: '#F3E8FF', accent: '#8B5CF6', tint: '#5B21B6' },
  { icon: 'code-slash-outline' as const, bgStart: '#EFF6FF', bgEnd: '#DBEAFE', accent: '#3B82F6', tint: '#1E3A8A' },
];

export function StatCard({ icon, value, label, index = 0 }: { icon: string; value: string | number; label: string; index?: number }) {
  const cfg = STAT_CARDS[index % STAT_CARDS.length];
  const scale = useSharedValue(0.92);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const d = 200 + index * 50;
    scale.value = withDelay(d, withSpring(1, { damping: 16, stiffness: 140 }));
    translateY.value = withDelay(d, withSpring(0, { damping: 16, stiffness: 140 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.statGridCardWrapper, animStyle]}>
      <LinearGradient
        colors={[cfg.bgStart, cfg.bgEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statGridCard}
      >
        <View style={[styles.statGridIcon, { backgroundColor: cfg.accent }]}>
          <Ionicons name={icon as any} size={18} color="#fff" />
        </View>
        <Text style={[styles.statGridValue, { color: cfg.tint }]}>{value}</Text>
        <Text style={[styles.statGridLabel, { color: cfg.tint, opacity: 0.8 }]}>{label}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { user: currentUser } = useAuthStore();

  const userId = route.params?.userId;
  const isOwnProfile = !userId || userId === currentUser?.id;
  const { updateUser } = useAuthStore();

  const [profile, setProfile] = useState<User | null>(isOwnProfile ? currentUser : null);
  const [profileStats, setProfileStats] = useState<UserStats | null>(null);
  const [education, setEducation] = useState<Education[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [quizStats, setQuizStats] = useState<QuizUserStats | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'performance' | 'about' | 'activity'>('performance');

  // Fetch profile on mount and when userId changes
  useEffect(() => {
    loadProfile();
  }, [userId, isOwnProfile]);



  const loadProfile = async () => {
    if (!refreshing) setLoading(true);
    try {
      const targetId = isOwnProfile ? 'me' : userId!;
      const resolvedUserId = isOwnProfile ? (currentUser?.id || 'me') : userId!;

      // Fetch profile + education + experiences + certifications in parallel
      const [profileData, eduData, expData, certData] = await Promise.all([
        apiFetchProfile(targetId),
        fetchEducation(targetId),
        fetchExperiences(targetId),
        fetchCertifications(targetId).catch(() => []),
      ]);

      setProfile(profileData as any);
      setProfileStats(profileData.stats);
      setIsFollowing(profileData.isFollowing || false);
      setEducation(eduData || []);
      setExperiences(expData || []);
      setCertifications(certData || []);

      // Fetch analytics data (non-blocking — graceful fallback)
      Promise.all([
        statsAPI.getUserStats(resolvedUserId).catch(() => null),
        statsAPI.getStreak(resolvedUserId).catch(() => null),
        statsAPI.getUserAchievements(resolvedUserId).catch(() => []),
        statsAPI.getAchievements().catch(() => []),
      ]).then(([qStats, streakData, uAch, allAch]) => {
        if (qStats) setQuizStats(qStats);
        if (streakData) setStreak(streakData);
        setUserAchievements(uAch || []);
        setAllAchievements(allAch || []);
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fallback to auth store user for own profile
      if (isOwnProfile && currentUser) {
        setProfile(currentUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [userId, isOwnProfile]);

  const handleFollow = useCallback(async () => {
    if (!userId) return;
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
        setProfileStats(prev => prev ? { ...prev, followers: prev.followers - 1 } : prev);
      } else {
        await followUser(userId);
        setIsFollowing(true);
        setProfileStats(prev => prev ? { ...prev, followers: prev.followers + 1 } : prev);
      }
    } catch (error) {
      console.error('Follow/unfollow failed:', error);
    }
  }, [isFollowing, userId]);

  const handleEditProfile = useCallback(() => {
    navigation.navigate('EditProfile' as any);
  }, [navigation]);

  // ── Photo Upload Handlers ───────────────────────────────────

  const handlePickProfilePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      try {
        const fileName = asset.uri.split('/').pop() || 'profile.jpg';
        const data = await uploadProfilePhoto(asset.uri, fileName, asset.mimeType || 'image/jpeg');
        updateUser({ profilePictureUrl: data.profilePictureUrl });
        setProfile(prev => prev ? { ...prev, profilePictureUrl: data.profilePictureUrl } : prev);
      } catch (e) {
        console.error('Profile photo upload failed:', e);
      }
    }
  }, [updateUser]);

  const handlePickCoverPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      try {
        const fileName = asset.uri.split('/').pop() || 'cover.jpg';
        const data = await uploadCoverPhoto(asset.uri, fileName, asset.mimeType || 'image/jpeg');
        updateUser({ coverPhotoUrl: data.coverPhotoUrl } as any);
        setProfile(prev => prev ? { ...prev, coverPhotoUrl: data.coverPhotoUrl } : prev);
      } catch (e) {
        console.error('Cover photo upload failed:', e);
      }
    }
  }, [updateUser]);

  // ── Shimmer Loading State — matches actual profile layout ──────
  if (loading || !profile) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {/* Cover shimmer */}
        <LinearGradient
          colors={['#BAE6FD', '#E0F2FE', '#F0F9FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: COVER_HEIGHT }}
        />

        <View style={{ flex: 1, marginTop: -90, alignItems: 'center' }}>
          <Animated.View entering={FadeIn.duration(400)} style={{ width: '100%', alignItems: 'center' }}>
            {/* Avatar */}
            <Skeleton width={100} height={100} borderRadius={50} />

            {/* Name + headline + level badge */}
            <View style={{ alignItems: 'center', marginTop: 12, gap: 8 }}>
              <Skeleton width={180} height={22} borderRadius={11} />
              <Skeleton width={80} height={24} borderRadius={12} />
              <Skeleton width={140} height={14} borderRadius={7} />
            </View>

            {/* Stats row — 3 cards */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, paddingHorizontal: 16, width: '100%' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Skeleton width="100%" height={90} borderRadius={18} />
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Skeleton width="100%" height={90} borderRadius={18} />
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Skeleton width="100%" height={90} borderRadius={18} />
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Skeleton width={80} height={36} borderRadius={18} />
              <Skeleton width={36} height={36} borderRadius={18} />
              <Skeleton width={36} height={36} borderRadius={18} />
            </View>

            {/* Hero performance card */}
            <View style={{ width: '100%', paddingHorizontal: 16, marginTop: 20 }}>
              <Skeleton width="100%" height={120} borderRadius={20} />
            </View>

            {/* Stat grid 2x3 */}
            <View style={{ width: '100%', paddingHorizontal: 16, marginTop: 12, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Skeleton width="48%" height={80} borderRadius={16} />
                <Skeleton width="48%" height={80} borderRadius={16} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Skeleton width="48%" height={80} borderRadius={16} />
                <Skeleton width="48%" height={80} borderRadius={16} />
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const stats = {
    posts: profileStats?.posts ?? 0,
    followers: profileStats?.followers ?? 0,
    following: profileStats?.following ?? 0,
  };

  const tabs = [
    { id: 'performance', label: 'Performance', icon: 'trending-up' },
    { id: 'about', label: 'About', icon: 'person' },
    { id: 'activity', label: 'Activity', icon: 'flame' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlashList
        data={[{ key: 'tabContent', type: activeTab }]}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        // @ts-ignore ignore type error with flash list sizes
        estimatedItemSize={1000}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Cover Photo Section */}
            <View style={styles.coverSection}>
              {(profile as any)?.coverPhotoUrl ? (
                <Image source={{ uri: (profile as any).coverPhotoUrl }} style={styles.coverGradient} />
              ) : (
                <LinearGradient
                  colors={['#0EA5E9', '#6366F1', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coverGradient}
                >
                  {/* Decorative overlay circles for depth */}
                  <View style={[styles.coverDecorCircle, { width: 200, height: 200, top: -60, left: -40, opacity: 0.12 }]} />
                  <View style={[styles.coverDecorCircle, { width: 140, height: 140, top: 20, right: -30, opacity: 0.1 }]} />
                  <View style={[styles.coverDecorCircle, { width: 80, height: 80, bottom: -20, left: '40%', opacity: 0.15 }]} />
                  {/* Subtle grid pattern suggestion via thin lines */}
                  <View style={styles.coverPatternOverlay} />
                </LinearGradient>
              )}

              {/* Header Buttons */}
              <SafeAreaView edges={['top']} style={styles.headerButtons}>
                <View style={styles.headerTopRow}>
                  {/* Back Button — only when viewing someone else's profile */}
                  {!isOwnProfile && (
                    <TouchableOpacity style={styles.headerCircleBtn} onPress={() => navigation.goBack()}>
                      <Ionicons name="chevron-back" size={22} color="#fff" />
                    </TouchableOpacity>
                  )}

                  <View style={{ flex: 1 }} />

                  {/* Settings, Messages & Camera — own profile only */}
                  {isOwnProfile && (
                    <>
                      {currentUser?.role === 'TEACHER' && (
                        <TouchableOpacity
                          style={[styles.headerCircleBtn, { marginRight: 8, backgroundColor: 'rgba(255,255,255,0.2)' }]}
                          onPress={() => navigation.navigate('AttendanceCheckIn' as any)}
                        >
                          <Ionicons name="finger-print" size={20} color="#fff" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.headerCircleBtn, { marginRight: 8 }]} onPress={() => navigation.navigate('QuizStudio' as any)}>
                        <Ionicons name="cube-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.headerCircleBtn} onPress={() => navigation.navigate('Messages' as any, { screen: 'Conversations' })}>
                        <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.headerCircleBtn, { marginLeft: 8 }]} onPress={() => navigation.navigate('Settings' as any)}>
                        <Ionicons name="settings-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.headerCircleBtn, { marginLeft: 8 }]} onPress={handlePickCoverPhoto}>
                        <Ionicons name="camera-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                    </>
                  )}

                  {/* More options — other user's profile */}
                  {!isOwnProfile && (
                    <TouchableOpacity style={styles.headerCircleBtn}>
                      <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </SafeAreaView>
            </View>

            {/* Profile Content */}
            <View style={styles.contentContainer}>
              {/* Avatar Section */}
              <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.avatarSection}>
                <View style={styles.avatarWrapper}>
                  <Avatar
                    uri={profile.profilePictureUrl}
                    name={fullName}
                    size="2xl"
                    gradientBorder="orange"
                    showBorder
                  />

                  {/* Edit Avatar Button */}
                  {isOwnProfile && (
                    <TouchableOpacity style={styles.editAvatarButton} onPress={handlePickProfilePhoto}>
                      <View style={styles.editAvatarCircle}>
                        <Ionicons name="camera-outline" size={16} color="#0EA5E9" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>

              {/* Name & Bio Section */}
              <Animated.View entering={FadeInDown.delay(200).duration(500).springify()} style={styles.nameSection}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{fullName}</Text>
                  {profile.isVerified && (
                    <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                  )}
                </View>

                {/* Role Badge — Teacher or Student */}
                {profile.role && (
                  <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.roleBadgeWrap}>
                    <LinearGradient
                      colors={profile.role === 'TEACHER' ? ['#6366F1', '#8B5CF6'] : ['#0EA5E9', '#0284C7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.roleBadgeGradient}
                    >
                      <Ionicons
                        name={profile.role === 'TEACHER' ? 'school' : 'person'}
                        size={12}
                        color="#fff"
                      />
                      <Text style={styles.roleBadgeText}>
                        {profile.role === 'TEACHER' ? 'Teacher' : 'Student'}
                      </Text>
                    </LinearGradient>
                  </Animated.View>
                )}

                {profile.headline ? (
                  <Text style={styles.headline}>{profile.headline || profile.professionalTitle}</Text>
                ) : null}

                {/* Open to Opportunities Banner */}
                {(profile as any).isOpenToOpportunities && (
                  <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.openToWorkBanner}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.openToWorkGradient}
                    >
                      <Ionicons name="briefcase" size={12} color="#fff" />
                      <Text style={styles.openToWorkText}>Open to Opportunities</Text>
                    </LinearGradient>
                  </Animated.View>
                )}

                {profile.bio ? (
                  <Text style={styles.bio}>{profile.bio}</Text>
                ) : null}

                {/* Social Links & Meta */}
                <View style={styles.socialRow}>
                  {profile.location && (
                    <View style={styles.socialBadge}>
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <Text style={styles.socialBadgeText}>{profile.location}</Text>
                    </View>
                  )}
                  {(profile as any).linkedinUrl && (
                    <TouchableOpacity style={styles.socialBadge} onPress={() => { const { Linking } = require('react-native'); Linking.openURL((profile as any).linkedinUrl); }}>
                      <Ionicons name="logo-linkedin" size={14} color="#0077B5" />
                      <Text style={[styles.socialBadgeText, { color: '#0077B5' }]}>LinkedIn</Text>
                    </TouchableOpacity>
                  )}
                  {(profile as any).githubUrl && (
                    <TouchableOpacity style={styles.socialBadge} onPress={() => { const { Linking } = require('react-native'); Linking.openURL((profile as any).githubUrl); }}>
                      <Ionicons name="logo-github" size={14} color="#1a1a1a" />
                      <Text style={styles.socialBadgeText}>GitHub</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>

              {/* Instagram-style Header Stats */}
              <Animated.View entering={FadeInDown.delay(250).duration(400).springify()} style={styles.textStatsRow}>
                <TouchableOpacity style={styles.textStat} activeOpacity={0.6}>
                  <Text style={styles.textStatValue}>{formatNumber(stats.posts)}</Text>
                  <Text style={styles.textStatLabel}>Posts</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.textStat} activeOpacity={0.6}>
                  <Text style={styles.textStatValue}>{formatNumber(stats.followers)}</Text>
                  <Text style={styles.textStatLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.textStat} activeOpacity={0.6}>
                  <Text style={styles.textStatValue}>{formatNumber(stats.following)}</Text>
                  <Text style={styles.textStatLabel}>Following</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Action Buttons */}
              <Animated.View entering={FadeInDown.delay(300).duration(400).springify()} style={styles.capsuleRow}>
                {isOwnProfile ? (
                  // Own profile: prominent Edit Profile button
                  <TouchableOpacity
                    style={styles.capsuleBtnFilled}
                    onPress={handleEditProfile}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.capsuleBtnFilledText}>Edit Profile</Text>
                  </TouchableOpacity>
                ) : (
                  // Other user's profile: Follow + Message
                  <>
                    <TouchableOpacity
                      style={isFollowing ? styles.capsuleBtn : styles.capsuleBtnFilled}
                      onPress={handleFollow}
                      activeOpacity={0.8}
                    >
                      <Text style={isFollowing ? styles.capsuleBtnText : styles.capsuleBtnFilledText}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.capsuleBtn} activeOpacity={0.8}>
                      <Text style={styles.capsuleBtnText}>Message</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Animated.View>

              {/* Tabs */}
              <View style={styles.tabsSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabsScroll}
                >
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, isActive && styles.tabActive]}
                        onPress={() => setActiveTab(tab.id as any)}
                        activeOpacity={0.7}
                      >
                        {isActive ? (
                          <View style={styles.tabActiveContent}>
                            <Ionicons name={tab.icon as any} size={18} color="#0EA5E9" />
                            <Text style={styles.tabTextActive}>{tab.label}</Text>
                            <View style={styles.tabActiveLine} />
                          </View>
                        ) : (
                          <>
                            <Ionicons name={tab.icon as any} size={18} color="#9CA3AF" />
                            <Text style={styles.tabText}>{tab.label}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.tabContent}>
            {activeTab === 'performance' && (
              <PerformanceTab
                quizStats={quizStats}
                profileStats={profileStats}
                streak={streak}
                achievements={userAchievements}
                totalAchievements={allAchievements.length || 12}
                level={quizStats?.level ?? profile.level ?? 1}
                totalPoints={quizStats?.totalPoints ?? profile.totalPoints ?? 0}
                profile={profile}
                onViewAchievements={() => navigation.navigate('Achievements' as any)}
                onViewLeaderboard={() => navigation.navigate('Leaderboard' as any)}
                onViewStats={() => navigation.navigate('Stats' as any)}
              />
            )}
            {activeTab === 'about' && (
              <View style={styles.aboutSection}>
                {/* Link School via Claim Code - Only for own profile when no school is assigned */}
                {isOwnProfile && !profile.school && (
                  <LinkSchoolCard />
                )}

                {/* Profile Completeness — own profile only */}
                {isOwnProfile && (
                  <ProfileCompletenessCard
                    profile={profile}
                    onEdit={handleEditProfile}
                  />
                )}

                {/* Career Goals */}
                <CareerGoalsCard
                  careerGoals={(profile as any).careerGoals}
                  isOwnProfile={isOwnProfile}
                  onEdit={handleEditProfile}
                />

                {/* Bio */}
                {profile.bio ? (
                  <View style={styles.aboutCard}>
                    <View style={styles.aboutCardHeader}>
                      <Ionicons name="person-circle-outline" size={20} color="#0EA5E9" />
                      <Text style={styles.aboutCardTitle}>Bio</Text>
                    </View>
                    <Text style={styles.aboutCardText}>{profile.bio}</Text>
                  </View>
                ) : null}

                {/* Headline & Location */}
                {(profile.headline || profile.location || profile.school) && (
                  <View style={styles.aboutCard}>
                    <View style={styles.aboutCardHeader}>
                      <Ionicons name="information-circle-outline" size={20} color="#0EA5E9" />
                      <Text style={styles.aboutCardTitle}>Info</Text>
                    </View>
                    {profile.headline ? (
                      <View style={styles.aboutInfoRow}>
                        <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
                        <Text style={styles.aboutInfoText}>{profile.headline}</Text>
                      </View>
                    ) : null}
                    {profile.location ? (
                      <View style={styles.aboutInfoRow}>
                        <Ionicons name="location-outline" size={16} color="#6B7280" />
                        <Text style={styles.aboutInfoText}>{profile.location}</Text>
                      </View>
                    ) : null}
                    {profile.school ? (
                      <View style={styles.aboutInfoRow}>
                        <Ionicons name="school-outline" size={16} color="#6B7280" />
                        <Text style={styles.aboutInfoText}>{profile.school.name}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Education */}
                {education.length > 0 && (
                  <View style={styles.aboutCard}>
                    <View style={styles.aboutCardHeader}>
                      <Ionicons name="school-outline" size={20} color="#8B5CF6" />
                      <Text style={styles.aboutCardTitle}>Education</Text>
                    </View>
                    {education.map((edu) => (
                      <View key={edu.id} style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: '#8B5CF6' }]} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTitle}>{edu.degree ? `${edu.degree} in ${edu.fieldOfStudy || ''}` : edu.school}</Text>
                          <Text style={styles.timelineSubtitle}>{edu.school}</Text>
                          <Text style={styles.timelineDate}>
                            {new Date(edu.startDate).getFullYear()} – {edu.isCurrent ? 'Present' : edu.endDate ? new Date(edu.endDate).getFullYear() : ''}
                          </Text>
                          {edu.description ? <Text style={styles.timelineDesc}>{edu.description}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Experience */}
                {experiences.length > 0 && (
                  <View style={styles.aboutCard}>
                    <View style={styles.aboutCardHeader}>
                      <Ionicons name="briefcase-outline" size={20} color="#10B981" />
                      <Text style={styles.aboutCardTitle}>Experience</Text>
                    </View>
                    {experiences.map((exp) => (
                      <View key={exp.id} style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTitle}>{exp.title}</Text>
                          <Text style={styles.timelineSubtitle}>{exp.organization}{exp.location ? ` · ${exp.location}` : ''}</Text>
                          <Text style={styles.timelineDate}>
                            {new Date(exp.startDate).getFullYear()} – {exp.isCurrent ? 'Present' : exp.endDate ? new Date(exp.endDate).getFullYear() : ''}
                          </Text>
                          {exp.description ? <Text style={styles.timelineDesc}>{exp.description}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Project Showcase */}
                <ProjectShowcase stats={profileStats} isOwnProfile={isOwnProfile} />

                {/* Certifications */}
                <CertificationsSection certifications={certifications} />

                {/* Skills & Interests */}
                <SkillsSection skills={profile.skills || []} interests={profile.interests || []} />

                {/* Empty state — only if absolutely nothing */}
                {!profile.bio && education.length === 0 && experiences.length === 0 && certifications.length === 0 && (!profile.skills || profile.skills.length === 0) && profile.interests.length === 0 && (profileStats?.projects ?? 0) === 0 && !(profile as any).careerGoals && (
                  <View style={styles.contentPlaceholder}>
                    <Ionicons name="person-outline" size={48} color="#E5E7EB" />
                    <Text style={styles.placeholderText}>No about information yet</Text>
                  </View>
                )}
              </View>
            )}
            {activeTab === 'activity' && (
              <ActivityTab
                stats={profileStats}
                posts={stats.posts}
                followers={stats.followers}
                recentAttempts={quizStats?.recentAttempts ?? []}
                achievements={userAchievements}
                streak={streak}
              />
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  errorText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  coverSection: {
    height: COVER_HEIGHT,
    position: 'relative',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
  },
  coverDecorCircle: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },
  coverPatternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    flex: 1,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  editCoverButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  levelBadgeInline: {
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  levelBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  levelTextInline: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  openToWorkBanner: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 14,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  openToWorkGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  openToWorkText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    marginTop: -90,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  editAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    ...Shadows.sm,
  },
  nameSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  editPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginLeft: 4,
  },
  editPillTextSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  headline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  bio: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  roleBadgeWrap: {
    marginTop: 6,
    marginBottom: 2,
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  roleBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 5,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  socialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  socialBadgeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  // ── Simple Text Stats ──
  textStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 4,
  },
  textStat: {
    flex: 1,
    alignItems: 'center',
  },
  textStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  textStatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  // ── Capsule Action Buttons ──
  capsuleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 28,
  },
  capsuleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    ...Shadows.sm,
  },
  capsuleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  capsuleBtnFilled: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: '#0EA5E9',
    ...Shadows.sm,
  },
  capsuleBtnFilledText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  // ── Legacy (kept for followPill if needed elsewhere) ──
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    borderWidth: 1.5,
    borderColor: '#7DD3FC',
  },
  editPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  editPillPrimary: {
    backgroundColor: '#0EA5E9',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  editPillTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  // ── Follow pill ──
  followPill: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0284C7',

    shadowOpacity: 0.2,


  },
  followPillFollowing: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowOpacity: 0,
  },
  followPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  followPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  followPillTextFollowing: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  highlightsSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  // ── Hero Progress Card ──
  heroCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0284C7',

    shadowOpacity: 0.2,


    marginBottom: 16,
  },
  heroGradient: {
    borderRadius: 14,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecor: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
  },
  // ── Clean Stat Grid ──
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statGridCardWrapper: {
    width: '31%',
    borderRadius: 16,
    ...Shadows.sm,
    shadowOpacity: 0.08,
  },
  statGridCard: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  statGridIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statGridValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statGridLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabsSection: {
    marginBottom: 16,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'transparent',
  },
  tabActiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  tabActiveLine: {
    position: 'absolute',
    bottom: -12,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#0EA5E9',
    borderRadius: 2,
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  contentPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center',
  },
  // ── About Tab Styles ──
  aboutSection: {
    gap: 16,
  },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    padding: 20,
  },
  aboutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aboutCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  aboutCardText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4B5563',
  },
  aboutInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  aboutInfoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  timelineSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4B5563',
    marginTop: 4,
  },
});
