import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useThemeContext } from '@/contexts';
import type { Streak } from '@/services/stats';

const MILESTONES = [3, 7, 14, 30, 50, 100];

function getNextMilestone(current: number) {
  return MILESTONES.find((m) => m > current) ?? MILESTONES[MILESTONES.length - 1];
}

function getPreviousMilestone(current: number) {
  let prev = 0;
  for (const m of MILESTONES) {
    if (m <= current) prev = m;
    else break;
  }
  return prev;
}

const EMPTY_WEEK = [false, false, false, false, false, false, false];

/** Fallback when API weekActivity is missing (legacy cache). */
function buildWeekActivityFallback(streak: Streak | null): boolean[] {
  const week = [...EMPTY_WEEK];
  if (!streak || streak.currentStreak <= 0) return week;

  const anchor = streak.lastQuizDate ? new Date(streak.lastQuizDate) : new Date();
  anchor.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < Math.min(streak.currentStreak, 7); offset += 1) {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() - offset);
    const mapped = day.getDay() === 0 ? 6 : day.getDay() - 1;
    week[mapped] = true;
  }

  return week;
}

function isStreakAtRiskFallback(streak: Streak | null): boolean {
  if (!streak || streak.currentStreak <= 0 || !streak.lastQuizDate) return false;
  const last = new Date(streak.lastQuizDate);
  const today = new Date();
  last.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return today.getTime() > last.getTime();
}

function studiedTodayFallback(streak: Streak | null): boolean {
  if (!streak?.lastQuizDate) return false;
  const last = new Date(streak.lastQuizDate);
  const today = new Date();
  last.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return last.getTime() === today.getTime();
}

export interface LearningStreakCardProps {
  streak: Streak | null;
  onUseFreeze?: () => void;
  isFreezing?: boolean;
}

export const LearningStreakCard = React.memo(function LearningStreakCard({
  streak,
  onUseFreeze,
  isFreezing = false,
}: LearningStreakCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const glow = useRef(new Animated.Value(0.55)).current;

  const current = streak?.currentStreak ?? 0;
  const best = streak?.longestStreak ?? 0;
  const freezes = streak?.freezesAvailable ?? 0;
  const isActive = current > 0;
  const isOnFire = current >= 7;
  const atRisk =
    typeof streak?.streakAtRisk === 'boolean'
      ? streak.streakAtRisk
      : isStreakAtRiskFallback(streak);
  const doneToday =
    typeof streak?.studiedToday === 'boolean'
      ? streak.studiedToday
      : studiedTodayFallback(streak);

  const nextMilestone = getNextMilestone(current);
  const prevMilestone = getPreviousMilestone(current);
  const milestoneSpan = Math.max(1, nextMilestone - prevMilestone);
  const milestoneProgress = Math.min(
    1,
    Math.max(0, (current - prevMilestone) / milestoneSpan),
  );

  const weekActivity = useMemo(() => {
    if (streak?.weekActivity?.length === 7) {
      return streak.weekActivity;
    }
    return buildWeekActivityFallback(streak);
  }, [streak]);
  const dayLabels = useMemo(
    () => [
      t('attendance.days.mon').charAt(0),
      t('attendance.days.tue').charAt(0),
      t('attendance.days.wed').charAt(0),
      t('attendance.days.thu').charAt(0),
      t('attendance.days.fri').charAt(0),
      t('attendance.days.sat').charAt(0),
      t('attendance.days.sun').charAt(0),
    ],
    [t],
  );
  const todayIndex = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.55,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, isActive]);

  const glowStyle = {
    opacity: glow,
    transform: [
      {
        scale: glow.interpolate({
          inputRange: [0.55, 1],
          outputRange: [0.94, 1.06],
        }),
      },
    ],
  };

  const motivationKey = !isActive
    ? 'profile.performance.streakMotivation.empty'
    : atRisk
      ? 'profile.performance.streakMotivation.atRisk'
      : doneToday
        ? 'profile.performance.streakMotivation.doneToday'
        : isOnFire
          ? 'profile.performance.streakMotivation.onFire'
          : 'profile.performance.streakMotivation.active';

  const gradientColors = isActive
    ? isDark
      ? (['#7C2D12', '#9A3412', '#431407'] as const)
      : (['#FFF7ED', '#FFEDD5', '#FED7AA'] as const)
    : isDark
      ? (['#1F2937', '#111827'] as const)
      : (['#F8FAFC', '#F1F5F9'] as const);

  return (
    <View
      style={[
        styles.outer,
        {
          borderColor: isActive ? (isDark ? '#EA580C55' : '#FDBA74') : colors.border,
          backgroundColor: colors.card,
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {isActive && (
          <Animated.View
            style={[
              styles.glowOrb,
              glowStyle,
              { backgroundColor: isDark ? '#F9731640' : '#FB923C35' },
            ]}
          />
        )}

        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: isActive
                  ? isDark
                    ? '#F9731630'
                    : '#FFEDD5'
                  : isDark
                    ? colors.surfaceVariant
                    : '#E2E8F0',
              },
            ]}
          >
            <Ionicons
              name="flame"
              size={22}
              color={isActive ? '#EA580C' : colors.textTertiary}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('profile.performance.learningStreak')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('profile.performance.streakSubtitle')}
            </Text>
          </View>
          {doneToday && isActive && (
            <View style={styles.donePill}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.donePillText}>
                {t('profile.performance.streakToday')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <Animated.View
              style={[
                styles.flameRing,
                isActive && glowStyle,
                {
                  backgroundColor: isActive
                    ? isDark
                      ? '#F9731625'
                      : '#FFEDD5'
                    : colors.surfaceVariant,
                  borderColor: isActive ? '#FB923C' : colors.border,
                },
              ]}
            >
              <Ionicons
                name={isActive ? 'flame' : 'flame-outline'}
                size={36}
                color={isActive ? '#EA580C' : colors.textTertiary}
              />
            </Animated.View>
            <View>
              <View style={styles.countRow}>
                <Text
                  style={[
                    styles.count,
                    { color: isActive ? '#EA580C' : colors.textSecondary },
                  ]}
                >
                  {current}
                </Text>
                <Text style={[styles.countUnit, { color: colors.textSecondary }]}>
                  {current === 1
                    ? t('profile.performance.day')
                    : t('profile.performance.days')}
                </Text>
              </View>
              <Text style={[styles.countCaption, { color: colors.textSecondary }]}>
                {t('profile.performance.currentStreak')}
              </Text>
            </View>
          </View>

          <View style={styles.chipColumn}>
            <View style={[styles.chip, { backgroundColor: isDark ? '#F59E0B20' : '#FEF3C7' }]}>
              <Ionicons name="trophy" size={13} color="#D97706" />
              <Text style={[styles.chipText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                {t('profile.performance.bestStreak', { count: best })}
              </Text>
            </View>
            <View style={[styles.chip, { backgroundColor: isDark ? '#3B82F620' : '#DBEAFE' }]}>
              <Ionicons name="snow" size={13} color="#2563EB" />
              <Text style={[styles.chipText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                {t('profile.performance.freezes', { count: freezes })}
              </Text>
            </View>
          </View>
        </View>

        {isActive && (
          <View style={styles.milestoneBlock}>
            <View style={styles.milestoneLabels}>
              <Text style={[styles.milestoneLabel, { color: colors.textSecondary }]}>
                {t('profile.performance.streakMilestone', { days: nextMilestone })}
              </Text>
              <Text style={[styles.milestoneValue, { color: colors.text }]}>
                {current}/{nextMilestone}
              </Text>
            </View>
            <View style={[styles.milestoneTrack, { backgroundColor: isDark ? '#ffffff18' : '#00000010' }]}>
              <LinearGradient
                colors={['#F97316', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.milestoneFill, { width: `${milestoneProgress * 100}%` }]}
              />
            </View>
          </View>
        )}

        <View style={styles.weekRow}>
          {dayLabels.map((label, index) => {
            const active = weekActivity[index];
            const isToday = index === todayIndex;
            return (
              <View key={`${label}-${index}`} style={styles.dayCol}>
                <View
                  style={[
                    styles.dayCircle,
                    {
                      backgroundColor: active
                        ? '#F97316'
                        : isDark
                          ? '#ffffff12'
                          : '#E2E8F0',
                      borderColor: isToday
                        ? '#FB923C'
                        : active
                          ? '#EA580C'
                          : 'transparent',
                      borderWidth: isToday ? 2.5 : 0,
                    },
                  ]}
                >
                  {active && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: active ? '#EA580C' : colors.textTertiary,
                      fontWeight: isToday ? '800' : '600',
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: isDark ? '#00000025' : '#FFFFFF80',
              borderColor: isDark ? '#ffffff15' : '#00000008',
            },
          ]}
        >
          <Ionicons
            name={atRisk ? 'alert-circle' : isOnFire ? 'rocket' : 'sparkles'}
            size={16}
            color={atRisk ? '#F59E0B' : isActive ? '#EA580C' : colors.textTertiary}
          />
          <Text
            style={[
              styles.footerText,
              { color: atRisk ? '#D97706' : colors.textSecondary },
            ]}
          >
            {t(motivationKey)}
          </Text>
        </View>

        {atRisk && freezes > 0 && onUseFreeze ? (
          <TouchableOpacity
            style={[
              styles.freezeBtn,
              { backgroundColor: isDark ? '#1D4ED840' : '#DBEAFE' },
            ]}
            onPress={onUseFreeze}
            disabled={isFreezing}
            activeOpacity={0.85}
          >
            {isFreezing ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Ionicons name="snow" size={18} color="#2563EB" />
            )}
            <Text style={styles.freezeBtnText}>
              {t('profile.performance.useStreakFreeze')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  gradient: {
    padding: 16,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800' },
  subtitle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  donePillText: { fontSize: 10, fontWeight: '700', color: '#059669' },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  flameRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  count: { fontSize: 44, fontWeight: '900', letterSpacing: -2 },
  countUnit: { fontSize: 16, fontWeight: '700' },
  countCaption: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  chipColumn: { gap: 8, alignItems: 'flex-end' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  milestoneBlock: { marginBottom: 14 },
  milestoneLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  milestoneLabel: { fontSize: 11, fontWeight: '600' },
  milestoneValue: { fontSize: 11, fontWeight: '800' },
  milestoneTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  milestoneFill: { height: '100%', borderRadius: 4, minWidth: 8 },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  dayCol: { alignItems: 'center', gap: 6 },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 10, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  footerText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  freezeBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 50,
  },
  freezeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
});
