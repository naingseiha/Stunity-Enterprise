/**
 * Profile Screen - Redesigned
 * 
 * Beautiful, modern profile with Instagram/SchoolApp inspired design
 * Features: Cover photo, avatar, stats, performance highlights, tabs
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

function StatsCard({ icon, value, label, colors }: StatsCardProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.statsCard}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCardGradient}
      >
        <Text style={styles.statsIcon}>{icon}</Text>
        <View style={styles.statsContent}>
          <Text style={styles.statsValue}>{value}</Text>
          <Text style={styles.statsLabel}>{label}</Text>
        </View>
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
            colors={['#FFF9E6', '#FFE4E1', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverGradient}
          />
          
          {/* Back Button */}
          <SafeAreaView edges={['top']} style={styles.headerButtons}>
            {/* Edit Cover Button (Own Profile) */}
            {isOwnProfile && (
              <View style={styles.editCoverButtonWrapper}>
                <TouchableOpacity style={styles.editCoverButton}>
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
                    <Ionicons name="camera-outline" size={16} color="#FFA500" />
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
                colors={['#FFA500', '#FF8C00']}
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

          {/* Stats Row */}
          <Animated.View entering={FadeIn.delay(300)} style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(stats.posts)}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            
            <View style={styles.statDivider} />
            
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(stats.followers)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            
            <View style={styles.statDivider} />
            
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(stats.following)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View entering={FadeIn.delay(400)} style={styles.actionButtons}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleEditProfile}
                >
                  <LinearGradient
                    colors={['#FFA500', '#FF8C00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                  >
                    <Ionicons name="create-outline" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Edit Profile</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.secondaryButton}>
                  <Ionicons name="share-social-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.flexButton]}
                  onPress={handleFollow}
                >
                  <LinearGradient
                    colors={isFollowing ? ['#F3F4F6', '#F3F4F6'] : ['#FFA500', '#FF8C00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                  >
                    <Text style={[styles.primaryButtonText, isFollowing && styles.followingText]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.secondaryButton}>
                  <Ionicons name="mail-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* Performance Highlights */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.highlightsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance Highlights</Text>
            </View>

            <View style={styles.highlightsGrid}>
              <StatsCard
                icon="📚"
                value={12}
                label="Courses"
                colors={['#F3E8FF', '#FAF5FF']}
              />
              <StatsCard
                icon="📈"
                value="85%"
                label="Avg Grade"
                colors={['#D1FAE5', '#ECFDF5']}
              />
              <StatsCard
                icon="⏰"
                value={142}
                label="Study Hours"
                colors={['#DBEAFE', '#EFF6FF']}
              />
              <StatsCard
                icon="🔥"
                value={12}
                label="Day Streak"
                colors={['#FFEDD5', '#FFF7ED']}
              />
              <StatsCard
                icon="🏆"
                value={24}
                label="Achievements"
                colors={['#FEF3C7', '#FFFBEB']}
              />
              <StatsCard
                icon="💻"
                value={8}
                label="Projects"
                colors={['#CCFBF1', '#F0FDFA']}
              />
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
                        <Ionicons name={tab.icon as any} size={18} color="#FFA500" />
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
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  editCoverButtonWrapper: {
    alignItems: 'flex-end',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    marginBottom: 16,
    ...Shadows.small,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 32,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    ...Shadows.small,
  },
  flexButton: {
    flex: 1,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  followingText: {
    color: '#6B7280',
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
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
  statsCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderRadius: 16,
    ...Shadows.small,
  },
  statsIcon: {
    fontSize: 28,
  },
  statsContent: {
    flex: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
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
    backgroundColor: '#FFA500',
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
    color: '#FFA500',
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
