import { I18nText as AutoI18nText } from "@/components/i18n/I18nText";
/**
 * Profile Screen — Premium Enterprise Design
 *
 * Beautiful, modern profile with Instagram/SchoolApp inspired design
 * Features: Cover photo, avatar, stats, performance highlights, tabs
 * Compact edit button, settings icon, soft purple background
 */

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
  InteractionManager,
  useWindowDimensions,
  Share,
} from "react-native";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";

import { Avatar, ImageViewerModal } from "@/components/common";
import { Skeleton } from "@/components/common/Loading";
import { useThemeContext } from "@/contexts";
import { Shadows } from "@/config";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { useAuthStore, useFeedStore, useLeaderboardStore } from "@/stores";
import { User, UserStats, Education, Experience, Certification } from "@/types";
import { formatNumber } from "@/utils";
import { useLayoutBreakpoint } from "@/hooks/useLayoutBreakpoint";
import { ProfileStackScreenProps } from "@/navigation/types";
import {
  fetchProfile as apiFetchProfile,
  fetchEducation,
  fetchExperiences,
  fetchCertifications,
  followUser,
  unfollowUser,
  uploadProfilePhoto,
  uploadCoverPhoto,
  updateProfile,
  trackProfileView,
  type ProfileVisitor,
} from "@/api/profileApi";
import {
  readProfileFromCache,
  writeProfileToCache,
  invalidateProfileCache,
} from "@/screens/profile/profileCache";
import {
  fetchPerformanceStatsSummary,
  fetchUserStatsCached,
  getCachedPerformanceSummary,
  invalidatePerformanceStatsCache,
  mapSummaryToQuizUserStats,
  applyStreakFreeze,
} from "@/lib/performanceStatsCache";
import { useLearnerStats } from "@/hooks/useLearnerStats";
import { cancelStreakAtRiskReminder } from "@/services/streakReminders";
import { Haptics } from "@/services/haptics";
import {
  fetchProfileVisitorsPreviewCached,
  getCachedProfileVisitors,
  invalidateProfileVisitorsCache,
} from "@/lib/profileVisitorsCache";
import {
  statsAPI,
  type UserStats as QuizUserStats,
  type UserAchievement,
  type Achievement,
} from "@/services/stats";
import {
  PerformanceTab,
  ActivityTab,
  CertificationsSection,
  SkillsSection,
  EndorsableSkills,
  ProfileCompletenessCard,
  CareerGoalsCard,
  ProjectShowcase,
  LinkSchoolCard,
} from "./components";
import RenderPostItem from "../feed/RenderPostItem";
import * as ImagePicker from "expo-image-picker";

const COVER_HEIGHT = 220;
// Brand Colors — match WelcomeScreen exactly
const BRAND_TEAL = "#09CFF7";
const BRAND_TEAL_DARK = "#00B8DB";

type RouteProp = ProfileStackScreenProps<"Profile">["route"];
type NavigationProp = ProfileStackScreenProps<"Profile">["navigation"];

// Premium Stat card config with subtle gradients and glassmorphism hints
export const STAT_CARDS = [
  {
    icon: "book-outline" as const,
    bgStart: "#F0F9FF",
    bgEnd: "#E0F2FE",
    accent: "#0EA5E9",
    tint: "#0C4A6E",
  },
  {
    icon: "star-outline" as const,
    bgStart: "#FFF7ED",
    bgEnd: "#FFEDD5",
    accent: "#F59E0B",
    tint: "#92400E",
  },
  {
    icon: "time-outline" as const,
    bgStart: "#F0FDF4",
    bgEnd: "#DCFCE7",
    accent: "#10B981",
    tint: "#065F46",
  },
  {
    icon: "flame-outline" as const,
    bgStart: "#FFF1F2",
    bgEnd: "#FFE4E6",
    accent: "#F43F5E",
    tint: "#9F1239",
  },
  {
    icon: "trophy-outline" as const,
    bgStart: "#FAF5FF",
    bgEnd: "#F3E8FF",
    accent: "#8B5CF6",
    tint: "#5B21B6",
  },
  {
    icon: "code-slash-outline" as const,
    bgStart: "#EFF6FF",
    bgEnd: "#DBEAFE",
    accent: "#3B82F6",
    tint: "#1E3A8A",
  },
];

export function StatCard({
  icon,
  value,
  label,
  index = 0,
}: {
  icon: string;
  value: string | number;
  label: string;
  index?: number;
}) {
  const cfg = STAT_CARDS[index % STAT_CARDS.length];
  const { colors, isDark } = useThemeContext();
  const scale = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const cardColors: [string, string] = isDark
    ? [colors.card, colors.surfaceVariant]
    : [cfg.bgStart, cfg.bgEnd];
  const textColor = isDark ? colors.text : cfg.tint;

  useEffect(() => {
    const d = 200 + index * 50;
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          damping: 16,
          stiffness: 140,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 16,
          stiffness: 140,
          useNativeDriver: true,
        }),
      ]).start();
    }, d);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[
        styles.statGridCardWrapper,
        {
          shadowOpacity: isDark ? 0 : 0.08,
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      <LinearGradient
        colors={cardColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.statGridCard,
          { borderColor: isDark ? colors.border : "rgba(255,255,255,0.6)" },
        ]}
      >
        <View style={[styles.statGridIcon, { backgroundColor: cfg.accent }]}>
          <Ionicons name={icon as any} size={18} color="#fff" />
        </View>
        <Text style={[styles.statGridValue, { color: textColor }]}>
          {value}
        </Text>
        <Text
          style={[
            styles.statGridLabel,
            { color: isDark ? colors.textSecondary : cfg.tint, opacity: 0.8 },
          ]}
        >
          {label}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const currentUser = useAuthStore(s => s.user);
  const insets = useSafeAreaInsets();
  const layout = useLayoutBreakpoint();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isThreeColumnTablet =
    layout.isTablet && windowWidth > windowHeight && windowWidth >= 1180;
  const isProfileRailTablet = layout.isTablet && windowWidth >= 900;
  const coverHeight = isThreeColumnTablet
    ? 260
    : isProfileRailTablet
      ? 300
    : layout.isLargeTablet
    ? 400
    : layout.isTablet
      ? 340
      : COVER_HEIGHT;
  const avatarRing = isThreeColumnTablet
    ? 164
    : isProfileRailTablet
      ? 176
    : layout.isLargeTablet
      ? 200
      : layout.isTablet
        ? 186
        : 168;
  const avatarSize = isThreeColumnTablet
    ? 154
    : isProfileRailTablet
      ? 166
    : layout.isLargeTablet
      ? 192
      : layout.isTablet
        ? 176
        : 160;
  const contentOverlap = -Math.round((avatarRing / 168) * 90);

  const userId = route.params?.userId;
  const isOwnProfile = !userId || userId === currentUser?.id;
  const updateUser = useAuthStore(s => s.updateUser);
  const feedItems = useFeedStore((state) => state.feedItems);
  const myPosts = useFeedStore((state) => state.myPosts);
  const fetchMyPosts = useFeedStore((state) => state.fetchMyPosts);

  // For the user's own profile, seed from the disk-backed cache (hydrated by
  // MainNavigator at boot) so the first paint is synchronous — no skeleton
  // on warm reopen. Falls through to currentUser (auth store) if cache empty.
  const cachedOwnProfile = isOwnProfile && currentUser?.id
    ? readProfileFromCache(currentUser.id)
    : null;
  if (cachedOwnProfile && __DEV__) {
    console.log('[Profile TTI] cache hit (own profile)');
  }
  const [profile, setProfile] = useState<User | null>(
    isOwnProfile ? (cachedOwnProfile as User) || currentUser : null,
  );
  const [profileStats, setProfileStats] = useState<UserStats | null>(
    (cachedOwnProfile as any)?.stats ?? null,
  );
  const [education, setEducation] = useState<Education[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [quizStats, setQuizStats] = useState<QuizUserStats | null>(null);
  const [recentProfileVisitors, setRecentProfileVisitors] = useState<
    ProfileVisitor[]
  >([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>(
    [],
  );
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(!isOwnProfile || !currentUser);
  const [loadingAbout, setLoadingAbout] = useState(false);
  const [aboutLoaded, setAboutLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "performance" | "posts" | "about" | "activity"
  >("performance");
  const tabContentProgress = useRef(new Animated.Value(1)).current;
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [viewerState, setViewerState] = useState<{
    visible: boolean;
    images: string[];
    initialIndex: number;
  }>({
    visible: false,
    images: [],
    initialIndex: 0,
  });
  const profileAuthorId = isOwnProfile ? currentUser?.id : userId;
  const profileTargetKey = isOwnProfile
    ? (currentUser?.id ?? "me")
    : (userId ?? "unknown");
  const requestIdRef = useRef(0);
  const analyticsRequestIdRef = useRef(0);
  const aboutRequestIdRef = useRef(0);
  const loadProfileRef = useRef<((options?: { isRefresh?: boolean }) => Promise<void>) | null>(
    null,
  );

  const resolveProfileUserId = useCallback((): string | null => {
    if (isOwnProfile) {
      return currentUser?.id ?? null;
    }
    return userId ?? null;
  }, [currentUser?.id, isOwnProfile, userId]);

  const profileStatsUserId = resolveProfileUserId() ?? undefined;
  const { streak, syncStreakFromCache, refresh: refreshLearnerStats } =
    useLearnerStats(profileStatsUserId);
  const [freezingStreak, setFreezingStreak] = useState(false);
  const fetchGlobalLeaderboard = useLeaderboardStore((s) => s.fetchGlobalLeaderboard);
  const userGlobalStanding = useLeaderboardStore((s) => s.userGlobalStanding);

  const handleUseStreakFreeze = useCallback(() => {
    const resolvedId = resolveProfileUserId();
    if (!resolvedId || !isOwnProfile) return;

    Alert.alert(
      t("profile.performance.streakFreezeTitle"),
      t("profile.performance.streakFreezeConfirm", {
        count: streak?.freezesAvailable ?? 0,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.performance.useStreakFreeze"),
          onPress: async () => {
            setFreezingStreak(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await applyStreakFreeze(resolvedId);
              await refreshLearnerStats(true);
              await cancelStreakAtRiskReminder();
              Alert.alert(
                t("common.success"),
                t("profile.performance.streakFreezeSuccess"),
              );
            } catch {
              Alert.alert(
                t("common.error"),
                t("profile.performance.streakFreezeError"),
              );
            } finally {
              setFreezingStreak(false);
            }
          },
        },
      ],
    );
  }, [
    isOwnProfile,
    refreshLearnerStats,
    resolveProfileUserId,
    streak?.freezesAvailable,
    t,
  ]);

  useEffect(() => {
    if (isOwnProfile) {
      void fetchGlobalLeaderboard();
    }
  }, [fetchGlobalLeaderboard, isOwnProfile]);

  const syncPerformanceFromCache = useCallback((resolvedUserId: string) => {
    syncStreakFromCache(resolvedUserId);
    const summary = getCachedPerformanceSummary(resolvedUserId);
    if (summary) {
      setQuizStats(mapSummaryToQuizUserStats(summary));
    }
    const visitors = getCachedProfileVisitors(resolvedUserId);
    if (visitors && visitors.length > 0) {
      setRecentProfileVisitors(visitors);
      setVisitorsLoading(false);
    }
  }, [syncStreakFromCache]);
  const aboutLoadedRef = useRef(false);
  const loadingAboutRef = useRef(false);
  const interactionTaskRef = useRef<ReturnType<
    typeof InteractionManager.runAfterInteractions
  > | null>(null);

  useEffect(() => {
    aboutLoadedRef.current = aboutLoaded;
  }, [aboutLoaded]);

  useEffect(() => {
    loadingAboutRef.current = loadingAbout;
  }, [loadingAbout]);

  const loadAnalyticsFast = useCallback(
    async (resolvedUserId: string) => {
      syncPerformanceFromCache(resolvedUserId);

      try {
        await fetchPerformanceStatsSummary(resolvedUserId);
      } catch {
        // Keep cached / prior values
      }

      const summary = getCachedPerformanceSummary(resolvedUserId);
      if (summary) {
        setQuizStats(mapSummaryToQuizUserStats(summary));
      }
    },
    [syncPerformanceFromCache],
  );

  const loadAnalyticsFull = useCallback(
    async (resolvedUserId: string, requestId: number) => {
      const analyticsRequestId = ++analyticsRequestIdRef.current;

      const [qStats, uAch, allAch] = await Promise.all([
        fetchUserStatsCached(resolvedUserId).catch(() => null),
        statsAPI.getUserAchievements(resolvedUserId).catch(() => []),
        statsAPI.getAchievements().catch(() => []),
      ]);

      if (
        requestId !== requestIdRef.current ||
        analyticsRequestId !== analyticsRequestIdRef.current
      ) {
        return;
      }

      if (qStats) setQuizStats(qStats);
      setUserAchievements(uAch || []);
      setAllAchievements(allAch || []);
    },
    [],
  );

  const loadProfileVisitors = useCallback(
    async (resolvedUserId: string) => {
      const cached = getCachedProfileVisitors(resolvedUserId);
      if (cached && cached.length > 0) {
        setRecentProfileVisitors(cached);
        setVisitorsLoading(false);
      } else {
        setVisitorsLoading(true);
      }

      try {
        const visitors = await fetchProfileVisitorsPreviewCached(resolvedUserId);
        setRecentProfileVisitors(visitors);
        setVisitorsLoading(false);
      } catch {
        const cachedAfterError = getCachedProfileVisitors(resolvedUserId);
        setRecentProfileVisitors(cachedAfterError ?? []);
        setVisitorsLoading(false);
      }
    },
    [],
  );

  const loadAboutData = useCallback(
    async (targetId: string, requestId: number) => {
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

        if (
          requestId !== requestIdRef.current ||
          aboutRequestId !== aboutRequestIdRef.current
        ) {
          return;
        }

        setEducation(eduData || []);
        setExperiences(expData || []);
        setCertifications(certData || []);
        setAboutLoaded(true);
      } catch (error) {
        if (
          requestId !== requestIdRef.current ||
          aboutRequestId !== aboutRequestIdRef.current
        ) {
          return;
        }

        if (__DEV__) { console.error("Failed to load profile about data:", error); }
        setEducation([]);
        setExperiences([]);
        setCertifications([]);
        setAboutLoaded(true);
      } finally {
        if (
          requestId === requestIdRef.current &&
          aboutRequestId === aboutRequestIdRef.current
        ) {
          setLoadingAbout(false);
        }
      }
    },
    [],
  );

  const loadProfile = useCallback(
    async (options?: { isRefresh?: boolean }) => {
      const requestId = ++requestIdRef.current;
      const targetId = isOwnProfile ? "me" : userId!;
      const resolvedUserId = resolveProfileUserId();
      const showBlockingLoader =
        !options?.isRefresh && (!isOwnProfile || !currentUser);

      if (isOwnProfile && !resolvedUserId) {
        return;
      }

      if (!isOwnProfile) {
        setProfile(null);
      } else if (currentUser) {
        setProfile(currentUser);
      }

      if (showBlockingLoader) {
        setLoading(true);
      }

      if (options?.isRefresh && resolvedUserId) {
        invalidatePerformanceStatsCache(resolvedUserId);
        if (isOwnProfile) {
          invalidateProfileVisitorsCache(resolvedUserId);
        }
      }

      try {
        if (resolvedUserId) {
          syncPerformanceFromCache(resolvedUserId);
          void loadAnalyticsFast(resolvedUserId);
          if (isOwnProfile) {
            void loadProfileVisitors(resolvedUserId);
          }
        }

        const tProfile = Date.now();
        const profileData = await apiFetchProfile(targetId);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setProfile(profileData as any);
        setProfileStats(profileData.stats);
        setIsFollowing(profileData.isFollowing || false);
        setLoading(false);

        if (isOwnProfile && resolvedUserId) {
          writeProfileToCache(profileData, resolvedUserId);
          if (__DEV__) console.log(`[Profile TTI] settle (${Date.now() - tProfile}ms)`);
        }

        if (!isOwnProfile && resolvedUserId) {
          void loadAnalyticsFast(resolvedUserId);
        }

        interactionTaskRef.current?.cancel();
        interactionTaskRef.current = InteractionManager.runAfterInteractions(
          () => {
            if (resolvedUserId) {
              void loadAnalyticsFull(resolvedUserId, requestId);
            }
            loadAboutData(targetId, requestId);
          },
        );
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (__DEV__) { console.error("Failed to load profile:", error); }
        if (isOwnProfile && currentUser) {
          setProfile(currentUser);
        }
        setVisitorsLoading(false);
        setLoading(false);
      } finally {
        if (showBlockingLoader && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [
      currentUser,
      isOwnProfile,
      loadAboutData,
      loadAnalyticsFast,
      loadAnalyticsFull,
      loadProfileVisitors,
      resolveProfileUserId,
      syncPerformanceFromCache,
      userId,
    ],
  );

  loadProfileRef.current = loadProfile;

  useEffect(() => {
    setLoadingAbout(false);
    setAboutLoaded(false);
    setEducation([]);
    setExperiences([]);
    setCertifications([]);
    const resolvedId = resolveProfileUserId();
    const cachedSummary = resolvedId
      ? getCachedPerformanceSummary(resolvedId)
      : null;
    const cachedVisitors = resolvedId
      ? getCachedProfileVisitors(resolvedId)
      : null;
    setQuizStats(cachedSummary ? mapSummaryToQuizUserStats(cachedSummary) : null);
    setRecentProfileVisitors(cachedVisitors ?? []);
    setVisitorsLoading(
      isOwnProfile && !!resolvedId && !(cachedVisitors && cachedVisitors.length > 0),
    );
    if (resolvedId) {
      syncStreakFromCache(resolvedId);
    }
    setUserAchievements([]);
    setAllAchievements([]);

    if (isOwnProfile && currentUser) {
      setProfile(currentUser);
      setLoading(false);
    } else {
      setProfile(null);
      setLoading(true);
    }

    if (resolvedId) {
      void loadProfileRef.current?.();
    }

    return () => {
      interactionTaskRef.current?.cancel();
    };
  }, [currentUser?.id, isOwnProfile, profileTargetKey, resolveProfileUserId, syncStreakFromCache]);

  useFocusEffect(
    useCallback(() => {
      const resolvedId = resolveProfileUserId();
      if (!resolvedId) return;
      syncPerformanceFromCache(resolvedId);
      void loadAnalyticsFast(resolvedId);
      if (isOwnProfile) {
        void loadProfileVisitors(resolvedId);
      }
    }, [
      isOwnProfile,
      loadAnalyticsFast,
      loadProfileVisitors,
      resolveProfileUserId,
      syncPerformanceFromCache,
    ]),
  );

  useEffect(() => {
    if (isOwnProfile || !userId) {
      return;
    }

    const viewedAt = Date.now();
    trackProfileView(userId, "profile_screen").catch((error) => {
      if (__DEV__) { console.log("Profile view tracking skipped:", error?.message || error); }
    });

    return () => {
      const dwellMs = Date.now() - viewedAt;
      if (dwellMs > 1000) {
        trackProfileView(userId, "profile_screen", dwellMs).catch(() => {});
      }
    };
  }, [isOwnProfile, userId]);

  useEffect(() => {
    if (activeTab !== "performance") return;
    const resolvedId = resolveProfileUserId();
    if (!resolvedId) return;
    syncPerformanceFromCache(resolvedId);
  }, [activeTab, resolveProfileUserId, syncPerformanceFromCache]);

  useEffect(() => {
    if (activeTab === "about" && !aboutLoaded && !loadingAbout) {
      loadAboutData(isOwnProfile ? "me" : userId!, requestIdRef.current);
    }
  }, [
    activeTab,
    aboutLoaded,
    loadingAbout,
    loadAboutData,
    isOwnProfile,
    userId,
  ]);

  useEffect(() => {
    tabContentProgress.setValue(0);
    Animated.timing(tabContentProgress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabContentProgress]);

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
        setProfileStats((prev) =>
          prev ? { ...prev, followers: prev.followers - 1 } : prev,
        );
      } else {
        await followUser(userId);
        setIsFollowing(true);
        setProfileStats((prev) =>
          prev ? { ...prev, followers: prev.followers + 1 } : prev,
        );
      }
    } catch (error) {
      if (__DEV__) { console.error("Follow/unfollow failed:", error); }
    }
  }, [isFollowing, userId]);

  const handleEditProfile = useCallback(() => {
    navigation.navigate("EditProfile" as any);
  }, [navigation]);

  // Share the public profile URL (works logged-out via /public/u/:username).
  const handleShareProfile = useCallback(async () => {
    const username = (profile as any)?.username || currentUser?.username;
    if (!username) {
      Alert.alert("Profile link unavailable", "Set a username first to share your profile.");
      return;
    }
    const url = `https://stunity.app/u/${username}`;
    const name = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
    try {
      await Share.share({
        message: name ? `Check out ${name}'s learning profile on Stunity: ${url}` : url,
        url,
        title: "My Stunity profile",
      });
    } catch (_) {/* user cancelled */}
  }, [profile, currentUser?.username]);

  // ── Photo Upload Handlers ───────────────────────────────────

  const handlePickProfilePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      // Immediate UI update (optimistic)
      setProfile((prev) =>
        prev ? { ...prev, profilePictureUrl: asset.uri } : prev,
      );
      setUploadingPhoto(true);

      try {
        const fileName = asset.uri.split("/").pop() || "profile.jpg";
        const data = await uploadProfilePhoto(
          asset.uri,
          fileName,
          asset.mimeType || "image/jpeg",
        );
        const photoUrl = (data as any).profilePictureUrl;

        // Persist to backend and update local/global state
        await updateProfile({ profilePictureUrl: photoUrl } as any);
        updateUser({ profilePictureUrl: photoUrl });
        setProfile((prev) =>
          prev ? { ...prev, profilePictureUrl: photoUrl } : prev,
        );
      } catch (e) {
        if (__DEV__) { console.error("Profile photo upload failed:", e); }
        // Rollback on error if needed, but usually the old one is still in currentUser
        Alert.alert(t("profile.uploadError"), t("profile.uploadErrorMsg"));
        setProfile(isOwnProfile ? currentUser : null);
      } finally {
        setUploadingPhoto(false);
      }
    }
  }, [updateUser, isOwnProfile, currentUser]);

  const handlePickCoverPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      // Immediate UI update (optimistic)
      setProfile((prev) =>
        prev ? { ...prev, coverPhotoUrl: asset.uri } : prev,
      );
      setUploadingCover(true);

      try {
        const fileName = asset.uri.split("/").pop() || "cover.jpg";
        const data = await uploadCoverPhoto(
          asset.uri,
          fileName,
          asset.mimeType || "image/jpeg",
        );
        const photoUrl = (data as any).coverPhotoUrl;

        // Persist to backend and update local/global state
        await updateProfile({ coverPhotoUrl: photoUrl } as any);
        updateUser({ coverPhotoUrl: photoUrl } as any);
        setProfile((prev) =>
          prev ? { ...prev, coverPhotoUrl: photoUrl } : prev,
        );
      } catch (e) {
        if (__DEV__) { console.error("Cover photo upload failed:", e); }
        Alert.alert(t("profile.uploadError"), t("profile.coverUploadErrorMsg"));
        setProfile(isOwnProfile ? currentUser : null);
      } finally {
        setUploadingCover(false);
      }
    }
  }, [updateUser, isOwnProfile, currentUser]);

  const openProfileMedia = useCallback(
    (target: "cover" | "avatar") => {
      const coverUrl = (profile as any)?.coverPhotoUrl as string | undefined;
      const avatarUrl = profile?.profilePictureUrl;
      const images = [coverUrl, avatarUrl].filter(Boolean) as string[];
      const targetUri = target === "cover" ? coverUrl : avatarUrl;
      if (!targetUri) return;

      setViewerState({
        visible: true,
        images,
        initialIndex: Math.max(0, images.indexOf(targetUri)),
      });
    },
    [profile],
  );

  // Own profile shows the complete, paginated archive from /my-posts (includes
  // reposts with their quoted card). Other profiles fall back to whatever posts
  // are already loaded in the feed (no public user-posts endpoint yet).
  const profilePosts = useMemo(() => {
    if (isOwnProfile) {
      return Array.isArray(myPosts) ? myPosts : [];
    }
    return (Array.isArray(feedItems) ? feedItems : [])
      .filter(
        (i: any) => i.type === "POST" && i.data?.author?.id === profileAuthorId,
      )
      .map((i: any) => i.data);
  }, [isOwnProfile, myPosts, feedItems, profileAuthorId]);

  // Load the full archive when the owner opens their Posts tab.
  useEffect(() => {
    if (isOwnProfile && activeTab === "posts") {
      fetchMyPosts();
    }
  }, [isOwnProfile, activeTab, fetchMyPosts]);

  const noop = useCallback(() => {}, []);
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
    [navigation, noop],
  );

  const tabs = useMemo(
    () => [
      {
        id: "performance" as const,
        label: t("profile.performance.title"),
        icon: "trending-up",
      },
      { id: "posts" as const, label: t("profile.posts"), icon: "list" },
      { id: "about" as const, label: t("profile.about.title"), icon: "person" },
      {
        id: "activity" as const,
        label: t("profile.activity.title"),
        icon: "flame",
      },
    ],
    [t],
  );

  const profileListData = useMemo(() => {
    if (activeTab === "posts") {
      return profilePosts.length > 0
        ? profilePosts.map((post: any) => ({
            key: `post-${post.id}`,
            type: "post",
            post,
          }))
        : [{ key: "posts-empty", type: "posts-empty" }];
    }

    return [{ key: `tab-${activeTab}`, type: activeTab }];
  }, [activeTab, profilePosts]);

  // FlashList will not re-render tab cells when visitor/quiz state changes unless
  // extraData changes — without this, the visitor skeleton stays until tab switch.
  const profileListExtraData = useMemo(
    () => ({
      activeTab,
      visitorsLoading,
      recentProfileVisitors,
      quizStats,
      streak,
      profileStats,
      userAchievementsCount: userAchievements.length,
    }),
    [
      activeTab,
      visitorsLoading,
      recentProfileVisitors,
      quizStats,
      streak,
      profileStats,
      userAchievements.length,
    ],
  );

  const tabContentAnimatedStyle = useMemo(
    () => ({
      opacity: tabContentProgress,
      transform: [
        {
          translateY: tabContentProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [8, 0],
          }),
        },
      ],
    }),
    [tabContentProgress],
  );

  // ── Shimmer Loading State — matches actual profile layout ──────
  if (showSkeleton) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar
          style={isDark ? "light" : "dark"}
          backgroundColor={colors.background}
        />
        <View style={{ flex: 1 }}>
          <LinearGradient
            colors={
              isDark
                ? ["#000000", "#061512", "#000000"]
                : ["#FFFFFF", "#F5F0FF", "#EEF7FF"]
            }
            style={StyleSheet.absoluteFill}
          />

          {/* Cover shimmer — exact same height as real screen */}
          <View
            style={{
              height: coverHeight,
              backgroundColor: colors.surfaceVariant,
            }}
          />

          {/* Content container — matches real marginTop overlap */}
          <View style={[styles.contentContainer, { marginTop: contentOverlap }]}>
            {/* Avatar — centred, white ring, overlapping cover */}
            <View style={styles.avatarSection}>
              <View
                style={[
                  styles.avatarWrapper,
                  {
                    backgroundColor: colors.surfaceVariant,
                    shadowOpacity: 0,
                    width: avatarRing,
                    height: avatarRing,
                    borderRadius: avatarRing / 2,
                  },
                ]}
              >
                <Skeleton width={avatarSize} height={avatarSize} borderRadius={avatarSize / 2} />
              </View>
            </View>

            {/* Name + role badge + headline — matches nameSection alignItems center */}
            <View
              style={[styles.nameSection, { alignItems: "center", gap: 10 }]}
            >
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
                <Skeleton
                  width={48}
                  height={13}
                  borderRadius={6}
                  style={{ marginTop: 4 }}
                />
              </View>
              <View style={styles.statDivider} />
              <View style={styles.textStat}>
                <Skeleton width={28} height={24} borderRadius={6} />
                <Skeleton
                  width={64}
                  height={13}
                  borderRadius={6}
                  style={{ marginTop: 4 }}
                />
              </View>
              <View style={styles.statDivider} />
              <View style={styles.textStat}>
                <Skeleton width={28} height={24} borderRadius={6} />
                <Skeleton
                  width={64}
                  height={13}
                  borderRadius={6}
                  style={{ marginTop: 4 }}
                />
              </View>
            </View>

            {/* Action Buttons — full-width flex row, matches capsuleRow */}
            <View style={styles.capsuleRow}>
              <Skeleton style={{ flex: 1 }} height={48} borderRadius={50} />
              <Skeleton style={{ flex: 1 }} height={48} borderRadius={50} />
            </View>

            {/* Tabs — matches tabsScroll padding + gap */}
            <View
              style={[
                {
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  gap: 8,
                  marginBottom: 16,
                },
              ]}
            >
              <Skeleton width={110} height={36} borderRadius={12} />
              <Skeleton width={80} height={36} borderRadius={12} />
              <Skeleton width={80} height={36} borderRadius={12} />
              <Skeleton width={80} height={36} borderRadius={12} />
            </View>

            {/* Tab content — two perf stat cards */}
            <View style={[styles.tabContent]}>
              <Skeleton width="100%" height={140} borderRadius={16} />
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
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
      edges={["top"]}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.background}
      />
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={
            isDark
              ? ["#000000", "#061512", "#000000"]
              : ["#FFFFFF", "#F5F0FF", "#EEF7FF"]
          }
          style={StyleSheet.absoluteFill}
        />
        {!isDark && (
          <View
            style={[styles.bodyWaveWrap, { top: 240, left: -40, opacity: 0.8 }]}
          >
            <View
              style={[
                styles.bodyGeoSquare,
                {
                  backgroundColor: "#38BDF8",
                  width: 180,
                  height: 180,
                  opacity: 0.12,
                  borderRadius: 40,
                  transform: [{ rotate: "45deg" }],
                },
              ]}
            />
            <View
              style={[
                styles.bodyGeoSquare,
                {
                  backgroundColor: "#2DD4BF",
                  width: 120,
                  height: 120,
                  top: 100,
                  left: 60,
                  opacity: 0.1,
                  borderRadius: 30,
                  transform: [{ rotate: "45deg" }],
                },
              ]}
            />
            <View
              style={[
                styles.bodyGeoSquare,
                {
                  backgroundColor: "#22D3EE",
                  width: 80,
                  height: 80,
                  top: -20,
                  left: 140,
                  opacity: 0.08,
                  borderRadius: 20,
                  transform: [{ rotate: "45deg" }],
                },
              ]}
            />
          </View>
        )}

        <View style={[styles.profileBody, isProfileRailTablet && styles.profileThreeColumnBody]}>
          {isProfileRailTablet && (
            <View style={styles.profileLeftRail}>
              <View style={[styles.profileRailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.profileRailIdentity}>
                  <Avatar
                    uri={(profile as any).profilePhotoUrl || (profile as any).avatar}
                    name={fullName}
                    size="xl"
                  />
                  <View style={styles.profileRailIdentityText}>
                    <Text numberOfLines={1} style={[styles.profileRailName, { color: colors.text }]}>{fullName}</Text>
                    <Text numberOfLines={1} style={[styles.profileRailRole, { color: colors.textSecondary }]}>
                      {profile.role || t("profile.student")}
                    </Text>
                  </View>
                </View>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={[
                        styles.profileRailTab,
                        { backgroundColor: colors.surfaceVariant },
                        isActive && styles.profileRailTabActive,
                      ]}
                      onPress={() => setActiveTab(tab.id as any)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={tab.icon as any} size={18} color={isActive ? BRAND_TEAL_DARK : colors.textSecondary} />
                      <Text style={[styles.profileRailTabText, { color: isActive ? BRAND_TEAL_DARK : colors.text }]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <FlashList
          style={layout.isTablet ? [styles.tabletListShell, isProfileRailTablet && styles.tabletCenterList] : undefined}
          data={profileListData}
          extraData={profileListExtraData}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          // @ts-ignore ignore type error with flash list sizes
          estimatedItemSize={activeTab === "posts" ? 430 : 1000}
          getItemType={(item: any) => item.type}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 20) + 100,
            paddingHorizontal: layout.isTablet ? (isProfileRailTablet ? 0 : 24) : 0,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <>
              {/* Cover Photo Section */}
              <View style={[styles.coverSection, { height: coverHeight }]}>
                {(profile as any)?.coverPhotoUrl ? (
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={() => openProfileMedia("cover")}
                    activeOpacity={0.92}
                  >
                    <ExpoImage
                      source={{ uri: (profile as any).coverPhotoUrl }}
                      style={styles.coverGradient}
                      contentFit="cover"
                      transition={150}
                      cachePolicy="memory-disk"
                    />
                    {uploadingCover && (
                      <View
                        style={[
                          StyleSheet.absoluteFill,
                          {
                            backgroundColor: "rgba(0,0,0,0.3)",
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}
                      >
                        <ActivityIndicator color="#fff" size="large" />
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  // Default: Beautiful gradient + abstract pattern placeholder
                  <LinearGradient
                    colors={
                      isDark ? ["#00110F", "#071A17"] : ["#F0F9FF", "#E0F2FE"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.coverPlaceholder,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceVariant
                          : "#F0F9FF",
                      },
                    ]}
                  >
                    <View style={styles.coverDecorCircle1} />
                    <View style={styles.coverDecorCircle2} />
                    <View style={styles.coverDecorCircle3} />
                    {isOwnProfile && (
                      <TouchableOpacity
                        style={styles.coverHint}
                        onPress={handlePickCoverPhoto}
                        activeOpacity={0.7}
                      >
                        {uploadingCover ? (
                          <ActivityIndicator color={BRAND_TEAL} />
                        ) : (
                          <Text style={styles.coverHintText}>
                            {t("profile.addCover")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </LinearGradient>
                )}

                {/* Header Buttons */}
                <View style={[styles.headerButtons, { paddingTop: 12 }]}>
                  <View style={styles.headerTopRow}>
                    {!isOwnProfile && (
                      <TouchableOpacity
                        style={[
                          styles.headerCircleBtnDark,
                          {
                            backgroundColor: colors.surfaceVariant,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => navigation.goBack()}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={22}
                          color={colors.text}
                        />
                      </TouchableOpacity>
                    )}

                    <View style={{ flex: 1 }} />

                    {isOwnProfile && (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          style={[
                            styles.headerCircleBtnDark,
                            {
                              backgroundColor: colors.surfaceVariant,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={() => navigation.navigate("MyQRCard" as any)}
                        >
                          <Ionicons
                            name="qr-code-outline"
                            size={20}
                            color={colors.text}
                          />
                        </TouchableOpacity>
                        {FEATURE_FLAGS.MESSAGING_ENABLED ? (
                          <TouchableOpacity
                            style={[
                              styles.headerCircleBtnDark,
                              {
                                backgroundColor: colors.surfaceVariant,
                                borderColor: colors.border,
                              },
                            ]}
                            onPress={() =>
                              navigation.navigate("Messages" as any, {
                                screen: "Conversations",
                              })
                            }
                          >
                            <Ionicons
                              name="chatbubbles-outline"
                              size={20}
                              color={colors.text}
                            />
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          style={[
                            styles.headerCircleBtnDark,
                            {
                              backgroundColor: colors.surfaceVariant,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={handleShareProfile}
                        >
                          <Ionicons
                            name="share-social-outline"
                            size={20}
                            color={colors.text}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.headerCircleBtnDark,
                            {
                              backgroundColor: colors.surfaceVariant,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={() => navigation.navigate("Settings" as any)}
                        >
                          <Ionicons
                            name="settings-outline"
                            size={20}
                            color={colors.text}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.headerCircleBtnDark,
                            {
                              backgroundColor: colors.surfaceVariant,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={handlePickCoverPhoto}
                        >
                          <Ionicons
                            name="camera-outline"
                            size={20}
                            color={colors.text}
                          />
                        </TouchableOpacity>
                      </View>
                    )}

                    {!isOwnProfile && (
                      <TouchableOpacity
                        style={[
                          styles.headerCircleBtnDark,
                          {
                            backgroundColor: colors.surfaceVariant,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={20}
                          color={colors.text}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Profile Content */}
              <View
                style={[
                  styles.contentContainer,
                  { marginTop: contentOverlap },
                ]}
              >
                {/* Avatar Section */}
                <Animated.View style={styles.avatarSection}>
                  <View
                    style={[
                      styles.avatarWrapper,
                      {
                        backgroundColor: colors.card,
                        shadowOpacity: isDark ? 0 : 0.08,
                        width: avatarRing,
                        height: avatarRing,
                        borderRadius: avatarRing / 2,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: avatarSize / 2,
                        overflow: "hidden",
                        backgroundColor: colors.surfaceVariant,
                      }}
                      onPress={() =>
                        profile.profilePictureUrl
                          ? openProfileMedia("avatar")
                          : isOwnProfile
                            ? handlePickProfilePhoto()
                            : undefined
                      }
                      activeOpacity={0.9}
                    >
                      <Avatar
                        uri={profile.profilePictureUrl}
                        name={fullName}
                        size="3xl"
                        showBorder={false}
                        gradientBorder="none"
                        style={{ width: avatarSize, height: avatarSize }}
                      />
                      {uploadingPhoto && (
                        <View
                          style={[
                            StyleSheet.absoluteFill,
                            {
                              backgroundColor: "rgba(0,0,0,0.3)",
                              justifyContent: "center",
                              alignItems: "center",
                            },
                          ]}
                        >
                          <ActivityIndicator color="#fff" size="large" />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Edit Avatar Button */}
                    {isOwnProfile && (
                      <TouchableOpacity
                        style={styles.editAvatarButton}
                        onPress={handlePickProfilePhoto}
                      >
                        <View
                          style={[
                            styles.editAvatarCircle,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.background,
                            },
                          ]}
                        >
                          <Ionicons
                            name="camera-outline"
                            size={16}
                            color="#09CFF7"
                          />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>

                {/* Name & Bio — Frosted glass card */}
                <Animated.View style={styles.nameSection}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[
                        styles.name,
                        { color: colors.text },
                        layout.isTablet && { fontSize: 28, letterSpacing: -0.6 },
                      ]}
                    >
                      {fullName}
                    </Text>
                    {profile.isVerified && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#3B82F6"
                        style={{ marginTop: 2 }}
                      />
                    )}
                  </View>
                  {(profile.englishFirstName || profile.englishLastName) && (
                    <Text
                      style={[
                        styles.englishName,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {profile.englishLastName} {profile.englishFirstName}
                    </Text>
                  )}

                  {/* Role Badge — shows the actual role for all user types */}
                  {profile.role && (
                    <Animated.View style={styles.roleBadgeWrap}>
                      <LinearGradient
                        colors={
                          profile.role === "TEACHER"
                            ? ["#6366F1", "#8B5CF6"]
                            : profile.role === "ADMIN"
                              ? ["#DC2626", "#B91C1C"]
                              : profile.role === "SCHOOL_ADMIN"
                                ? ["#D97706", "#B45309"]
                                : profile.role === "SUPER_ADMIN"
                                  ? ["#DC2626", "#991B1B"] // SUPER_ADMIN theme
                                  : profile.role === "PARENT"
                                    ? ["#059669", "#047857"]
                                    : profile.role === "STAFF"
                                      ? ["#7C3AED", "#6D28D9"]
                                      : ["#0EA5E9", "#0284C7"] // STUDENT default
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.roleBadgeGradient}
                      >
                        <Ionicons
                          name={
                            profile.role === "TEACHER"
                              ? "school"
                              : profile.role === "ADMIN" ||
                                  profile.role === "SUPER_ADMIN" ||
                                  profile.role === "SCHOOL_ADMIN"
                                ? "shield-checkmark"
                                : profile.role === "PARENT"
                                  ? "people"
                                  : profile.role === "STAFF"
                                    ? "briefcase"
                                    : "person"
                          }
                          size={12}
                          color="#fff"
                        />
                        <Text style={styles.roleBadgeText}>
                          {profile.role === "TEACHER"
                            ? t("profile.roles.teacher")
                            : profile.role === "ADMIN"
                              ? t("profile.roles.admin")
                              : profile.role === "SUPER_ADMIN"
                                ? t("profile.roles.superAdmin")
                                : profile.role === "SCHOOL_ADMIN"
                                  ? t("profile.roles.schoolAdmin")
                                  : profile.role === "PARENT"
                                    ? t("profile.roles.parent")
                                    : profile.role === "STAFF"
                                      ? t("profile.roles.staff")
                                      : t("profile.roles.student")}
                        </Text>
                      </LinearGradient>
                    </Animated.View>
                  )}

                  {profile.headline ? (
                    <Text
                      style={[styles.headline, { color: colors.textSecondary }]}
                    >
                      {profile.headline || profile.professionalTitle}
                    </Text>
                  ) : null}

                  {/* Open to Opportunities Banner */}
                  {(profile as any).isOpenToOpportunities && (
                    <Animated.View style={styles.openToWorkBanner}>
                      <LinearGradient
                        colors={["#10B981", "#059669"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.openToWorkGradient}
                      >
                        <Ionicons name="briefcase" size={12} color="#fff" />
                        <Text style={styles.openToWorkText}>
                          {t("profile.openToOpportunities")}
                        </Text>
                      </LinearGradient>
                    </Animated.View>
                  )}

                  {profile.bio ? (
                    <Text style={[styles.bio, { color: colors.textSecondary }]}>
                      {profile.bio}
                    </Text>
                  ) : null}

                  {/* Social Links & Meta */}
                  <View style={styles.socialRow}>
                    {profile.location && (
                      <View
                        style={[
                          styles.socialBadge,
                          { backgroundColor: colors.surfaceVariant },
                        ]}
                      >
                        <Ionicons
                          name="location-outline"
                          size={14}
                          color={colors.textTertiary}
                        />
                        <Text
                          style={[
                            styles.socialBadgeText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {profile.location}
                        </Text>
                      </View>
                    )}
                    {(profile as any).linkedinUrl && (
                      <TouchableOpacity
                        style={[
                          styles.socialBadge,
                          { backgroundColor: colors.surfaceVariant },
                        ]}
                        onPress={() => {
                          const { Linking } = require("react-native");
                          Linking.openURL((profile as any).linkedinUrl);
                        }}
                      >
                        <Ionicons
                          name="logo-linkedin"
                          size={14}
                          color="#0077B5"
                        />
                        <Text
                          style={[styles.socialBadgeText, { color: "#0077B5" }]}
                        >
                          {t("common.linkedin", "LinkedIn")}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {(profile as any).githubUrl && (
                      <TouchableOpacity
                        style={[
                          styles.socialBadge,
                          { backgroundColor: colors.surfaceVariant },
                        ]}
                        onPress={() => {
                          const { Linking } = require("react-native");
                          Linking.openURL((profile as any).githubUrl);
                        }}
                      >
                        <Ionicons
                          name="logo-github"
                          size={14}
                          color={colors.text}
                        />
                        <Text
                          style={[
                            styles.socialBadgeText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("common.github", "GitHub")}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>

                {/* Stats Row — pill card style */}
                <Animated.View style={styles.textStatsRow}>
                  <TouchableOpacity style={styles.textStat} activeOpacity={0.7}>
                    <Text
                      style={[styles.textStatValue, { color: colors.text }]}
                    >
                      {formatNumber(stats.posts)}
                    </Text>
                    <Text
                      style={[
                        styles.textStatLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("profile.stats.posts")}
                    </Text>
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />

                  <TouchableOpacity style={styles.textStat} activeOpacity={0.7}>
                    <Text
                      style={[styles.textStatValue, { color: colors.text }]}
                    >
                      {formatNumber(stats.followers)}
                    </Text>
                    <Text
                      style={[
                        styles.textStatLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("profile.stats.followers")}
                    </Text>
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />

                  <TouchableOpacity style={styles.textStat} activeOpacity={0.7}>
                    <Text
                      style={[styles.textStatValue, { color: colors.text }]}
                    >
                      {formatNumber(stats.following)}
                    </Text>
                    <Text
                      style={[
                        styles.textStatLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("profile.stats.following")}
                    </Text>
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
                        <Ionicons
                          name="create-outline"
                          size={16}
                          color="#fff"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.capsuleBtnFilledText}>
                          {t("profile.editProfile")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.userCardActionBtn}
                        onPress={() => navigation.navigate("UserCard" as any)}
                        activeOpacity={0.82}
                      >
                        <LinearGradient
                          colors={["#FFC53D", "#FFA600"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Ionicons
                          name="card-outline"
                          size={16}
                          color="#78350F"
                          style={{ marginRight: 5 }}
                        />
                        <Text style={styles.userCardActionText}>
                          {t("profile.userCard.cta", "Open My Education Card")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    // Other user's profile: Follow + Message
                    <>
                      <TouchableOpacity
                        style={
                          isFollowing
                            ? [
                                styles.capsuleBtn,
                                { backgroundColor: colors.card },
                              ]
                            : styles.capsuleBtnFilled
                        }
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
                        <Text
                          style={
                            isFollowing
                              ? styles.capsuleBtnText
                              : styles.capsuleBtnFilledText
                          }
                        >
                          {isFollowing
                            ? t("profile.following")
                            : t("profile.follow")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.capsuleBtnYellow}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={16}
                          color="#78350F"
                          style={{ marginRight: 5 }}
                        />
                        <Text style={styles.capsuleBtnYellowText}>
                          {t("profile.message")}
                        </Text>
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
                              <Ionicons
                                name={tab.icon as any}
                                size={18}
                                color={BRAND_TEAL}
                              />
                              <Text style={styles.tabTextActive}>
                                {tab.label}
                              </Text>
                              <View style={styles.tabActiveLine} />
                            </View>
                          ) : (
                            <>
                              <Ionicons
                                name={tab.icon as any}
                                size={18}
                                color={colors.textTertiary}
                              />
                              <Text
                                style={[
                                  styles.tabText,
                                  { color: colors.textTertiary },
                                ]}
                              >
                                {tab.label}
                              </Text>
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
          renderItem={({ item }: { item: any }) =>
            item.type === "post" ? (
              <Animated.View
                style={[{ paddingTop: 12 }, tabContentAnimatedStyle]}
              >
                <RenderPostItem
                  item={item.post}
                  handlersRef={profilePostHandlersRef as any}
                  isValued={false}
                  setAnalyticsPostId={noop}
                />
              </Animated.View>
            ) : item.type === "posts-empty" ? (
              <Animated.View
                style={[
                  styles.tabContent,
                  { paddingHorizontal: 0 },
                  tabContentAnimatedStyle,
                ]}
              >
                <View style={{ paddingTop: 12 }}>
                  <View
                    style={[
                      styles.contentPlaceholder,
                      {
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowOpacity: isDark ? 0 : undefined,
                      },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={48}
                      color={colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.placeholderText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("profile.noPosts")}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ) : (
              <Animated.View
                style={[styles.tabContent, tabContentAnimatedStyle]}
              >
                {activeTab === "performance" && (
                  <PerformanceTab
                    quizStats={quizStats}
                    profileStats={profileStats}
                    streak={streak}
                    achievements={userAchievements}
                    totalAchievements={allAchievements.length || 12}
                    level={quizStats?.level ?? profile.level ?? 1}
                    totalPoints={
                      quizStats?.totalPoints ?? profile.totalPoints ?? 0
                    }
                    profile={profile}
                    recentVisitors={recentProfileVisitors}
                    visitorsLoading={visitorsLoading}
                    onViewProfileVisitors={() =>
                      navigation.navigate("ProfileVisitors", {
                        initialVisitors: recentProfileVisitors,
                      })
                    }
                    onViewAchievements={() =>
                      navigation.navigate("Achievements" as any)
                    }
                    onViewLeaderboard={() =>
                      navigation.navigate("Leaderboard" as any)
                    }
                    onViewStats={() => navigation.navigate("Stats" as any)}
                    onUseStreakFreeze={
                      isOwnProfile ? handleUseStreakFreeze : undefined
                    }
                    isFreezingStreak={freezingStreak}
                    leaderboardRank={userGlobalStanding?.rank ?? null}
                  />
                )}
                {activeTab === "about" && (
                  <View style={styles.aboutSection}>
                    {loadingAbout && !aboutLoaded && (
                      <View
                        style={[
                          styles.aboutLoadingCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            shadowOpacity: isDark ? 0 : undefined,
                          },
                        ]}
                      >
                        <Skeleton width="45%" height={18} borderRadius={8} />
                        <Skeleton
                          width="100%"
                          height={14}
                          borderRadius={7}
                          style={{ marginTop: 14 }}
                        />
                        <Skeleton
                          width="82%"
                          height={14}
                          borderRadius={7}
                          style={{ marginTop: 10 }}
                        />
                        <Skeleton
                          width="70%"
                          height={14}
                          borderRadius={7}
                          style={{ marginTop: 10 }}
                        />
                      </View>
                    )}

                    {/* Link School via Claim Code - Only for own profile when no school is assigned */}
                    {isOwnProfile && !profile.school && <LinkSchoolCard />}

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
                      <View
                        style={[
                          styles.aboutCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.aboutCardHeader}>
                          <Ionicons
                            name="person-circle-outline"
                            size={20}
                            color="#0EA5E9"
                          />
                          <Text
                            style={[
                              styles.aboutCardTitle,
                              { color: colors.text },
                            ]}
                          >
                            {t("profile.info.bio")}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.aboutCardText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {profile.bio}
                        </Text>
                      </View>
                    ) : null}

                    {/* Headline & Location */}
                    {(profile.headline ||
                      profile.location ||
                      profile.school) && (
                      <View
                        style={[
                          styles.aboutCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.aboutCardHeader}>
                          <Ionicons
                            name="information-circle-outline"
                            size={20}
                            color="#0EA5E9"
                          />
                          <Text
                            style={[
                              styles.aboutCardTitle,
                              { color: colors.text },
                            ]}
                          >
                            {t("profile.info.title")}
                          </Text>
                        </View>
                        {profile.headline ? (
                          <View style={styles.aboutInfoRow}>
                            <Ionicons
                              name="briefcase-outline"
                              size={16}
                              color={colors.textTertiary}
                            />
                            <Text
                              style={[
                                styles.aboutInfoText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {profile.headline}
                            </Text>
                          </View>
                        ) : null}
                        {profile.location ? (
                          <View style={styles.aboutInfoRow}>
                            <Ionicons
                              name="location-outline"
                              size={16}
                              color={colors.textTertiary}
                            />
                            <Text
                              style={[
                                styles.aboutInfoText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {profile.location}
                            </Text>
                          </View>
                        ) : null}
                        {profile.school ? (
                          <View style={styles.aboutInfoRow}>
                            <Ionicons
                              name="school-outline"
                              size={16}
                              color={colors.textTertiary}
                            />
                            <Text
                              style={[
                                styles.aboutInfoText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {profile.school.name}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}

                    {/* Education */}
                    {education.length > 0 && (
                      <View
                        style={[
                          styles.aboutCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.aboutCardHeader}>
                          <Ionicons
                            name="school-outline"
                            size={20}
                            color="#8B5CF6"
                          />
                          <Text
                            style={[
                              styles.aboutCardTitle,
                              { color: colors.text },
                            ]}
                          >
                            <AutoI18nText i18nKey="auto.mobile.screens_profile_ProfileScreen.k_5f232f32" />
                          </Text>
                        </View>
                        {education.map((edu) => (
                          <View key={edu.id} style={styles.timelineItem}>
                            <View
                              style={[
                                styles.timelineDot,
                                { backgroundColor: "#8B5CF6" },
                              ]}
                            />
                            <View style={styles.timelineContent}>
                              <Text
                                style={[
                                  styles.timelineTitle,
                                  { color: colors.text },
                                ]}
                              >
                                {edu.degree
                                  ? `${edu.degree} in ${edu.fieldOfStudy || ""}`
                                  : edu.school}
                              </Text>
                              <Text
                                style={[
                                  styles.timelineSubtitle,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {edu.school}
                              </Text>
                              <Text
                                style={[
                                  styles.timelineDate,
                                  { color: colors.textTertiary },
                                ]}
                              >
                                {new Date(edu.startDate).getFullYear()} –{" "}
                                {edu.isCurrent
                                  ? "Present"
                                  : edu.endDate
                                    ? new Date(edu.endDate).getFullYear()
                                    : ""}
                              </Text>
                              {edu.description ? (
                                <Text
                                  style={[
                                    styles.timelineDesc,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {edu.description}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Experience */}
                    {experiences.length > 0 && (
                      <View
                        style={[
                          styles.aboutCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.aboutCardHeader}>
                          <Ionicons
                            name="briefcase-outline"
                            size={20}
                            color="#10B981"
                          />
                          <Text
                            style={[
                              styles.aboutCardTitle,
                              { color: colors.text },
                            ]}
                          >
                            <AutoI18nText i18nKey="auto.mobile.screens_profile_ProfileScreen.k_7e1aa915" />
                          </Text>
                        </View>
                        {experiences.map((exp) => (
                          <View key={exp.id} style={styles.timelineItem}>
                            <View
                              style={[
                                styles.timelineDot,
                                { backgroundColor: "#10B981" },
                              ]}
                            />
                            <View style={styles.timelineContent}>
                              <Text
                                style={[
                                  styles.timelineTitle,
                                  { color: colors.text },
                                ]}
                              >
                                {exp.title}
                              </Text>
                              <Text
                                style={[
                                  styles.timelineSubtitle,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {exp.organization}
                                {exp.location ? ` · ${exp.location}` : ""}
                              </Text>
                              <Text
                                style={[
                                  styles.timelineDate,
                                  { color: colors.textTertiary },
                                ]}
                              >
                                {new Date(exp.startDate).getFullYear()} –{" "}
                                {exp.isCurrent
                                  ? "Present"
                                  : exp.endDate
                                    ? new Date(exp.endDate).getFullYear()
                                    : ""}
                              </Text>
                              {exp.description ? (
                                <Text
                                  style={[
                                    styles.timelineDesc,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {exp.description}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Project Showcase */}
                    <ProjectShowcase
                      stats={profileStats}
                      isOwnProfile={isOwnProfile}
                    />

                    {/* Certifications */}
                    <CertificationsSection certifications={certifications} />

                    {/* Skills & Interests */}
                    <SkillsSection
                      skills={profile.skills || []}
                      interests={profile.interests || []}
                    />

                    {/* Endorsable skills (UserSkill model w/ endorsements) */}
                    {profile.id ? (
                      <EndorsableSkills userId={profile.id} isOwnProfile={isOwnProfile} />
                    ) : null}

                    {/* Empty state — only if absolutely nothing */}
                    {aboutLoaded &&
                      !profile.bio &&
                      education.length === 0 &&
                      experiences.length === 0 &&
                      certifications.length === 0 &&
                      (!profile.skills || profile.skills.length === 0) &&
                      profile.interests.length === 0 &&
                      (profileStats?.projects ?? 0) === 0 &&
                      !(profile as any).careerGoals && (
                        <View
                          style={[
                            styles.contentPlaceholder,
                            {
                              backgroundColor: colors.card,
                              borderWidth: 1,
                              borderColor: colors.border,
                              shadowOpacity: isDark ? 0 : undefined,
                            },
                          ]}
                        >
                          <Ionicons
                            name="person-outline"
                            size={48}
                            color={colors.textTertiary}
                          />
                          <Text
                            style={[
                              styles.placeholderText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            <AutoI18nText i18nKey="auto.mobile.screens_profile_ProfileScreen.k_4df7f8cf" />
                          </Text>
                        </View>
                      )}
                  </View>
                )}
                {activeTab === "activity" && (
                  <ActivityTab
                    stats={profileStats}
                    posts={stats.posts}
                    followers={stats.followers}
                    recentAttempts={quizStats?.recentAttempts ?? []}
                    achievements={userAchievements}
                    streak={streak}
                  />
                )}
              </Animated.View>
            )
          }
          />

          {isThreeColumnTablet && (
            <View style={styles.profileRightRail}>
              <View style={[styles.profileRailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.profileRailTitle, { color: colors.text }]}>{t("profile.insights", "Profile Insights")}</Text>
                <View style={styles.profileRailStatsGrid}>
                  <View style={[styles.profileRailStatTile, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.profileRailStatValue, { color: colors.text }]}>{stats.posts}</Text>
                    <Text style={[styles.profileRailStatLabel, { color: colors.textSecondary }]}>{t("profile.posts")}</Text>
                  </View>
                  <View style={[styles.profileRailStatTile, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.profileRailStatValue, { color: colors.text }]}>{stats.followers}</Text>
                    <Text style={[styles.profileRailStatLabel, { color: colors.textSecondary }]}>{t("profile.followers")}</Text>
                  </View>
                  <View style={[styles.profileRailStatTile, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.profileRailStatValue, { color: colors.text }]}>{quizStats?.level ?? profile.level ?? 1}</Text>
                    <Text style={[styles.profileRailStatLabel, { color: colors.textSecondary }]}>Level</Text>
                  </View>
                  <View style={[styles.profileRailStatTile, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.profileRailStatValue, { color: colors.text }]}>{streak?.currentStreak ?? 0}</Text>
                    <Text style={[styles.profileRailStatLabel, { color: colors.textSecondary }]}>Streak</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.profileRailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.profileRailTitle, { color: colors.text }]}>{t("profile.quickActions", "Quick Actions")}</Text>
                <TouchableOpacity
                  style={[styles.profileRailButton, { backgroundColor: colors.surfaceVariant }]}
                  onPress={isOwnProfile ? handleEditProfile : handleFollow}
                  activeOpacity={0.8}
                >
                  <Ionicons name={isOwnProfile ? "create-outline" : isFollowing ? "person-remove-outline" : "person-add-outline"} size={18} color={BRAND_TEAL_DARK} />
                  <Text style={[styles.profileRailButtonText, { color: colors.text }]}>
                    {isOwnProfile ? t("profile.editProfile") : isFollowing ? t("profile.following") : t("profile.follow")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.profileRailButton, { backgroundColor: colors.surfaceVariant }]}
                  onPress={() => navigation.navigate("ProfileVisitors", { initialVisitors: recentProfileVisitors })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="eye-outline" size={18} color={BRAND_TEAL_DARK} />
                  <Text style={[styles.profileRailButtonText, { color: colors.text }]}>
                    {t("profile.profileVisitors", "Profile Visitors")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        <ImageViewerModal
          visible={viewerState.visible}
          images={viewerState.images}
          initialIndex={viewerState.initialIndex}
          onClose={() =>
            setViewerState((current) => ({ ...current, visible: false }))
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  tabletListShell: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
  },
  profileBody: {
    flex: 1,
  },
  profileThreeColumnBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 8,
    paddingTop: 14,
  },
  tabletCenterList: {
    flex: 1,
    maxWidth: undefined,
    alignSelf: "stretch",
  },
  profileLeftRail: {
    width: 260,
    flexShrink: 0,
  },
  profileRightRail: {
    width: 280,
    flexShrink: 0,
    paddingRight: 8,
    gap: 14,
  },
  profileRailCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  profileRailIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  profileRailIdentityText: {
    flex: 1,
    minWidth: 0,
  },
  profileRailName: {
    fontSize: 16,
    fontWeight: "900",
  },
  profileRailRole: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  profileRailTab: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  profileRailTabActive: {
    backgroundColor: "#ECFEFF",
  },
  profileRailTabText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  profileRailTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  profileRailStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileRailStatTile: {
    width: "48%",
    minHeight: 78,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  profileRailStatValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  profileRailStatLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  profileRailButton: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  profileRailButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
  errorText: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  coverSection: {
    height: COVER_HEIGHT,
    position: "relative",
    overflow: "hidden", // Contain decorative elements
  },
  coverGradient: {
    width: "100%",
    height: "100%",
  },
  coverDecorCircle: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 999,
  },
  coverPatternOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  headerButtons: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    flex: 1,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Dark variant for use over plain/grey cover background
  headerCircleBtnDark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  // Cover placeholder styles
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center", // Center the camera hint
    position: "relative",
    overflow: "hidden",
  },
  coverDecorCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(9, 207, 247, 0.07)",
    top: -60,
    right: -40,
  },
  coverDecorCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(9, 207, 247, 0.05)",
    bottom: -30,
    left: -20,
  },
  coverDecorCircle3: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(9, 207, 247, 0.08)",
    top: 40,
    left: 40,
  },
  coverHint: {
    alignItems: "center",
    zIndex: 10,
  },
  coverHintText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(0,0,0,0.40)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  editCoverButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  levelBadgeInline: {
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 14,
    overflow: "hidden",
    ...Shadows.sm,
  },
  levelBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  levelTextInline: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  openToWorkBanner: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "center",
  },
  openToWorkGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  openToWorkText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  contentContainer: {
    flex: 1,
    marginTop: -90,
  },
  bodyWaveWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  bodyGeoSquare: {
    position: "absolute",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 12,
  },
  avatarWrapper: {
    position: "relative",
    width: 168,
    height: 168,
    backgroundColor: "#fff",
    borderRadius: 84,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  editAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    ...Shadows.sm,
  },
  nameSection: {
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  englishName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: -2,
  },
  editPillSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    marginLeft: 4,
  },
  editPillTextSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  headline: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  bio: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  roleBadgeWrap: {
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "center",
  },
  roleBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 5,
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  socialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  socialBadgeText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  // ── Simple Text Stats ──
  textStatsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 20,
    paddingVertical: 8,
  },
  textStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },

  textStatValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  textStatLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
  },
  // ── Stat Row Divider ──
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
  },

  // ── Capsule Action Buttons ──
  capsuleRow: {
    flexDirection: "row",
    marginHorizontal: 12,
    gap: 10,
    marginBottom: 16,
  },
  capsuleBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: BRAND_TEAL,
    ...Shadows.sm,
  },
  capsuleBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: BRAND_TEAL,
  },
  capsuleBtnFilled: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 50,
    overflow: "hidden",
    ...Shadows.md,
  },
  capsuleBtnFilledText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  // Brand-yellow Message button
  capsuleBtnYellow: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: "#FFA600",
    ...Shadows.md,
  },
  capsuleBtnYellowText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#78350F",
  },
  userCardActionBtn: {
    borderRadius: 50,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingVertical: 14,
    ...Shadows.md,
  },
  userCardActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#78350F",
  },
  // ── Legacy (kept for followPill if needed elsewhere) ──
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#E0F2FE",
    borderWidth: 1.5,
    borderColor: "#7DD3FC",
  },
  editPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284C7",
  },
  editPillPrimary: {
    backgroundColor: "#0EA5E9",
    borderWidth: 0,
    borderColor: "transparent",
  },
  editPillTextPrimary: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnSecondary: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconBtnLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  // ── Follow pill ──
  followPill: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#0284C7",

    shadowOpacity: 0.2,
  },
  followPillFollowing: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowOpacity: 0,
  },
  followPillGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  followPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  followPillTextFollowing: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
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
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  highlightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  // ── Hero Progress Card ──
  heroCard: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#0284C7",

    shadowOpacity: 0.2,

    marginBottom: 16,
  },
  heroGradient: {
    borderRadius: 14,
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  heroDecor: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  heroStatsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    height: "70%",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
  },
  // ── Clean Stat Grid ──
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statGridCardWrapper: {
    width: "31%",
    borderRadius: 16,
    ...Shadows.sm,
    shadowOpacity: 0.08,
  },
  statGridCard: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  statGridIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statGridValue: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statGridLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  tabActive: {
    backgroundColor: "transparent",
  },
  tabActiveContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  tabActiveLine: {
    position: "absolute",
    bottom: -12,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#09CFF7",
    borderRadius: 2,
  },
  tabGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  tabTextActive: {
    fontSize: 15,
    fontWeight: "700",
    color: "#09CFF7",
  },
  tabContent: {
    paddingHorizontal: 12,
  },
  contentPlaceholder: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  placeholderText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 12,
    textAlign: "center",
  },
  // ── About Tab Styles ──
  aboutSection: {
    gap: 12,
    paddingTop: 12,
  },
  aboutLoadingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    ...Shadows.sm,
  },
  aboutCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    padding: 20,
  },
  aboutCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  aboutCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  aboutCardText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4B5563",
  },
  aboutInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  aboutInfoText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
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
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  timelineSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: "#4B5563",
    marginTop: 4,
  },
});
