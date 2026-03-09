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
  Image,
  Alert,
  ActivityIndicator, Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';



import { Avatar, Button } from '@/components/common';
import { Skeleton } from '@/components/common/Loading';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useAuthStore, useFeedStore } from '@/stores';
import { User, UserStats, Education, Experience, Certification } from '@/types';
import { formatNumber } from '@/utils';
import { ProfileStackScreenProps } from '@/navigation/types';
import * as Location from 'expo-location';
import { attendanceService } from '@/services/attendance';
import { fetchProfile as apiFetchProfile, fetchEducation, fetchExperiences, fetchCertifications, followUser, unfollowUser, uploadProfilePhoto, uploadCoverPhoto, updateProfile } from '@/api/profileApi';
import { statsAPI, type UserStats as QuizUserStats, type Streak, type UserAchievement, type Achievement } from '@/services/stats';
import { PerformanceTab, ActivityTab, CertificationsSection, SkillsSection, ProfileCompletenessCard, CareerGoalsCard, ProjectShowcase, LinkSchoolCard } from './components';
import RenderPostItem from '../feed/RenderPostItem';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = 220;
// Brand Colors — match WelcomeScreen exactly
const BRAND_TEAL = '#09CFF7';
const BRAND_TEAL_DARK = '#00B8DB';

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
  const scale = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const d = 200 + index * 50;
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 140, useNativeDriver: true }), Animated.spring(translateY, { toValue: 0, damping: 16, stiffness: 140, useNativeDriver: true }),
      ]).start();
    }, d);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View style={[styles.statGridCardWrapper, { transform: [{ scale }, { translateY }] }]}>
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
  const insets = useSafeAreaInsets();

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
  const [activeTab, setActiveTab] = useState<'performance' | 'posts' | 'about' | 'activity'>('performance');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

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

      // Immediate UI update (optimistic)
      setProfile(prev => prev ? { ...prev, profilePictureUrl: asset.uri } : prev);
      setUploadingPhoto(true);

      try {
        const fileName = asset.uri.split('/').pop() || 'profile.jpg';
        const data = await uploadProfilePhoto(asset.uri, fileName, asset.mimeType || 'image/jpeg');
        const photoUrl = (data as any).profilePictureUrl;

        // Persist to backend and update local/global state
        await updateProfile({ profilePictureUrl: photoUrl } as any);
        updateUser({ profilePictureUrl: photoUrl });
        setProfile(prev => prev ? { ...prev, profilePictureUrl: photoUrl } : prev);
      } catch (e) {
        console.error('Profile photo upload failed:', e);
        // Rollback on error if needed, but usually the old one is still in currentUser
        Alert.alert('Upload Error', 'Failed to update profile picture. Please try again.');
        setProfile(isOwnProfile ? currentUser : null);
      } finally {
        setUploadingPhoto(false);
      }
    }
  }, [updateUser, isOwnProfile, currentUser]);

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

      // Immediate UI update (optimistic)
      setProfile(prev => prev ? { ...prev, coverPhotoUrl: asset.uri } : prev);
      setUploadingCover(true);

      try {
        const fileName = asset.uri.split('/').pop() || 'cover.jpg';
        const data = await uploadCoverPhoto(asset.uri, fileName, asset.mimeType || 'image/jpeg');
        const photoUrl = (data as any).coverPhotoUrl;

        // Persist to backend and update local/global state
        await updateProfile({ coverPhotoUrl: photoUrl } as any);
        updateUser({ coverPhotoUrl: photoUrl } as any);
        setProfile(prev => prev ? { ...prev, coverPhotoUrl: photoUrl } : prev);
      } catch (e) {
        console.error('Cover photo upload failed:', e);
        Alert.alert('Upload Error', 'Failed to update cover photo. Please try again.');
        setProfile(isOwnProfile ? currentUser : null);
      } finally {
        setUploadingCover(false);
      }
    }
  }, [updateUser, isOwnProfile, currentUser]);

  // ── Shimmer Loading State — matches actual profile layout ──────
  if (loading || !profile) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: '#fff' }]}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
          {/* Cover shimmer - matches generic placeholder */}
          <View style={{ height: COVER_HEIGHT, backgroundColor: '#E5E7EB' }} />

          <View style={styles.contentContainer}>
            <Animated.View style={styles.avatarSection}>
              {/* Avatar overlay - matches real layout (160x160) */}
              <View style={[styles.avatarWrapper, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}>
                <Skeleton width={160} height={160} borderRadius={80} />
              </View>
            </Animated.View>

            {/* Name + role badge + headline */}
            <View style={[styles.nameSection, { alignItems: 'center', gap: 12, marginTop: -30 }]}>
              <Skeleton width={200} height={28} borderRadius={14} />
              <Skeleton width={120} height={24} borderRadius={12} />
              <Skeleton width={160} height={16} borderRadius={8} />
            </View>

            {/* Text Stats Row: Posts | Followers | Following */}
            <View style={[styles.textStatsRow, { justifyContent: 'center', gap: 32, marginTop: 24 }]}>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Skeleton width={24} height={24} borderRadius={8} />
                <Skeleton width={40} height={12} borderRadius={6} />
              </View>
              <View style={{ width: 1, height: 24, backgroundColor: '#E5E7EB' }} />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Skeleton width={24} height={24} borderRadius={8} />
                <Skeleton width={56} height={12} borderRadius={6} />
              </View>
              <View style={{ width: 1, height: 24, backgroundColor: '#E5E7EB' }} />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Skeleton width={24} height={24} borderRadius={8} />
                <Skeleton width={56} height={12} borderRadius={6} />
              </View>
            </View>

            {/* Action buttons (Follow, Message) */}
            <View style={[styles.capsuleRow, { marginTop: 20 }]}>
              <Skeleton width={120} height={44} borderRadius={22} />
              <Skeleton width={120} height={44} borderRadius={22} />
            </View>

            {/* Tabs scroll header placeholder */}
            <View style={[styles.tabsScroll, { marginTop: 24, flexDirection: 'row', gap: 20 }]}>
              <Skeleton width={100} height={24} borderRadius={12} />
              <Skeleton width={80} height={24} borderRadius={12} />
              <Skeleton width={80} height={24} borderRadius={12} />
            </View>

            {/* Tab content placeholder */}
            <View style={[styles.tabContent, { marginTop: 16 }]}>
              <Skeleton width="100%" height={240} borderRadius={16} />
            </View>
          </View>
        </View>
      </SafeAreaView>
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
    { id: 'posts', label: 'Posts', icon: 'list' },
    { id: 'about', label: 'About', icon: 'person' },
    { id: 'activity', label: 'Activity', icon: 'flame' },
  ];

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        { backgroundColor: '#fff' }
      ]}
    >
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>

        <FlashList
          data={[{ key: 'tabContent', type: activeTab }]}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          // @ts-ignore ignore type error with flash list sizes
          estimatedItemSize={1000}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <>
              {/* Cover Photo Section */}
              <View style={styles.coverSection}>
                {(profile as any)?.coverPhotoUrl ? (
                  <View style={StyleSheet.absoluteFill}>
                    <Image source={{ uri: (profile as any).coverPhotoUrl }} style={styles.coverGradient} />
                    {uploadingCover && (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }]}>
                        <ActivityIndicator color="#fff" size="large" />
                      </View>
                    )}
                  </View>
                ) : (
                  // Default: clean Facebook-style grey placeholder
                  <View style={styles.coverPlaceholder}>
                    {isOwnProfile && (
                      <TouchableOpacity style={styles.coverHint} onPress={handlePickCoverPhoto} activeOpacity={0.7}>
                        {uploadingCover ? <ActivityIndicator color={BRAND_TEAL} /> : <Text style={styles.coverHintText}>Add Cover Photo</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Header Buttons */}
                <View style={[styles.headerButtons, { paddingTop: 12 }]}>
                  <View style={styles.headerTopRow}>
                    {!isOwnProfile && (
                      <TouchableOpacity style={styles.headerCircleBtnDark} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={22} color="#333" />
                      </TouchableOpacity>
                    )}

                    <View style={{ flex: 1 }} />

                    {isOwnProfile && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.headerCircleBtnDark} onPress={() => navigation.navigate('Messages' as any, { screen: 'Conversations' })}>
                          <Ionicons name="chatbubbles-outline" size={20} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerCircleBtnDark} onPress={() => navigation.navigate('Settings' as any)}>
                          <Ionicons name="settings-outline" size={20} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerCircleBtnDark} onPress={handlePickCoverPhoto}>
                          <Ionicons name="camera-outline" size={20} color="#333" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {!isOwnProfile && (
                      <TouchableOpacity style={styles.headerCircleBtnDark}>
                        <Ionicons name="ellipsis-horizontal" size={20} color="#333" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

              </View>

              {/* Profile Content */}
              <View style={styles.contentContainer}>
                {/* Avatar Section */}
                <Animated.View style={styles.avatarSection}>
                  <View style={styles.avatarWrapper}>
                    <View style={{ width: 160, height: 160, borderRadius: 80, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
                      <Avatar
                        uri={profile.profilePictureUrl}
                        name={fullName}
                        size="3xl"
                        showBorder={false}
                        gradientBorder="none"
                        style={{ width: '100%', height: '100%' }}
                      />
                      {uploadingPhoto && (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }]}>
                          <ActivityIndicator color="#fff" size="large" />
                        </View>
                      )}
                    </View>

                    {/* Edit Avatar Button */}
                    {isOwnProfile && (
                      <TouchableOpacity style={styles.editAvatarButton} onPress={handlePickProfilePhoto}>
                        <View style={styles.editAvatarCircle}>
                          <Ionicons name="camera-outline" size={16} color="#09CFF7" />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>

                {/* Name & Bio — Frosted glass card */}
                <Animated.View style={styles.nameSection}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{fullName}</Text>
                    {profile.isVerified && (
                      <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                    )}
                  </View>

                  {/* Role Badge — shows the actual role for all user types */}
                  {profile.role && (
                    <Animated.View style={styles.roleBadgeWrap}>
                      <LinearGradient
                        colors={
                          profile.role === 'TEACHER' ? ['#6366F1', '#8B5CF6'] :
                            profile.role === 'ADMIN' ? ['#DC2626', '#B91C1C'] :
                              profile.role === 'SCHOOL_ADMIN' ? ['#D97706', '#B45309'] :
                                profile.role === 'SUPER_ADMIN' ? ['#DC2626', '#991B1B'] : // SUPER_ADMIN theme
                                  profile.role === 'PARENT' ? ['#059669', '#047857'] :
                                    profile.role === 'STAFF' ? ['#7C3AED', '#6D28D9'] :
                                      ['#0EA5E9', '#0284C7'] // STUDENT default
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.roleBadgeGradient}
                      >
                        <Ionicons
                          name={
                            profile.role === 'TEACHER' ? 'school' :
                              profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN' || profile.role === 'SCHOOL_ADMIN' ? 'shield-checkmark' :
                                profile.role === 'PARENT' ? 'people' :
                                  profile.role === 'STAFF' ? 'briefcase' :
                                    'person'
                          }
                          size={12}
                          color="#fff"
                        />
                        <Text style={styles.roleBadgeText}>
                          {profile.role === 'TEACHER' ? 'Teacher' :
                            profile.role === 'ADMIN' ? 'Admin' :
                              profile.role === 'SUPER_ADMIN' ? 'Stunity Admin' :
                                profile.role === 'SCHOOL_ADMIN' ? 'School Admin' :
                                  profile.role === 'PARENT' ? 'Parent' :
                                    profile.role === 'STAFF' ? 'Staff' :
                                      'Student'}
                        </Text>
                      </LinearGradient>
                    </Animated.View>
                  )}

                  {profile.headline ? (
                    <Text style={styles.headline}>{profile.headline || profile.professionalTitle}</Text>
                  ) : null}

                  {/* Open to Opportunities Banner */}
                  {(profile as any).isOpenToOpportunities && (
                    <Animated.View style={styles.openToWorkBanner}>
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

                {/* Stats Row — pill card style */}
                <Animated.View style={styles.textStatsRow}>
                  <TouchableOpacity style={styles.textStat} activeOpacity={0.7}>
                    <Text style={styles.textStatValue}>{formatNumber(stats.posts)}</Text>
                    <Text style={styles.textStatLabel}>Posts</Text>
                  </TouchableOpacity>

                  <View style={styles.statDivider} />

                  <TouchableOpacity style={styles.textStat} activeOpacity={0.7}>
                    <Text style={styles.textStatValue}>{formatNumber(stats.followers)}</Text>
                    <Text style={styles.textStatLabel}>Followers</Text>
                  </TouchableOpacity>

                  <View style={styles.statDivider} />

                  <TouchableOpacity style={styles.textStat} activeOpacity={0.7}>
                    <Text style={styles.textStatValue}>{formatNumber(stats.following)}</Text>
                    <Text style={styles.textStatLabel}>Following</Text>
                  </TouchableOpacity>
                </Animated.View>

                {/* Action Buttons */}
                <Animated.View style={styles.capsuleRow}>
                  {isOwnProfile ? (
                    <View style={{ flex: 1, gap: 10 }}>
                      {/* Main Edit Profile Action */}
                      <TouchableOpacity
                        style={styles.capsuleBtnFilled}
                        onPress={handleEditProfile}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[BRAND_TEAL, BRAND_TEAL_DARK]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.capsuleBtnFilledText}>Edit Profile</Text>
                      </TouchableOpacity>

                      {/* Secondary Actions Row */}
                      <View style={styles.secondaryActionRow}>
                        {currentUser?.role === 'TEACHER' && (
                          <TouchableOpacity
                            style={[styles.secondaryActionBtn, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', borderWidth: 1 }]}
                            onPress={() => navigation.navigate('AttendanceCheckIn' as any)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.secondaryActionContent}>
                              <Ionicons name="finger-print-outline" size={18} color="#0284C7" style={{ marginRight: 6 }} />
                              <Text style={[styles.secondaryActionText, { color: '#0284C7' }]}>Attendance</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.secondaryActionBtn, { backgroundColor: '#FFFBEB', borderColor: '#FEF08A', borderWidth: 1 }]}
                          onPress={() => navigation.navigate('QuizStudio' as any)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.secondaryActionContent}>
                            <Ionicons name="cube-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
                            <Text style={[styles.secondaryActionText, { color: '#D97706' }]}>Quiz Studio</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    // Other user's profile: Follow + Message
                    <>
                      <TouchableOpacity
                        style={isFollowing ? styles.capsuleBtn : styles.capsuleBtnFilled}
                        onPress={handleFollow}
                        activeOpacity={0.8}
                      >
                        {!isFollowing && (
                          <LinearGradient
                            colors={[BRAND_TEAL, BRAND_TEAL_DARK]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                        <Text style={isFollowing ? styles.capsuleBtnText : styles.capsuleBtnFilledText}>
                          {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.capsuleBtnYellow} activeOpacity={0.8}>
                        <Ionicons name="chatbubble-outline" size={16} color="#78350F" style={{ marginRight: 5 }} />
                        <Text style={styles.capsuleBtnYellowText}>Message</Text>
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
                              <Ionicons name={tab.icon as any} size={18} color={BRAND_TEAL} />
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
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.tabContent, activeTab === 'posts' && { paddingHorizontal: 0 }]}>
              {activeTab === 'posts' && (
                <View style={{ paddingTop: 12 }}>
                  {stats.posts === 0 ? (
                    <View style={styles.contentPlaceholder}>
                      <Ionicons name="document-text-outline" size={48} color="#E5E7EB" />
                      <Text style={styles.placeholderText}>No posts yet</Text>
                    </View>
                  ) : (
                    useFeedStore.getState()
                      .feedItems
                      .filter((i: any) => i.type === 'POST' && i.data?.author?.id === (isOwnProfile ? currentUser?.id : userId))
                      .map((item: any) => (
                        <RenderPostItem
                          key={item.data.id}
                          item={item.data}
                          handlersRef={{ current: { navigation, handleLikePost: () => { }, handleSharePost: () => { }, bookmarkPost: () => { }, handleValuePost: () => { }, handlePostPress: () => { }, handleVoteOnPoll: () => { } } } as any}
                          isValued={false}
                          setAnalyticsPostId={() => { }}
                        />
                      ))
                  )}
                </View>
              )}
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
    </SafeAreaView >
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
    paddingHorizontal: 12,
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
  // Dark variant for use over plain/grey cover background
  headerCircleBtnDark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  // Cover placeholder styles
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  coverHint: {
    alignItems: 'center',
    marginBottom: 60,
  },
  coverHintText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.40)',
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
    width: 168,
    height: 168,
    backgroundColor: '#fff',
    borderRadius: 84,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
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
    marginTop: 4,
    marginBottom: 8,
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
    marginTop: 8,
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
    marginHorizontal: 12,
    marginBottom: 20,
    paddingVertical: 8,
  },
  textStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
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
  // ── Stat Row Divider ──
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
  },

  // ── Capsule Action Buttons ──
  capsuleRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    gap: 10,
    marginBottom: 16,
  },
  capsuleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BRAND_TEAL,
    ...Shadows.sm,
  },
  capsuleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND_TEAL,
  },
  capsuleBtnFilled: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 50,
    overflow: 'hidden',
    ...Shadows.md,
  },
  capsuleBtnFilledText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  // Brand-yellow Message button
  capsuleBtnYellow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: '#FFA600',
    ...Shadows.md,
  },
  capsuleBtnYellowText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78350F',
  },

  secondaryActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    borderRadius: 50,
  },
  secondaryActionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
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
    paddingHorizontal: 12,
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
    backgroundColor: '#09CFF7',
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
    color: '#09CFF7',
  },
  tabContent: {
    paddingHorizontal: 12,
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
    gap: 12,
    paddingTop: 12,
  },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
