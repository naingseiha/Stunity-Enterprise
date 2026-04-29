import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

export const COLORS = {
  background:    '#F8FBFF',
  surface:       '#FFFFFF',
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  primary:       '#09CFF7', // Bright Cyan
  primaryDark:   '#06A8CC', // Deep Cyan
  primaryLight:  '#E0F9FD', // Light Cyan
  border:        '#E2E8F0',
};

export const CLUBS_PAGE_SIZE = 20;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const BannerCarousel = React.memo(({ navigation }: any) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  
  const banners = [
    { id: '1', title: t('clubs.banner.rankingTitle'), subtitle: t('clubs.banner.rankingSubtitle'), eyebrow: t('clubs.banner.weeklyLeaderboard'), icon: 'star-shooting', colors: ['#09CFF7', '#06A8CC'], route: 'Leaderboard' },
    { id: '2', title: t('clubs.banner.studyGroupsTitle'), subtitle: t('clubs.banner.studyGroupsSubtitle'), eyebrow: t('clubs.banner.newClubs'), icon: 'account-group', colors: ['#10B981', '#059669'], route: 'All' },
    { id: '3', title: t('clubs.banner.examTitle'), subtitle: t('clubs.banner.examSubtitle'), eyebrow: t('clubs.banner.examPrep'), icon: 'school', colors: ['#A78BFA', '#8B5CF6'], route: 'Discover' },
  ];

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if(index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={styles.bannerContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToAlignment="center"
      >
        {banners.map((b) => (
          <AnimatedPressable 
             key={b.id} 
             onPress={() => {
               if(b.route === 'Leaderboard') navigation.navigate('Leaderboard');
             }} 
             style={{ width: SCREEN_WIDTH, paddingHorizontal: 12 }}
          >
            <LinearGradient
              colors={b.colors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerDecorCircle1} />
              <View style={styles.bannerDecorCircle2} />
              <View style={styles.bannerDecorCircle3} />
              <View style={styles.bannerLeft}>
                <View style={styles.bannerIconWrapper}>
                  <MaterialCommunityIcons name={b.icon as any} size={42} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.bannerRight}>
                <Text style={styles.bannerEyebrow}>{b.eyebrow}</Text>
                <Text style={styles.bannerTitle}>{b.title}</Text>
                <Text style={styles.bannerSubtitle}>{b.subtitle}</Text>
              </View>
              <View style={styles.bannerAction}>
                <Ionicons name="arrow-forward" size={18} color={b.colors[1]} />
              </View>
            </LinearGradient>
          </AnimatedPressable>
        ))}
      </ScrollView>
      <View style={styles.paginationRow}>
        {banners.map((_, i) => (
          <View key={i} style={[styles.dot, activeIndex === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
});

export const ShortcutItem = React.memo(({ s, isActive, onPress }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => { scale.value = withSpring(0.92, { damping: 12 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 12 }); };

  return (
    <AnimatedPressable
      style={[styles.shortcutItem, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={[styles.shortcutOuter, isActive && styles.shortcutOuterActive]}>
        <View style={[styles.shortcutInner, { backgroundColor: s.bgInner }]}>
          <Ionicons name={s.icon as any} size={28} color={s.color} />
        </View>
      </View>
      <Text style={[styles.shortcutLabel, isActive && styles.shortcutLabelActive]}>{s.label}</Text>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  bannerContainer: {
    height: 160,
    marginBottom: 20,
  },
  bannerGradient: {
    height: 120,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerDecorCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  bannerDecorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bannerDecorCircle3: {
    position: 'absolute',
    top: 10,
    left: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bannerLeft: {
    marginRight: 16,
  },
  bannerIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRight: {
    flex: 1,
  },
  bannerEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  bannerAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  dotActive: {
    width: 16,
    backgroundColor: COLORS.primary,
  },
  shortcutItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 32) / 4,
  },
  shortcutOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shortcutOuterActive: {
    borderColor: COLORS.primary,
  },
  shortcutInner: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  shortcutLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});
