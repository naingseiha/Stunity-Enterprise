/**
 * Performance Tab — Learning Analytics Dashboard
 *
 * Rich data-driven dashboard showing:
 * - XP & Level Progress Ring
 * - Quiz Performance with trend chart
 * - Learning Streak
 * - Achievement Showcase
 * - Leaderboard Position
 */

import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
  Text as SvgText,
} from "react-native-svg";
import type {
  UserStats as QuizUserStats,
  UserAchievement,
  Streak,
} from "@/services/stats";
import type { ProfileVisitor } from "@/api/profileApi";
import { LearningStreakCard } from "@/components/streak";
import { SubjectMasteryTree } from "./SubjectMasteryTree";
import { StreakLeaderboard } from "./StreakLeaderboard";
import { NextActionCard } from "./NextActionCard";
import { RoleOverviewCard } from "./RoleOverviewCard";
import type { UserStats as ProfileUserStats } from "@/types";
import {
  Colors,
  ColorScale,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from "@/config";
import { useThemeContext } from "@/contexts";
import { Avatar } from "@/components/common";

// ── Types ────────────────────────────────────────────────────────

interface PerformanceTabProps {
  quizStats: QuizUserStats | null;
  profileStats: ProfileUserStats | null;
  streak: Streak | null;
  achievements: UserAchievement[];
  totalAchievements: number;
  level: number;
  totalPoints: number;
  profile: any;
  isOwnProfile?: boolean;
  recentVisitors?: ProfileVisitor[];
  visitorsLoading?: boolean;
  onViewProfileVisitors?: () => void;
  onViewAchievements?: () => void;
  onViewLeaderboard?: () => void;
  onViewStats?: () => void;
  onUseStreakFreeze?: () => void;
  isFreezingStreak?: boolean;
  leaderboardRank?: number | null;
}

// Premium Stat card config with subtle gradients and glassmorphism hints
const STAT_CARDS = [
  {
    icon: "book-outline" as const,
    bgStart: ColorScale.primary[50],
    bgEnd: ColorScale.primary[100],
    accent: Colors.primary,
    tint: ColorScale.primary[900],
  },
  {
    icon: "star-outline" as const,
    bgStart: ColorScale.secondary[50],
    bgEnd: ColorScale.secondary[100],
    accent: Colors.warning.main,
    tint: Colors.warning.dark,
  },
  {
    icon: "time-outline" as const,
    bgStart: ColorScale.teal[50],
    bgEnd: ColorScale.teal[100],
    accent: Colors.success.main,
    tint: Colors.success.dark,
  },
  {
    icon: "flame-outline" as const,
    // No rose/pink scale exists in theme.ts — kept as literals to avoid
    // collapsing this card's identity color onto another category's hue.
    bgStart: "#FFF1F2",
    bgEnd: "#FFE4E6",
    accent: "#F43F5E",
    tint: "#9F1239",
  },
  {
    icon: "trophy-outline" as const,
    // No violet/purple scale exists in theme.ts — kept as literals for the
    // same reason (see "flame" card above).
    bgStart: "#FAF5FF",
    bgEnd: "#F3E8FF",
    accent: "#8B5CF6",
    tint: "#5B21B6",
  },
  {
    icon: "code-slash-outline" as const,
    bgStart: ColorScale.primary[50],
    bgEnd: ColorScale.primary[100],
    accent: Colors.info.main,
    tint: ColorScale.primary[900],
  },
];

const GRID_GAP = Spacing[3];
const GRID_PADDING = Spacing[4];
const PARENT_PADDING = Spacing[4]; // From ProfileScreen's tabContent

function compactNumber(value: number | undefined) {
  const safeValue = value ?? 0;
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(safeValue);
}

function visitorName(visitor: ProfileVisitor) {
  return `${visitor.firstName || ""} ${visitor.lastName || ""}`.trim();
}

function visitorInitials(visitor: ProfileVisitor) {
  const first = visitor.firstName?.charAt(0) || "";
  const last = visitor.lastName?.charAt(0) || "";
  return `${first}${last}`.toUpperCase() || "?";
}

function relativeViewedAt(value: string, t: any) {
  const viewedAt = new Date(value).getTime();
  const diffMs = Date.now() - viewedAt;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return t("feed.time.now") || "now";
  if (minutes < 60) return `${minutes}${t("feed.time.m")}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}${t("feed.time.h")}`;
  return `${Math.floor(hours / 24)}${t("feed.time.d")}`;
}

function StatCard({
  icon,
  value,
  label,
  index = 0,
  gridCardWidth,
}: {
  icon: string;
  value: string | number;
  label: string;
  index?: number;
  gridCardWidth: number;
}) {
  const cfg = STAT_CARDS[index % STAT_CARDS.length];
  const { colors, isDark } = useThemeContext();
  const scale = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(12)).current;

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
        s.statGridCardWrapper,
        { width: gridCardWidth },
        {
          shadowOpacity: isDark ? 0 : 0.08,
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      <View
        style={[
          s.statGridCard,
          {
            backgroundColor: isDark ? colors.surfaceVariant : cfg.bgStart,
            borderWidth: 1,
            borderColor: isDark ? colors.border : "transparent",
          },
        ]}
      >
        <View style={[s.statGridIcon, { backgroundColor: cfg.accent }]}>
          <Ionicons name={icon as any} size={18} color={Colors.white} />
        </View>
        <Text
          style={[s.statGridValue, { color: isDark ? colors.text : cfg.tint }]}
        >
          {value}
        </Text>
        <Text
          style={[
            s.statGridLabel,
            { color: isDark ? colors.textSecondary : cfg.tint, opacity: 0.8 },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

// ── XP Progress Ring ─────────────────────────────────────────────

function XPProgressRing({
  xp,
  xpToNext,
  level,
  quizzes,
  avgScore,
}: {
  xp: number;
  xpToNext: number;
  level: number;
  quizzes?: number;
  avgScore?: number;
}) {
  const { colors, isDark } = useThemeContext();
  const size = 140;
  const xpPct = xpToNext > 0 ? Math.min(xp / xpToNext, 1) : 0;
  const quizPct = Math.min(
    (quizzes ?? 0) / Math.max((quizzes ?? 0) + 5, 10),
    1,
  );
  const scorePct = Math.min((avgScore ?? 0) / 100, 1);

  const rings = [
    {
      r: 60,
      sw: 10,
      pct: xpPct,
      id: "xp",
      c1: ColorScale.primary[400],
      c2: ColorScale.primary[600],
    },
    {
      r: 46,
      sw: 8,
      pct: quizPct,
      id: "quiz",
      c1: Colors.success.light,
      c2: Colors.success.dark,
    },
    {
      r: 34,
      sw: 7,
      pct: scorePct,
      id: "score",
      c1: Colors.warning.light,
      c2: ColorScale.secondary[500],
    },
  ];

  return (
    <View style={ringStyles.container}>
      <View
        style={[
          ringStyles.glow,
          {
            backgroundColor: isDark
              ? `${colors.primary}24`
              : `${colors.primary}0F`,
          },
        ]}
      />
      <Svg width={size} height={size}>
        <Defs>
          {rings.map((ring) => (
            <SvgLinearGradient
              key={ring.id}
              id={`pgrad_${ring.id}`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <Stop offset="0" stopColor={ring.c1} />
              <Stop offset="1" stopColor={ring.c2} />
            </SvgLinearGradient>
          ))}
        </Defs>
        {rings.map((ring) => {
          const circ = 2 * Math.PI * ring.r;
          return (
            <React.Fragment key={ring.id}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={ring.r}
                stroke={`${ring.c1}18`}
                strokeWidth={ring.sw}
                fill="none"
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={ring.r}
                stroke={`url(#pgrad_${ring.id})`}
                strokeWidth={ring.sw}
                fill="none"
                strokeDasharray={`${circ}`}
                strokeDashoffset={circ * (1 - ring.pct)}
                strokeLinecap="round"
                transform={`rotate(-90, ${size / 2}, ${size / 2})`}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={ringStyles.inner}>
        <Text style={[ringStyles.levelValue, { color: colors.text }]}>
          {level}
        </Text>
        <Text style={[ringStyles.levelLabel, { color: colors.textSecondary }]}>
          {useTranslation().t("profile.performance.level")}
        </Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: `${Colors.primary}0F`,
  },
  inner: { position: "absolute", alignItems: "center" },
  levelLabel: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.bold,
    color: ColorScale.gray[400],
    letterSpacing: 1.2,
  },
  levelValue: {
    fontSize: Typography.fontSize[36],
    fontWeight: Typography.fontWeight.black,
    color: ColorScale.gray[800],
    letterSpacing: -1,
  },
});

// ── Mini Line Chart ──────────────────────────────────────────────

function MiniLineChart({
  data,
  width,
  height,
}: {
  data: number[];
  width: number;
  height: number;
}) {
  if (data.length < 2) return null;

  const pad = 12;
  const cW = width - pad * 2;
  const cH = height - pad * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * cW;
    const y = pad + cH - ((v - min) / range) * cH;
    return { x, y };
  });

  // Create smooth curve
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 3;
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) / 3;
    d += ` C ${cp1x},${pts[i - 1].y} ${cp2x},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }

  // Area fill path
  const areaD =
    d +
    ` L ${pts[pts.length - 1].x},${height - pad} L ${pts[0].x},${height - pad} Z`;

  return (
    <Svg width={width} height={height}>
      <Path d={areaD} fill={`${Colors.primary}14`} />
      <Path
        d={d}
        fill="none"
        stroke={Colors.primary}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <Circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3.5"
          fill={Colors.white}
          stroke={Colors.primary}
          strokeWidth="2"
        />
      ))}
    </Svg>
  );
}

// ── Main Performance Tab Component ───────────────────────────────

export default function PerformanceTab({
  quizStats,
  profileStats,
  streak,
  achievements,
  totalAchievements,
  level,
  totalPoints,
  profile,
  isOwnProfile = false,
  recentVisitors = [],
  visitorsLoading = false,
  onViewProfileVisitors,
  onViewAchievements,
  onViewLeaderboard,
  onViewStats,
  onUseStreakFreeze,
  isFreezingStreak = false,
  leaderboardRank = null,
}: PerformanceTabProps) {
  const { t, i18n } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const [miniChartWidth, setMiniChartWidth] = useState(0);
  const [statGridInnerWidth, setStatGridInnerWidth] = useState(0);
  const gridCardWidth = useMemo(() => {
    if (statGridInnerWidth > 0) {
      return (statGridInnerWidth - GRID_GAP * 2) / 3 - 0.5;
    }
    return (
      (windowWidth - PARENT_PADDING * 2 - GRID_PADDING * 2 - GRID_GAP * 2) /
        3 -
      0.5
    );
  }, [statGridInnerWidth, windowWidth]);
  const miniChartPixelWidth =
    miniChartWidth > 0 ? miniChartWidth : Math.max(200, windowWidth - 80);
  const { colors, isDark } = useThemeContext();
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border,
  };

  const role = String(profile?.role || "STUDENT").toUpperCase();
  const isParentRole = role === "PARENT";
  const isTeacherLikeRole = [
    "TEACHER",
    "STAFF",
    "SCHOOL_ADMIN",
    "ADMIN",
    "SUPER_ADMIN",
  ].includes(role);
  // Teachers/admins can learn like students — keep the full learner dashboard.
  // Only parents get a non-learner Performance layout.
  const showLearnerDashboard = !isParentRole;

  useEffect(() => {
    Animated.spring(cardScale, {
      toValue: 1,
      damping: 15,
      stiffness: 120,
      useNativeDriver: true,
    }).start();
  }, []);

  const xp = quizStats?.xpProgress ?? 0;
  const xpToNext = quizStats?.xpToNextLevel ?? 1000;
  const scoreHistory =
    quizStats?.recentAttempts?.map((a) => a.score).reverse() || [];
  const profileViews30d = profileStats?.profileViews30d ?? 0;
  const uniqueProfileViewers30d = profileStats?.uniqueProfileViewers30d ?? 0;
  const profileViews7d = profileStats?.profileViews7d ?? 0;
  const profilePerformanceScore = profileStats?.profilePerformanceScore ?? 0;
  const trendingProfileScore = profileStats?.trendingProfileScore ?? 0;
  const profileMomentum = Math.min(100, Math.max(8, profilePerformanceScore));

  return (
    <View style={s.container}>
      {/* Role-aware overview for teachers / parents */}
      {(isTeacherLikeRole || isParentRole) && (
        <RoleOverviewCard
          role={role as any}
          profile={profile}
          profileStats={profileStats}
          isOwnProfile={isOwnProfile}
          recentVisitors={recentVisitors}
          onViewProfileVisitors={
            isOwnProfile ? onViewProfileVisitors : undefined
          }
        />
      )}

      {/* Next learning action — own student profiles */}
      {isOwnProfile && showLearnerDashboard && (
        <NextActionCard
          streak={streak}
          quizStats={quizStats}
          level={level}
          onUseStreakFreeze={onUseStreakFreeze}
          isFreezingStreak={isFreezingStreak}
        />
      )}

      {/* XP & Level Card — learners only */}
      {showLearnerDashboard && (
      <Animated.View
        style={[s.card, cardStyle, { transform: [{ scale: cardScale }] }]}
      >
        <LinearGradient
          colors={
            isDark
              ? [colors.card, colors.surfaceVariant]
              : [Colors.white, ColorScale.gray[50]]
          }
          style={s.cardGradient}
        >
          <View style={s.xpRow}>
            <XPProgressRing
              xp={xp}
              xpToNext={xpToNext}
              level={quizStats?.level ?? level}
              quizzes={quizStats?.totalQuizzes ?? 0}
              avgScore={quizStats?.avgScore ?? 0}
            />
            <View style={s.xpInfo}>
              <View style={s.xpStatRow}>
                <View
                  style={[
                    s.xpStatIcon,
                    {
                      backgroundColor: isDark
                        ? `${colors.primary}1F`
                        : Colors.background,
                    },
                  ]}
                >
                  <Ionicons name="diamond" size={14} color={Colors.info.main} />
                </View>
                <View>
                  <Text style={[s.xpStatValue, { color: colors.text }]}>
                    {(quizStats?.xp ?? 0).toLocaleString()}
                  </Text>
                  <Text
                    style={[s.xpStatLabel, { color: colors.textSecondary }]}
                  >
                    {t("feed.xp")}
                  </Text>
                </View>
              </View>
              <View style={s.xpStatRow}>
                <View
                  style={[
                    s.xpStatIcon,
                    { backgroundColor: isDark ? "#063A2C" : ColorScale.teal[50] },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success.main} />
                </View>
                <View>
                  <Text style={[s.xpStatValue, { color: colors.text }]}>
                    {quizStats?.totalQuizzes ?? 0}
                  </Text>
                  <Text
                    style={[s.xpStatLabel, { color: colors.textSecondary }]}
                  >
                    {t("feed.quizzes")}
                  </Text>
                </View>
              </View>
              <View style={s.xpStatRow}>
                <View
                  style={[
                    s.xpStatIcon,
                    { backgroundColor: isDark ? "#3B2B09" : ColorScale.secondary[50] },
                  ]}
                >
                  <Ionicons name="flame" size={14} color={Colors.warning.main} />
                </View>
                <View>
                  <Text style={[s.xpStatValue, { color: colors.text }]}>
                    {streak?.currentStreak ?? 0}
                  </Text>
                  <Text
                    style={[s.xpStatLabel, { color: colors.textSecondary }]}
                  >
                    {t("feed.dayStreak")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={s.xpBarSection}>
            <View style={s.xpBarLabels}>
              <Text style={s.xpBarLeft}>{xp.toLocaleString()} XP</Text>
              <Text style={[s.xpBarRight, { color: colors.textSecondary }]}>
                {xpToNext.toLocaleString()} XP
              </Text>
            </View>
            <View
              style={[s.xpBarBg, { backgroundColor: colors.surfaceVariant }]}
            >
              <LinearGradient
                colors={[
                  ColorScale.primary[400],
                  Colors.primary,
                  ColorScale.primary[600],
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  s.xpBarFill,
                  { width: `${Math.min((xp / xpToNext) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={[s.xpBarHint, { color: colors.textSecondary }]}>
              {t("profile.performance.xpToLevel", {
                xp: Math.max(xpToNext - xp, 0).toLocaleString(),
                level: (quizStats?.level ?? level) + 1,
              })}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
      )}

      {/* Profile Discovery — all roles */}
      <View style={[s.card, cardStyle]}>
        <LinearGradient
          colors={
            isDark
              ? [colors.card, colors.surfaceVariant]
              : [ColorScale.gray[50], Colors.white]
          }
          style={s.discoveryGradient}
        >
          <View style={s.discoveryHeader}>
            <View
              style={[
                s.discoveryIcon,
                { backgroundColor: isDark ? "#083344" : ColorScale.teal[50] },
              ]}
            >
              <Ionicons name="eye" size={20} color={ColorScale.primary[600]} />
            </View>
            <View style={s.discoveryTitleWrap}>
              <Text style={[s.cardTitle, { color: colors.text }]}>
                {t("profile.performance.performanceTitle")}
              </Text>
              <Text style={[s.discoverySub, { color: colors.textSecondary }]}>
                {t("profile.performance.discoverySub")}
              </Text>
            </View>
            <View style={s.scorePill}>
              <Text style={s.scorePillValue}>{profilePerformanceScore}</Text>
              <Text style={s.scorePillLabel}>{t("profile.performance.score")}</Text>
            </View>
          </View>

          <View
            style={[
              s.momentumTrack,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.success.main]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.momentumFill, { width: `${profileMomentum}%` }]}
            />
          </View>

          <View style={s.discoveryStatsRow}>
            <View style={s.discoveryStat}>
              <Text style={[s.discoveryStatValue, { color: colors.text }]}>
                {compactNumber(profileViews30d)}
              </Text>
              <Text
                style={[s.discoveryStatLabel, { color: colors.textSecondary }]}
              >
                {t("profile.performance.views30d")}
              </Text>
            </View>
            <View
              style={[s.quizStatDivider, { backgroundColor: colors.border }]}
            />
            <View style={s.discoveryStat}>
              <Text style={[s.discoveryStatValue, { color: colors.text }]}>
                {compactNumber(uniqueProfileViewers30d)}
              </Text>
              <Text
                style={[s.discoveryStatLabel, { color: colors.textSecondary }]}
              >
                {t("profile.performance.uniqueViewers")}
              </Text>
            </View>
            <View
              style={[s.quizStatDivider, { backgroundColor: colors.border }]}
            />
            <View style={s.discoveryStat}>
              <Text style={[s.discoveryStatValue, { color: colors.text }]}>
                {compactNumber(profileViews7d)}
              </Text>
              <Text
                style={[s.discoveryStatLabel, { color: colors.textSecondary }]}
              >
                {t("profile.performance.thisWeek")}
              </Text>
            </View>
          </View>

          <View style={s.discoverySignalRow}>
            <View
              style={[
                s.signalChip,
                { backgroundColor: isDark ? "#063A2C" : ColorScale.teal[50] },
              ]}
            >
              <Ionicons name="trending-up" size={13} color={Colors.success.dark} />
              <Text style={s.signalText}>{trendingProfileScore} {t("profile.performance.trend")}</Text>
            </View>
            <View
              style={[
                s.signalChip,
                { backgroundColor: isDark ? ColorScale.primary[900] : ColorScale.primary[50] },
              ]}
            >
              <Ionicons name="school" size={13} color={Colors.info.dark} />
              <Text style={[s.signalText, { color: Colors.info.dark }]}>
                {t("profile.performance.learningCreator")}
              </Text>
            </View>
          </View>

          {visitorsLoading && recentVisitors.length === 0 && (
            <View style={[s.visitorsPanel, { borderColor: colors.border }]}>
              <View style={s.visitorsHeader}>
                <View>
                  <Text style={[s.visitorsTitle, { color: colors.text }]}>
                    {t("profile.performance.recentVisitors")}
                  </Text>
                  <Text
                    style={[s.visitorsMeta, { color: colors.textSecondary }]}
                  >
                    {t("common.loading")}
                  </Text>
                </View>
              </View>
              {[0, 1, 2].map((item) => (
                <View key={item} style={s.visitorRow}>
                  <View
                    style={[
                      s.visitorSkeletonAvatar,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  />
                  <View style={s.visitorInfo}>
                    <View
                      style={[
                        s.visitorSkeletonLine,
                        {
                          backgroundColor: colors.surfaceVariant,
                          width: "52%",
                        },
                      ]}
                    />
                    <View
                      style={[
                        s.visitorSkeletonLine,
                        {
                          backgroundColor: colors.surfaceVariant,
                          width: "74%",
                          marginTop: 7,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {recentVisitors.length > 0 && (
            <View style={[s.visitorsPanel, { borderColor: colors.border }]}>
              <View style={s.visitorsHeader}>
                <View>
                  <Text style={[s.visitorsTitle, { color: colors.text }]}>
                    {t("profile.performance.recentVisitors")}
                  </Text>
                  <Text
                    style={[s.visitorsMeta, { color: colors.textSecondary }]}
                  >
                    {t("profile.performance.last30Days")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.visitorsViewAll}
                  onPress={onViewProfileVisitors}
                  activeOpacity={0.76}
                >
                  <Text style={s.visitorsViewAllText}>{t("common.viewAll")}</Text>
                  <Ionicons name="chevron-forward" size={14} color={ColorScale.primary[600]} />
                </TouchableOpacity>
              </View>
              {recentVisitors.slice(0, 3).map((visitor) => (
                <View key={visitor.id} style={s.visitorRow}>
                  <Avatar
                    uri={visitor.profilePictureUrl}
                    name={visitorName(visitor) || visitorInitials(visitor)}
                    size="md"
                    showBorder={false}
                    gradientBorder="none"
                  />
                  <View style={s.visitorInfo}>
                    <Text
                      style={[s.visitorName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {visitorName(visitor)}
                    </Text>
                    <Text
                      style={[s.visitorSub, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {visitor.headline ||
                        visitor.professionalTitle ||
                        visitor.role}
                    </Text>
                  </View>
                  <View style={s.visitorStats}>
                    <Text style={[s.visitorTime, { color: colors.text }]}>
                      {relativeViewedAt(visitor.viewedAt, t)}
                    </Text>
                    <Text
                      style={[s.visitorViews, { color: colors.textSecondary }]}
                    >
                      {t("feed.viewsCount", { count: visitor.views30d })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Quiz Performance Card — learners */}
      {showLearnerDashboard && (
      <View style={[s.card, cardStyle]}>
        <View style={s.cardHeader}>
          <View
            style={[
              s.cardHeaderIcon,
              { backgroundColor: isDark ? `${colors.primary}1F` : Colors.background },
            ]}
          >
            <Ionicons name="analytics" size={18} color={Colors.info.main} />
          </View>
          <Text style={[s.cardTitle, { color: colors.text }]}>
            {t("profile.performance.quizPerformance")}
          </Text>
          <TouchableOpacity onPress={onViewStats} style={s.viewAllBtn}>
            <Text style={s.viewAllText}>
              {t("profile.performance.details")}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={s.quizStatsRow}>
          <View style={s.quizStat}>
            <Text style={[s.quizStatValue, { color: Colors.success.main }]}>
              {(quizStats?.winRate ?? 0).toFixed(0)}%
            </Text>
            <Text style={[s.quizStatLabel, { color: colors.textSecondary }]}>
              {t("profile.performance.passRate")}
            </Text>
          </View>
          <View
            style={[s.quizStatDivider, { backgroundColor: colors.border }]}
          />
          <View style={s.quizStat}>
            <Text style={[s.quizStatValue, { color: Colors.warning.main }]}>
              {quizStats?.winStreak ?? 0}
            </Text>
            <Text style={[s.quizStatLabel, { color: colors.textSecondary }]}>
              {t("profile.performance.winStreak")}
            </Text>
          </View>
          <View
            style={[s.quizStatDivider, { backgroundColor: colors.border }]}
          />
          <View style={s.quizStat}>
            <Text style={[s.quizStatValue, { color: "#8B5CF6" }]}>
              {quizStats?.correctAnswers ?? 0}/{quizStats?.totalAnswers ?? 0}
            </Text>
            <Text style={[s.quizStatLabel, { color: colors.textSecondary }]}>
              {t("profile.performance.correct")}
            </Text>
          </View>
        </View>

        {/* Mini Chart */}
        {scoreHistory.length >= 2 && (
          <View style={s.chartContainer}>
            <Text style={[s.chartTitle, { color: colors.textSecondary }]}>
              {t("profile.performance.recentScores")}
            </Text>
            <View
              style={{ width: "100%" }}
              onLayout={(e) => {
                const w = Math.floor(e.nativeEvent.layout.width);
                if (w > 0) setMiniChartWidth(w);
              }}
            >
              <MiniLineChart
                data={scoreHistory.slice(-7)}
                width={miniChartPixelWidth}
                height={100}
              />
            </View>
          </View>
        )}
        {scoreHistory.length < 2 && (
          <View style={s.emptyChart}>
            <Ionicons
              name="bar-chart-outline"
              size={32}
              color={colors.textTertiary}
            />
            <Text style={[s.emptyChartText, { color: colors.textTertiary }]}>
              {t("profile.performance.completeQuizzesHint")}
            </Text>
          </View>
        )}
      </View>
      )}

      {showLearnerDashboard && (
      <LearningStreakCard
        streak={streak}
        onUseFreeze={onUseStreakFreeze}
        isFreezing={isFreezingStreak}
      />
      )}

      {/* Subject mastery tree — own learner profile only (self-guarded) */}
      {showLearnerDashboard && <SubjectMasteryTree profileUserId={profile?.id} />}

      {/* Scoped streak leaderboard — own learner profile only (self-guarded) */}
      {showLearnerDashboard && <StreakLeaderboard profileUserId={profile?.id} />}

      {/* Core Stats Overview — learners */}
      {showLearnerDashboard && (
      <View style={[s.card, cardStyle]}>
        <View style={s.cardHeader}>
          <View
            style={[
              s.cardHeaderIcon,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Ionicons name="apps" size={18} color={colors.textSecondary} />
          </View>
          <Text style={[s.cardTitle, { color: colors.text }]}>
            {t("profile.performance.overview")}
          </Text>
        </View>

        <View style={s.statGridWrapper}>
          <View
            style={s.statGrid}
            onLayout={(e) => {
              const w = Math.floor(e.nativeEvent.layout.width);
              if (w > 0) setStatGridInnerWidth(w);
            }}
          >
            <StatCard
              icon="book-outline"
              value={quizStats?.totalQuizzes ?? 0}
              label={t("profile.performance.quizzesDone")}
              index={0}
              gridCardWidth={gridCardWidth}
            />
            <StatCard
              icon="star-outline"
              value={quizStats?.totalPoints ?? profile?.totalPoints ?? 0}
              label={t("profile.performance.totalPoints")}
              index={1}
              gridCardWidth={gridCardWidth}
            />
            <StatCard
              icon="time-outline"
              value={profile?.totalLearningHours ?? 0}
              label={t("profile.performance.studyHours")}
              index={2}
              gridCardWidth={gridCardWidth}
            />
            <StatCard
              icon="flame-outline"
              value={streak?.currentStreak ?? profile?.currentStreak ?? 0}
              label={t("profile.performance.streak")}
              index={3}
              gridCardWidth={gridCardWidth}
            />
            <StatCard
              icon="trophy-outline"
              value={achievements?.length || 0}
              label={t("profile.performance.achievements")}
              index={4}
              gridCardWidth={gridCardWidth}
            />
            <StatCard
              icon="code-slash-outline"
              value={(profile as any)?.projects?.length ?? 0}
              label={t("profile.performance.projects")}
              index={5}
              gridCardWidth={gridCardWidth}
            />
          </View>
        </View>
      </View>
      )}

      {/* Achievement Showcase */}
      <View style={[s.card, cardStyle]}>
        <View style={s.cardHeader}>
          <View
            style={[
              s.cardHeaderIcon,
              // No violet/purple scale exists in theme.ts — kept as literals.
              { backgroundColor: isDark ? "#2A184E" : "#FAF5FF" },
            ]}
          >
            <Ionicons name="medal" size={18} color="#8B5CF6" />
          </View>
          <Text style={[s.cardTitle, { color: colors.text }]}>
            {t("profile.performance.achievements")}
          </Text>
          <TouchableOpacity onPress={onViewAchievements} style={s.viewAllBtn}>
            <Text style={s.viewAllText}>
              {achievements.length}/{totalAchievements}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {achievements.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.badgeScroll}
          >
            {achievements.slice(0, 8).map((ua) => {
              // Default + "competition" stay literal: no violet/pink scale
              // exists in theme.ts to map them to without changing the hue.
              let color: string = "#8B5CF6";
              if (ua.achievement?.category === "streak")
                color = ColorScale.secondary[500];
              if (ua.achievement?.category === "performance")
                color = Colors.success.main;
              if (ua.achievement?.category === "competition") color = "#F472B6";

              return (
                <View key={ua.id} style={s.badgeItem}>
                  <View
                    style={[
                      s.badgeCircle,
                      { backgroundColor: color + "20", borderColor: color },
                    ]}
                  >
                    <Text style={s.badgeEmoji}>
                      {ua.achievement?.icon || "🏆"}
                    </Text>
                  </View>
                  <Text
                    style={[s.badgeName, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {ua.achievement?.name ||
                      t("profile.performance.achievements")}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={s.emptyChart}>
            <Ionicons
              name="ribbon-outline"
              size={32}
              color={colors.textTertiary}
            />
            <Text style={[s.emptyChartText, { color: colors.textTertiary }]}>
              {t("profile.performance.badgesChallenge")}
            </Text>
          </View>
        )}
      </View>

      {/* Leaderboard Position — learners */}
      {showLearnerDashboard && (
      <TouchableOpacity
        style={s.leaderboardCard}
        onPress={onViewLeaderboard}
        activeOpacity={0.8}
      >
        {/* No indigo/violet scale exists in theme.ts — this gradient is kept
            literal to avoid changing the leaderboard card's brand hue. */}
        <LinearGradient
          colors={["#4F46E5", "#7C3AED", "#9333EA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.leaderboardGradient}
        >
          <View style={s.leaderboardLeft}>
            <View style={s.leaderboardIconWrap}>
              <Ionicons name="podium" size={22} color="#7C3AED" />
            </View>
            <View>
              <Text style={s.leaderboardTitle}>
                {t("profile.performance.leaderboard")}
              </Text>
              <Text style={s.leaderboardSub}>
                {leaderboardRank
                  ? t("profile.performance.leaderboardRank", { rank: leaderboardRank })
                  : t("profile.performance.leaderboardSub")}
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={`${Colors.white}B3`}
          />
        </LinearGradient>
      </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 12, paddingTop: 4, paddingBottom: 8 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ColorScale.gray[200],
    overflow: "hidden",
  },
  cardGradient: { padding: Spacing[5] },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[4],
  },
  cardHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: Typography.fontSize[16],
    fontWeight: Typography.fontWeight.bold,
    color: ColorScale.gray[800],
    flex: 1,
  },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: Spacing[1] },
  viewAllText: {
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },

  // XP Card
  xpRow: { flexDirection: "row", alignItems: "center", gap: Spacing[5] },
  xpInfo: { flex: 1, gap: Spacing[3] },
  xpStatRow: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  xpStatIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  xpStatValue: {
    fontSize: Typography.fontSize[16],
    fontWeight: Typography.fontWeight.extrabold,
    color: ColorScale.gray[800],
  },
  xpStatLabel: {
    fontSize: Typography.fontSize[11],
    color: ColorScale.gray[400],
    fontWeight: Typography.fontWeight.medium,
  },
  xpBarSection: { marginTop: Spacing[5] },
  xpBarLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing[2],
  },
  xpBarLeft: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  xpBarRight: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.semibold,
    color: ColorScale.gray[400],
  },
  xpBarBg: {
    height: 10,
    backgroundColor: ColorScale.gray[100],
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  xpBarFill: { height: "100%", borderRadius: BorderRadius.sm },
  xpBarHint: {
    fontSize: Typography.fontSize[11],
    color: ColorScale.gray[400],
    textAlign: "center",
    marginTop: Spacing[2],
  },

  // Profile Discovery
  discoveryGradient: { padding: Spacing[5] },
  discoveryHeader: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  discoveryIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryTitleWrap: { flex: 1 },
  discoverySub: {
    fontSize: Typography.fontSize[12],
    lineHeight: 17,
    marginTop: Spacing[1],
    fontWeight: Typography.fontWeight.medium,
  },
  scorePill: {
    minWidth: 58,
    height: 58,
    borderRadius: BorderRadius.xl,
    backgroundColor: ColorScale.primary[600],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[2],
  },
  scorePillValue: {
    fontSize: Typography.fontSize[20],
    fontWeight: Typography.fontWeight.black,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  scorePillLabel: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.extrabold,
    color: `${Colors.white}C7`,
    textTransform: "uppercase",
  },
  momentumTrack: {
    height: 9,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    marginTop: Spacing[4],
  },
  momentumFill: { height: "100%", borderRadius: BorderRadius.sm },
  discoveryStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing[4],
  },
  discoveryStat: { flex: 1, alignItems: "center" },
  discoveryStatValue: {
    fontSize: Typography.fontSize[20],
    fontWeight: Typography.fontWeight.black,
    letterSpacing: -0.4,
  },
  discoveryStatLabel: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing[1],
    textTransform: "uppercase",
  },
  discoverySignalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
    marginTop: Spacing[4],
  },
  signalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
  },
  signalText: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.success.dark,
    textTransform: "uppercase",
  },
  visitorsPanel: {
    marginTop: Spacing[4],
    paddingTop: Spacing[4],
    borderTopWidth: 1,
    gap: Spacing[3],
  },
  visitorsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  visitorsTitle: {
    fontSize: Typography.fontSize[14],
    fontWeight: Typography.fontWeight.extrabold,
  },
  visitorsMeta: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.bold,
    textTransform: "uppercase",
  },
  visitorsViewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    backgroundColor: `${ColorScale.primary[600]}1A`,
  },
  visitorsViewAllText: {
    color: ColorScale.primary[600],
    fontSize: Typography.fontSize[12],
    fontWeight: Typography.fontWeight.black,
  },
  visitorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    minHeight: 48,
  },
  visitorAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius[20],
    backgroundColor: ColorScale.primary[600],
    alignItems: "center",
    justifyContent: "center",
  },
  visitorInitials: {
    color: Colors.white,
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.black,
  },
  visitorInfo: { flex: 1, minWidth: 0 },
  visitorName: {
    fontSize: Typography.fontSize[13],
    fontWeight: Typography.fontWeight.extrabold,
  },
  visitorSub: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing[1],
  },
  visitorStats: { alignItems: "flex-end", minWidth: 58 },
  visitorTime: {
    fontSize: Typography.fontSize[12],
    fontWeight: Typography.fontWeight.black,
  },
  visitorViews: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing[1],
  },
  visitorSkeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius[20],
  },
  visitorSkeletonLine: {
    height: 11,
    borderRadius: BorderRadius.md,
  },

  // Quiz Stats
  quizStatsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[4],
  },
  quizStat: { flex: 1, alignItems: "center" },
  quizStatValue: {
    fontSize: Typography.fontSize[18],
    fontWeight: Typography.fontWeight.extrabold,
  },
  quizStatLabel: {
    fontSize: Typography.fontSize[11],
    color: ColorScale.gray[400],
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing[1],
  },
  quizStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.background,
    alignSelf: "center",
  },
  chartContainer: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[4] },
  chartTitle: {
    fontSize: Typography.fontSize[12],
    fontWeight: Typography.fontWeight.semibold,
    color: ColorScale.gray[400],
    marginBottom: Spacing[1],
    paddingLeft: Spacing[1],
  },
  emptyChart: {
    alignItems: "center",
    paddingVertical: Spacing[6],
    paddingBottom: Spacing[5],
    gap: Spacing[2],
  },
  emptyChartText: {
    fontSize: Typography.fontSize[13],
    color: ColorScale.gray[300],
  },

  // Streak
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[4],
    gap: Spacing[5],
  },
  streakMain: { flexDirection: "row", alignItems: "baseline", gap: Spacing[1] },
  streakNumber: {
    fontSize: Typography.fontSize[48],
    fontWeight: Typography.fontWeight.extrabold,
    color: ColorScale.secondary[500],
    letterSpacing: -2,
  },
  streakUnit: {
    fontSize: Typography.fontSize[16],
    fontWeight: Typography.fontWeight.semibold,
    color: ColorScale.secondary[300],
  },
  streakSide: { flex: 1, gap: Spacing[2] },
  streakSideRow: { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  streakSideText: {
    fontSize: Typography.fontSize[13],
    color: ColorScale.gray[500],
    fontWeight: Typography.fontWeight.medium,
  },

  // Achievement badges
  badgeScroll: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[4],
    paddingBottom: Spacing[5],
  },
  badgeItem: { alignItems: "center", width: 64 },
  badgeCircle: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: Spacing[2],
  },
  badgeEmoji: { fontSize: Typography.fontSize[24] },
  badgeName: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.semibold,
    color: ColorScale.gray[500],
    textAlign: "center",
  },

  // Leaderboard
  leaderboardCard: { borderRadius: 16, overflow: "hidden" },
  leaderboardGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing[5],
  },
  leaderboardLeft: { flexDirection: "row", alignItems: "center", gap: Spacing[4] },
  leaderboardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: `${Colors.white}E6`,
    alignItems: "center",
    justifyContent: "center",
  },
  leaderboardTitle: {
    fontSize: Typography.fontSize[16],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  leaderboardSub: {
    fontSize: Typography.fontSize[12],
    color: `${Colors.white}B3`,
    marginTop: Spacing[1],
  },

  // Core Stat Grid
  statGridWrapper: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: Spacing[5],
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  statGridCardWrapper: {
    borderRadius: BorderRadius.xl, // Match the inner card to fix Android corner glitch
    ...Shadows.lg,
  },
  statGridCard: {
    width: "100%",
    height: 120, // Increased height for more breathing room
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[5], // Increased padding as requested
    paddingHorizontal: Spacing[3],
    alignItems: "center",
    justifyContent: "center",
  },
  statGridIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[3],
    ...Shadows.md,
  },
  statGridValue: {
    fontSize: Typography.fontSize[20],
    fontWeight: Typography.fontWeight.extrabold,
    marginBottom: Spacing[1],
    letterSpacing: -0.5,
  },
  statGridLabel: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  // Attendance Card Styles
  attendanceGradient: {
    padding: Spacing[5],
    borderRadius: BorderRadius["2xl"],
  },
  attHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    marginBottom: Spacing[5],
  },
  attIconBg: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  attTitle: {
    fontSize: Typography.fontSize[16],
    fontWeight: Typography.fontWeight.extrabold,
    color: Colors.white,
  },
  attSub: {
    fontSize: Typography.fontSize[12],
    color: `${Colors.white}B3`,
    fontWeight: Typography.fontWeight.medium,
  },
  attBadge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.md,
  },
  attBadgeText: {
    fontSize: Typography.fontSize[11],
    fontWeight: Typography.fontWeight.extrabold,
    letterSpacing: 0.5,
  },
  attTimeRow: {
    flexDirection: "row",
    backgroundColor: `${Colors.black}26`,
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[5],
  },
  attTimeBox: {
    flex: 1,
    alignItems: "center",
  },
  attTimeLabel: {
    fontSize: Typography.fontSize[11],
    color: `${Colors.white}80`,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing[1],
  },
  attTimeValue: {
    fontSize: Typography.fontSize[18],
    color: Colors.white,
    fontWeight: Typography.fontWeight.extrabold,
  },
  attTimeDivider: {
    width: 1,
    height: "100%",
    backgroundColor: `${Colors.white}1A`,
    marginHorizontal: Spacing[3],
  },
  attBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[4],
    borderRadius: BorderRadius.xl,
    gap: Spacing[2],
    ...Shadows.xl,
  },
  attBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSize[14],
    fontWeight: Typography.fontWeight.extrabold,
    letterSpacing: 1,
  },
});
