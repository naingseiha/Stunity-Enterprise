import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

export const BannerCarousel = React.memo(({ navigation }: any) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  
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

  const slideWidth = Math.max(containerWidth, 1);

  return (
    <View
      style={styles.bannerContainer}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
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
             style={[styles.bannerSlide, { width: slideWidth }]}
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
                  <MaterialCommunityIcons name={b.icon as any} size={34} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.bannerRight}>
                <Text style={styles.bannerEyebrow}>{b.eyebrow}</Text>
                <Text style={styles.bannerTitle} numberOfLines={2}>{b.title}</Text>
                <Text style={styles.bannerSubtitle} numberOfLines={2}>{b.subtitle}</Text>
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
    height: 178,
    marginBottom: 18,
    width: '100%',
  },
  bannerSlide: {
    paddingHorizontal: 12,
  },
  bannerGradient: {
    height: 136,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  bannerDecorCircle1: {
    position: 'absolute',
    top: -48,
    right: -34,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  bannerDecorCircle2: {
    position: 'absolute',
    bottom: -50,
    left: 70,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  bannerDecorCircle3: {
    position: 'absolute',
    top: 18,
    left: -18,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  bannerLeft: {
    marginRight: 14,
  },
  bannerIconWrapper: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bannerRight: {
    flex: 1,
    minWidth: 0,
  },
  bannerEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.78)',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 17,
    color: 'rgba(255, 255, 255, 0.86)',
    fontWeight: '700',
  },
  bannerAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
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
    width: '23%' as any,
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
