/**
 * Profile Screen — Premium Enterprise Design
 * 
 * Beautiful, modern profile with Instagram/SchoolApp inspired design
 * Features: Cover photo, avatar, stats, performance highlights, tabs
 * Compact edit button, settings icon, soft purple background
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator, Animated,
  InteractionManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';



import { Avatar } from '@/components/common';
import { Skeleton } from '@/components/common/Loading';
import { Shadows } from '@/config';
import { useAuthStore, useFeedStore } from '@/stores';
import { User, UserStats, Education, Experience, Certification } from '@/types';
import { formatNumber } from '@/utils';
import { ProfileStackScreenProps } from '@/navigation/types';
import { fetchProfile as apiFetchProfile, fetchEducation, fetchExperiences, fetchCertifications, followUser, unfollowUser, uploadProfilePhoto, uploadCoverPhoto, updateProfile } from '@/api/profileApi';
import { statsAPI, type UserStats as QuizUserStats, type Streak, type UserAchievement, type Achievement } from '@/services/stats';
import { PerformanceTab, ActivityTab, CertificationsSection, SkillsSection, ProfileCompletenessCard, CareerGoalsCard, ProjectShowcase, LinkSchoolCard } from './components';
import RenderPostItem from '../feed/RenderPostItem';
import * as ImagePicker from 'expo-image-picker';

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
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { user: currentUser } = useAuthStore();
  const insets = useSafeAreaInsets();

  const userId = route.params?.userId;
  const isOwnProfile = !userId || userId === currentUser?.id;
  const { updateUser } = useAuthStore();
  const feedItems = useFeedStore((state) => state.feedItems);



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
  const [loading, setLoading] = useState(!isOwnProfile || !currentUser);
  const [loadingAbout, setLoadingAbout] = useState(false);
  const [aboutLoaded, setAboutLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'performance' | 'posts' | 'about' | 'activity'>('performance');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const profileAuthorId = isOwnProfile ? currentUser?.id : userId;
  const profileTargetKey = isOwnProfile ? (currentUser?.id ?? 'me') : (userId ?? 'unknown');
  const requestIdRef = useRef(0);
  const analyticsRequestIdRef = useRef(0);
  const aboutRequestIdRef = useRef(0);
  const aboutLoadedRef = useRef(false);
  const loadingAboutRef = useRef(false);
  const interactionTaskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  useEffect(() => {
    aboutLoadedRef.current = aboutLoaded;
  }, [aboutLoaded]);

  useEffect(() => {
    loadingAboutRef.current = loadingAbout;
  }, [loadingAbout]);

  const loadAnalytics = useCallback(async (resolvedUserId: string, requestId: number) => {
    const analyticsRequestId = ++analyticsRequestIdRef.current;

    const [qStats, streakData, uAch, allAch] = await Promise.all([
      statsAPI.getUserStats(resolvedUserId).catch(() => null),
      statsAPI.getStreak(resolvedUserId).catch(() => null),
      statsAPI.getUserAchievements(resolvedUserId).catch(() => []),
      statsAPI.getAchievements().catch(() => []),
    ]);

    if (requestId !== requestIdRef.current || analyticsRequestId !== analyticsRequestIdRef.current) {
      return;
    }

    if (qStats) setQuizStats(qStats);
    if (streakData) setStreak(streakData);
    setUserAchievements(uAch || []);
    setAllAchievements(allAch || []);
  }, []);

  const loadAboutData = useCallback(async (targetId: string, requestId: number) => {
    if (aboutLoadedRef.current || loadingAboutRef.current) {
      return;
    }

    const aboutRequestId = ++aboutRequestIdRef.current;
    setLoadingAbout(true);

    try {
      const [eduData, expData, certData] = await Promise.all([
        fetchEducation(targetId),
        fetchExperiences(targetId),
        fetchCertifications(targetId).catch(() => []),
      ]);

      if (requestId !== requestIdRef.current || aboutRequestId !== aboutRequestIdRef.current) {
        return;
      }

      setEducation(eduData || []);
      setExperiences(expData || []);
      setCertifications(certData || []);
      setAboutLoaded(true);
    } catch (error) {
      if (requestId !== requestIdRef.current || aboutRequestId !== aboutRequestIdRef.current) {
        return;
      }

      console.error('Failed to load profile about data:', error);
      setEducation([]);
      setExperiences([]);
      setCertifications([]);
      setAboutLoaded(true);
    } finally {
      if (requestId === requestIdRef.current && aboutRequestId === aboutRequestIdRef.current) {
        setLoadingAbout(false);
      }
    }
  }, []);

  const loadProfile = useCallback(async (options?: { isRefresh?: boolean }) => {
    const requestId = ++requestIdRef.current;
    const targetId = isOwnProfile ? 'me' : userId!;
    const resolvedUserId = isOwnProfile ? (currentUser?.id || 'me') : userId!;
    const showBlockingLoader = !options?.isRefresh && (!isOwnProfile || !currentUser);

    if (!isOwnProfile) {
      setProfile(null);
    } else if (currentUser) {
      setProfile(currentUser);
    }

    if (showBlockingLoader) {
      setLoading(true);
    }

    try {
      const profileData = await apiFetchProfile(targetId);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setProfile(profileData as any);
      setProfileStats(profileData.stats);
      setIsFollowing(profileData.isFollowing || false);
      setLoading(false);

      interactionTaskRef.current?.cancel();
      interactionTaskRef.current = InteractionManager.runAfterInteractions(() => {
        loadAnalytics(resolvedUserId, requestId);
        loadAboutData(targetId, requestId);
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error('Failed to load profile:', error);
      if (isOwnProfile && currentUser) {
        setProfile(currentUser);
      }
      setLoading(false);
    } finally {
      if (showBlockingLoader && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentUser, isOwnProfile, loadAboutData, loadAnalytics, userId]);

  useEffect(() => {
    setLoadingAbout(false);
    setAboutLoaded(false);
    setEducation([]);
    setExperiences([]);
    setCertifications([]);
    setQuizStats(null);
    setStreak(null);
    setUserAchievements([]);
    setAllAchievements([]);

    if (isOwnProfile && currentUser) {
      setProfile(currentUser);
      setLoading(false);
    } else {
      setProfile(null);
      setLoading(true);
    }

    loadProfile();

    return () => {
      interactionTaskRef.current?.cancel();
    };
  }, [currentUser, isOwnProfile, loadProfile, profileTargetKey]);

  useEffect(() => {
    if (activeTab === 'about' && !aboutLoaded && !loadingAbout) {
      loadAboutData(isOwnProfile ? 'me' : userId!, requestIdRef.current);
    }
  }, [activeTab, aboutLoaded, loadingAbout, loadAboutData, isOwnProfile, userId]);

  const showSkeleton = loading && !profile;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile({ isRefresh: true });
    setRefreshing(false);
  }, [loadProfile]);

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
      quality: 1,
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
        Alert.alert(t('profile.uploadError'), t('profile.uploadErrorMsg'));
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
      quality: 1,
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
        Alert.alert(t('profile.uploadError'), t('profile.coverUploadErrorMsg'));
        setProfile(isOwnProfile ? currentUser : null);
      } finally {
        setUploadingCover(false);
      }
    }
  }, [updateUser, isOwnProfile, currentUser]);

  const profilePosts = useMemo(
    () =>
      (Array.isArray(feedItems) ? feedItems : [])
        .filter((i: any) => i.type === 'POST' && i.data?.author?.id === profileAuthorId)
        .map((i: any) => i.data),
    [feedItems, profileAuthorId]
  );

  const noop = useCallback(() => { }, []);
  const profilePostHandlersRef = useMemo(
    () => ({
      current: {
        navigation,
        handleLikePost: noop,
        handleSharePost: noop,
        bookmarkPost: noop,
        handleValuePost: noop,
        handlePostPress: noop,
        handleVoteOnPoll: noop,
      },
    }),
    [navigation, noop]
  );

  const tabs = useMemo(
    () => [
      { id: 'performance' as const, label: t('profile.performance.title'), icon: 'trending-up' },
      { id: 'posts' as const, label: t('profile.posts'), icon: 'list' },
      { id: 'about' as const, label: t('profile.about.title'), icon: 'person' },
      { id: 'activity' as const, label: t('profile.activity.title'), icon: 'flame' },
    ],
    [t]
  );

  // ── Shimmer Loading State — matches actual profile layout ──────
  if (showSkeleton) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: '#fff' }]}>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <LinearGradient
            colors={['#FFFFFF', '#F5F0FF', '#EEF7FF']}
            style={StyleSheet.absoluteFill}
          />

          {/* Cover shimmer — exact same height as real screen */}
          <View style={{ height: COVER_HEIGHT, backgroundColor: '#E2E8F0' }} />

          {/* Content container — matches real marginTop: -90 */}
          <View style={[styles.contentContainer]}>

            {/* Avatar — centred, white ring, overlapping cover */}
            <View style={styles.avatarSection}>
              <View style={[
                styles.avatarWrapper,
                { backgroundColor: '#F0F9FF', shadowOpacity: 0 },
              ]}>
                <Skeleton width={160} height={160} borderRadius={80} />
              </View>
            </View>

            {/* Name + role badge + headline — matches nameSection alignItems center */}
            <View style={[styles.nameSection, { alignItems: 'center', gap: 10 }]}>
              {/* Name */}
              <Skeleton width={180} height={26} borderRadius={13} />
              {/* Role badge */}
              <Skeleton width={100} height={22} borderRadius={11} />
              {/* Headline */}
              <Skeleton width={150} height={14} borderRadius={7} />
            </View>

            {/* Text Stats Row: Posts | divider | Followers | divider | Following */}
            <View style={[styles.textStatsRow]}>
              <View style={styles.textStat}>
                <Skeleton width={28} height={24} borderRadius={6} />
                <Skeleton width={48} height={13} borderRadius={6} style={{ marginTop: 4 }} />
              </View>
              <View style={styles.statDivider} />
              <View style={styles.textStat}>
                <Skeleton width={28} height={24} borderRadius={6} />
                <Skeleton width={64} height={13} borderRadius={6} style={{ marginTop: 4 }} />
              </View>
              <View style={styles.statDivider} />
              <View style={styles.textStat}>
                <Skeleton width={28} height={24} borderRadius={6} />
                <Skeleton width={64} height={13} borderRadius={6} style={{ marginTop: 4 }} />
              </View>
            </View>

            {/* Action Buttons — full-width flex row, matches capsuleRow */}
            <View style={styles.capsuleRow}>
              <Skeleton style={{ flex: 1 }} height={48} borderRadius={50} />
              <Skeleton style={{ flex: 1 }} height={48} borderRadius={50} />
            </View>

            {/* Tabs — matches tabsScroll padding + gap */}
            <View style={[{ paddingHorizontal: 12, flexDirection: 'row', gap: 8, marginBottom: 16 }]}>
              <Skeleton width={110} height={36} borderRadius={12} />
              <Skeleton width={80} height={36} borderRadius={12} />
              <Skeleton width={80} height={36} borderRadius={12} />
              <Skeleton width={80} height={36} borderRadius={12} />
            </View>

            {/* Tab content — two perf stat cards */}
            <View style={[styles.tabContent]}>
              <Skeleton width="100%" height={140} borderRadius={16} />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <Skeleton style={{ flex: 1 }} height={100} borderRadius={16} />
                <Skeleton style={{ flex: 1 }} height={100} borderRadius={16} />
                <Skeleton style={{ flex: 1 }} height={100} borderRadius={16} />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return null;
  }

  const fullName = `${profile.lastName} ${profile.firstName}`;
  const stats = {
    posts: profileStats?.posts ?? 0,
    followers: profileStats?.followers ?? 0,
    following: profileStats?.following ?? 0,
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        { backgroundColor: '#fff' }
      ]}
    >
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={['#FFFFFF', '#F5F0FF', '#EEF7FF']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.bodyWaveWrap, { top: 240, left: -40, opacity: 0.8 }]}>
          <View style={[styles.bodyGeoSquare, { backgroundColor: '#38BDF8', width: 180, height: 180, opacity: 0.12, borderRadius: 40, transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.bodyGeoSquare, { backgroundColor: '#2DD4BF', width: 120, height: 120, top: 100, left: 60, opacity: 0.1, borderRadius: 30, transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.bodyGeoSquare, { backgroundColor: '#22D3EE', width: 80, height: 80, top: -20, left: 140, opacity: 0.08, borderRadius: 20, transform: [{ rotate: '45deg' }] }]} />
        </View>

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
                    <ExpoImage
                      source={{ uri: (profile as any).coverPhotoUrl }}
                      style={styles.coverGradient}
                      contentFit="cover"
                      transition={150}
                      cachePolicy="memory-disk"
                    />
                    {uploadingCover && (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }]}>
                        <ActivityIndicator color="#fff" size="large" />
                      </View>
                    )}
                  </View>
                ) : (
                  // Default: Beautiful gradient + abstract pattern placeholder
                  <LinearGradient
                    colors={['#F0F9FF', '#E0F2FE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.coverPlaceholder}
                  >
                    <View style={styles.coverDecorCircle1} />
                    <View style={styles.coverDecorCircle2} />
                    <View style={styles.coverDecorCircle3} />
                    {isOwnProfile && (
                      <TouchableOpacity style={styles.coverHint} onPress={handlePickCoverPhoto} activeOpacity={0.7}>
                        {uploadingCover ? <ActivityIndicator color={BRAND_TEAL} /> : <Text style={styles.coverHintText}>{t('profile.addCover')}</Text>}
                      </TouchableOpacity>
                    )}
                  </LinearGradient>
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
                        <TouchableOpacity style={styles.headerCircleBtnDark} onPress={() => navigation.navigate('MyQRCard' as any)}>
                          <Ionicons name="qr-code-outline" size={20} color="#333" />
                        </TouchableOpacity>
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
                        style={{ width: 160, height: 160 }}
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
                      <Ionicons name="checkmark-circle" size={20} color="#3B82F6" style={{ marginTop: 2 }} />
                    )}
                  </View>
                  {(profile.englishFirstName || profile.englishLastName) && (
                    <Text style={styles.englishName}>
                      {profile.englishLastName} {profile.englishFirstName}
                    </Text>
                  )}

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
                          {profile.role === 'TEACHER' ? t('profile.roles.teacher') :
                            profile.role === 'ADMIN' ? t('profile.roles.admin') :
                              profile.role === 'SUPER_ADMIN' ? t('profile.roles.superAdmin') :
                                profile.role === 'SCHOOL_ADMIN' ? t('profile.roles.schoolAdmin') :
                                  profile.role === 'PARENT' ? t('profile.roles.parent') :
                                    profile.role === 'STAFF' ? t('profile.roles.staff') :
                                      t('profile.roles.student')}
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
                        <Text style={styles.openToWorkText}>{t('profile.openToOpportunities')}</Text>
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
                        <Text style={[styles.socialBadgeText, { color: '#0077B5' }]}>{t('common.linkedin', 'LinkedIn')}</Text>
                      </TouchableOpacity>
                    )}
                    {(profile as any).githubUrl && (
                      <TouchableOpacity style={styles.socialBadge} onPress={() => { const { Linking } = require('react-native'); Linking.openURL((profile as any).githubUrl); }}>
                        <Ionicons name="logo-github" size={14} color="#1a1a1a" />
                        <Text style={styles.socialBadgeText}>{t('common.github', 'GitHub')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>

                {/* Stats Row — pill card style */}
                <Animated.View style={styles.textStatsRow}>
                  <TouchableOpacity style={styles.textStat} activeOpacity={0.7}>
                    <Text style={styles.textStatValue}>{formatNumber(stats.posts)}</Text>
                    <Text style={styles.textStatLabel}>{t('profile.stats.posts')}</Text>
                  </TouchableOpacity>

                  <View style={styles.statDivider} />

                  <TouchableOpacity style={styles.textStat} activeOpacity={0.7}>
                    <Text style={styles.textStatValue}>{formatNumber(stats.followers)}</Text>
                    <Text style={styles.textStatLabel}>{t('profile.stats.followers')}</Text>
                  </TouchableOpacity>

                  <View style={styles.statDivider} />

                  <TouchableOpacity style={styles.textStat} activeOpacity={0.7}>
                    <Text style={styles.textStatValue}>{formatNumber(stats.following)}</Text>
                    <Text style={styles.textStatLabel}>{t('profile.stats.following')}</Text>
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
                        <Text style={styles.capsuleBtnFilledText}>{t('profile.editProfile')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.userCardActionBtn}
                        onPress={() => navigation.navigate('UserCard' as any)}
                        activeOpacity={0.82}
                      >
                        <LinearGradient
                          colors={['#FFC53D', '#FFA600']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name="card-outline" size={16} color="#78350F" style={{ marginRight: 5 }} />
                        <Text style={styles.userCardActionText}>
                          {t('profile.userCard.cta', 'Open My Education Card')}
                        </Text>
                      </TouchableOpacity>
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
                          {isFollowing ? t('profile.following') : t('profile.follow')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.capsuleBtnYellow} activeOpacity={0.8}>
                        <Ionicons name="chatbubble-outline" size={16} color="#78350F" style={{ marginRight: 5 }} />
                        <Text style={styles.capsuleBtnYellowText}>{t('profile.message')}</Text>
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
                  {profilePosts.length === 0 ? (
                    <View style={styles.contentPlaceholder}>
                      <Ionicons name="document-text-outline" size={48} color="#E5E7EB" />
                      <Text style={styles.placeholderText}>{t('profile.noPosts')}</Text>
                    </View>
                  ) : (
                    profilePosts.map((post: any) => (
                      <RenderPostItem
                        key={post.id}
                        item={post}
                        handlersRef={profilePostHandlersRef as any}
                        isValued={false}
                        setAnalyticsPostId={noop}
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
                  {loadingAbout && !aboutLoaded && (
                    <View style={styles.aboutLoadingCard}>
                      <Skeleton width="45%" height={18} borderRadius={8} />
                      <Skeleton width="100%" height={14} borderRadius={7} style={{ marginTop: 14 }} />
                      <Skeleton width="82%" height={14} borderRadius={7} style={{ marginTop: 10 }} />
                      <Skeleton width="70%" height={14} borderRadius={7} style={{ marginTop: 10 }} />
                    </View>
                  )}

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
                        <Text style={styles.aboutCardTitle}>{t('profile.info.bio')}</Text>
                      </View>
                      <Text style={styles.aboutCardText}>{profile.bio}</Text>
                    </View>
                  ) : null}

                  {/* Headline & Location */}
                  {(profile.headline || profile.location || profile.school) && (
                    <View style={styles.aboutCard}>
                      <View style={styles.aboutCardHeader}>
                        <Ionicons name="information-circle-outline" size={20} color="#0EA5E9" />
                        <Text style={styles.aboutCardTitle}>{t('profile.info.title')}</Text>
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
                  {aboutLoaded && !profile.bio && education.length === 0 && experiences.length === 0 && certifications.length === 0 && (!profile.skills || profile.skills.length === 0) && profile.interests.length === 0 && (profileStats?.projects ?? 0) === 0 && !(profile as any).careerGoals && (
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
    overflow: 'hidden', // Contain decorative elements
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
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center', // Center the camera hint
    position: 'relative',
    overflow: 'hidden',
  },
  coverDecorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(9, 207, 247, 0.07)',
    top: -60,
    right: -40,
  },
  coverDecorCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(9, 207, 247, 0.05)',
    bottom: -30,
    left: -20,
  },
  coverDecorCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(9, 207, 247, 0.08)',
    top: 40,
    left: 40,
  },
  coverHint: {
    alignItems: 'center',
    zIndex: 10,
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
  bodyWaveWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bodyGeoSquare: {
    position: 'absolute',
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
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
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  englishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: -2,
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
  userCardActionBtn: {
    borderRadius: 50,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 14,
    ...Shadows.md,
  },
  userCardActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78350F',
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
  aboutLoadingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    ...Shadows.sm,
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
