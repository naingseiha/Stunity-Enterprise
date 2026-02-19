/**
 * Profile Screen — Premium Enterprise Design
 * 
 * Beautiful, modern profile with Instagram/SchoolApp inspired design
 * Features: Cover photo, avatar, stats, performance highlights, tabs
 * Compact edit button, settings icon, soft purple background
 */

import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Avatar, Button, Loading } from '@/components/common';
import { Colors, Typography, Spacing, Shadows } from '@/config';
import { useAuthStore } from '@/stores';
import { User } from '@/types';
import { formatNumber } from '@/utils';
import { ProfileStackScreenProps } from '@/navigation/types';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = 200;

type RouteProp = ProfileStackScreenProps<'Profile'>['route'];
type NavigationProp = ProfileStackScreenProps<'Profile'>['navigation'];

// Stats Card Component
interface StatsCardProps {
  icon: string;
  value: string | number;
  label: string;
  colors: string[];
}

function PerformanceCard({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.perfCard}>
      <View style={styles.perfCardInner}>
        <View style={styles.perfIconCircle}>
          <Text style={styles.perfIcon}>{icon}</Text>
        </View>
        <Text style={styles.perfValue}>{value}</Text>
        <Text style={styles.perfLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { user: currentUser } = useAuthStore();

  const userId = route.params?.userId;
  const isOwnProfile = !userId || userId === currentUser?.id;

  const [profile, setProfile] = useState<User | null>(isOwnProfile ? currentUser : null);
  const [isLoading, setIsLoading] = useState(!isOwnProfile);
  const [isFollowing, setIsFollowing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'performance' | 'about' | 'activity'>('performance');

  useEffect(() => {
    if (!isOwnProfile && userId) {
      fetchProfile(userId);
    }
  }, [userId, isOwnProfile]);

  const fetchProfile = async (id: string) => {
    setIsLoading(true);
    // TODO: API call to fetch profile
    setTimeout(() => {
      setProfile({
        id,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        role: 'STUDENT',
        isVerified: true,
        isOnline: false,
        languages: [],
        interests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsLoading(false);
    }, 1000);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (!isOwnProfile && userId) {
      await fetchProfile(userId);
    }
    setRefreshing(false);
  }, [isOwnProfile, userId]);

  const handleFollow = useCallback(() => {
    setIsFollowing(!isFollowing);
    // TODO: API call
  }, [isFollowing]);

  const handleEditProfile = useCallback(() => {
    navigation.navigate('EditProfile' as any);
  }, [navigation]);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const stats = {
    posts: 142,
    followers: 1247,
    following: 456,
  };

  const tabs = [
    { id: 'performance', label: 'Performance', icon: 'trending-up' },
    { id: 'about', label: 'About', icon: 'person' },
    { id: 'activity', label: 'Activity', icon: 'flame' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Cover Photo Section */}
        <View style={styles.coverSection}>
          <LinearGradient
            colors={['#BAE6FD', '#E0F2FE', '#F0F9FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverGradient}
          />

          {/* Back Button */}
          <SafeAreaView edges={['top']} style={styles.headerButtons}>
            {/* Settings Button (Own Profile) */}
            {isOwnProfile && (
              <View style={styles.headerTopRow}>
                <TouchableOpacity style={styles.headerCircleBtn}>
                  <Ionicons name="settings-outline" size={20} color="#1a1a1a" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerCircleBtn}>
                  <Ionicons name="camera-outline" size={20} color="#1a1a1a" />
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </View>

        {/* Profile Content */}
        <View style={styles.contentContainer}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
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
                <TouchableOpacity style={styles.editAvatarButton}>
                  <View style={styles.editAvatarCircle}>
                    <Ionicons name="camera-outline" size={16} color="#0EA5E9" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Name & Bio Section */}
          <Animated.View entering={FadeIn.delay(200)} style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{fullName}</Text>
              {profile.isVerified && (
                <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
              )}
            </View>

            {/* Level Badge - Moved here */}
            <View style={styles.levelBadgeInline}>
              <LinearGradient
                colors={['#0EA5E9', '#0284C7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.levelBadgeGradient}
              >
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={styles.levelTextInline}>Level 5</Text>
              </LinearGradient>
            </View>

            <Text style={styles.headline}>Computer Science Student</Text>
            <Text style={styles.bio}>
              Passionate about learning and building amazing things
            </Text>

            {/* Location & Social Links */}
            <View style={styles.metaRow}>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                <Text style={styles.locationText}>Phnom Penh, Cambodia</Text>
              </View>

              <View style={styles.socialLinks}>
                <TouchableOpacity style={styles.socialIcon}>
                  <Ionicons name="logo-github" size={16} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon}>
                  <Ionicons name="logo-linkedin" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Stats Cards — Individual mini-cards */}
          <Animated.View entering={FadeIn.delay(300)} style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
              <LinearGradient
                colors={['#F3E8FF', '#FAF5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCardGradient}
              >
                <View style={[styles.statIconCircle, { backgroundColor: '#C084FC' }]}>
                  <Ionicons name="document-text" size={16} color="#581C87" />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.posts)}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
              <LinearGradient
                colors={['#DBEAFE', '#EFF6FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCardGradient}
              >
                <View style={[styles.statIconCircle, { backgroundColor: '#93C5FD' }]}>
                  <Ionicons name="people" size={16} color="#1E3A5F" />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.followers)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
              <LinearGradient
                colors={['#D1FAE5', '#ECFDF5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCardGradient}
              >
                <View style={[styles.statIconCircle, { backgroundColor: '#6EE7B7' }]}>
                  <Ionicons name="heart" size={16} color="#064E3B" />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.following)}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Action Buttons — Compact layout */}
          <Animated.View entering={FadeIn.delay(400)} style={styles.actionButtons}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  style={styles.editPill}
                  onPress={handleEditProfile}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={16} color="#0284C7" />
                  <Text style={styles.editPillText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="share-social-outline" size={18} color="#6B7280" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="qr-code-outline" size={18} color="#6B7280" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.followPill, isFollowing && styles.followPillFollowing]}
                  onPress={handleFollow}
                  activeOpacity={0.8}
                >
                  {isFollowing ? (
                    <>
                      <Ionicons name="checkmark" size={16} color="#6B7280" />
                      <Text style={styles.followPillTextFollowing}>Following</Text>
                    </>
                  ) : (
                    <LinearGradient
                      colors={['#7DD3FC', '#0EA5E9', '#0284C7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.followPillGradient}
                    >
                      <Ionicons name="person-add" size={14} color="#fff" />
                      <Text style={styles.followPillText}>Follow</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="mail-outline" size={18} color="#6B7280" />
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* Performance Highlights — Blue Hero Card */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.highlightsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance Highlights</Text>
            </View>

            {/* Blue Hero Card */}
            <View style={styles.blueHeroCard}>
              <LinearGradient
                colors={['#38BDF8', '#0EA5E9', '#0284C7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.blueHeroGradient}
              >
                {/* Decorative circles */}
                <View style={[styles.blueDecorCircle, { top: -20, right: -15, width: 80, height: 80 }]} />
                <View style={[styles.blueDecorCircle, { bottom: -10, left: -10, width: 60, height: 60 }]} />
                <View style={[styles.blueDecorCircle, { top: 30, left: 50, width: 30, height: 30, opacity: 0.08 }]} />

                <View style={styles.blueHeroHeader}>
                  <View style={styles.blueHeroIconCircle}>
                    <Ionicons name="trending-up" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.blueHeroTitle}>Your Progress</Text>
                </View>

                {/* 3 inline stats */}
                <View style={styles.blueHeroStatsRow}>
                  <View style={styles.blueHeroStat}>
                    <Text style={styles.blueHeroStatValue}>12</Text>
                    <Text style={styles.blueHeroStatLabel}>Courses</Text>
                  </View>
                  <View style={styles.blueHeroStatDivider} />
                  <View style={styles.blueHeroStat}>
                    <Text style={styles.blueHeroStatValue}>85%</Text>
                    <Text style={styles.blueHeroStatLabel}>Avg Grade</Text>
                  </View>
                  <View style={styles.blueHeroStatDivider} />
                  <View style={styles.blueHeroStat}>
                    <Text style={styles.blueHeroStatValue}>142h</Text>
                    <Text style={styles.blueHeroStatLabel}>Study Time</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Secondary stat cards — 2-column grid */}
            <View style={styles.perfGrid}>
              <PerformanceCard icon="📚" value={12} label="Courses" />
              <PerformanceCard icon="📈" value="85%" label="Avg Grade" />
              <PerformanceCard icon="⏰" value={142} label="Study Hours" />
              <PerformanceCard icon="🔥" value={12} label="Day Streak" />
              <PerformanceCard icon="🏆" value={24} label="Achievements" />
              <PerformanceCard icon="💻" value={8} label="Projects" />
            </View>
          </Animated.View>

          {/* Tabs */}
          <Animated.View entering={FadeIn.delay(600)} style={styles.tabsSection}>
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
          </Animated.View>

          {/* Tab Content */}
          <Animated.View entering={FadeInDown.delay(700)} style={styles.tabContent}>
            {activeTab === 'performance' && (
              <View style={styles.contentPlaceholder}>
                <Ionicons name="analytics-outline" size={48} color="#E5E7EB" />
                <Text style={styles.placeholderText}>Performance data will appear here</Text>
              </View>
            )}
            {activeTab === 'about' && (
              <View style={styles.contentPlaceholder}>
                <Ionicons name="person-outline" size={48} color="#E5E7EB" />
                <Text style={styles.placeholderText}>About information will appear here</Text>
              </View>
            )}
            {activeTab === 'activity' && (
              <View style={styles.contentPlaceholder}>
                <Ionicons name="flame-outline" size={48} color="#E5E7EB" />
                <Text style={styles.placeholderText}>Activity timeline will appear here</Text>
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  editCoverButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  levelBadgeInline: {
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    ...Shadows.small,
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
    ...Shadows.small,
  },
  nameSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  headline: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardGradient: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 28,
  },
  // ── Compact edit pill ──
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // ── Follow pill ──
  followPill: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  followPillFollowing: {
    backgroundColor: '#F3F4F6',
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
  // ── Blue Hero Card ──
  blueHeroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 12,
  },
  blueHeroGradient: {
    borderRadius: 20,
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  blueDecorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  blueHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  blueHeroIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  blueHeroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  blueHeroStat: {
    flex: 1,
    alignItems: 'center',
  },
  blueHeroStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  blueHeroStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blueHeroStatDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
  },
  // ── Performance mini-cards ──
  perfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  perfCard: {
    width: '47.5%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EFF6FF',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  perfCardInner: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  perfIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  perfIcon: {
    fontSize: 18,
  },
  perfValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0C4A6E',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  perfLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    ...Shadows.small,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center',
  },
});
