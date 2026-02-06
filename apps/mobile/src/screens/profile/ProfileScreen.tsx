/**
 * Profile Screen
 * 
 * User profile with posts, info, and actions
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Avatar, Button, Card, Loading } from '@/components/common';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '@/config';
import { useAuthStore } from '@/stores';
import { User } from '@/types';
import { formatNumber } from '@/utils';
import { ProfileStackScreenProps } from '@/navigation/types';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 180;

type RouteProp = ProfileStackScreenProps<'Profile'>['route'];
type NavigationProp = ProfileStackScreenProps<'Profile'>['navigation'];

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
  const [activeTab, setActiveTab] = useState<'posts' | 'courses' | 'about'>('posts');

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
        <Ionicons name="person-outline" size={64} color={Colors.gray[300]} />
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  const stats = [
    { label: 'Posts', value: 42 },
    { label: 'Followers', value: 1234 },
    { label: 'Following', value: 567 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.primary[400]]}
        style={styles.header}
      >
        <View style={styles.headerActions}>
          {!isOwnProfile && (
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {isOwnProfile && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Settings' as any)}
              style={styles.settingsButton}
            >
              <Ionicons name="settings-outline" size={24} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary[500]}
          />
        }
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Avatar
              uri={profile.profilePictureUrl}
              name={`${profile.firstName} ${profile.lastName}`}
              size="2xl"
            />
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary[500]} />
              </View>
            )}
          </View>

          <Text style={styles.name}>
            {profile.firstName} {profile.lastName}
          </Text>
          
          {profile.headline && (
            <Text style={styles.headline}>{profile.headline}</Text>
          )}

          <Text style={styles.role}>
            {profile.role.charAt(0) + profile.role.slice(1).toLowerCase()}
          </Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <TouchableOpacity key={stat.label} style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(stat.value)}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <Button
                onPress={handleEditProfile}
                variant="outline"
                style={styles.actionButton}
              >
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  onPress={handleFollow}
                  variant={isFollowing ? 'outline' : 'primary'}
                  style={styles.actionButton}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button
                  onPress={() => navigation.navigate('Chat' as any, { userId: profile.id })}
                  variant="outline"
                  style={styles.messageButton}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.primary[500]} />
                </Button>
              </>
            )}
          </View>
        </Animated.View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['posts', 'courses', 'about'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <Animated.View entering={FadeIn} style={styles.tabContent}>
          {activeTab === 'posts' && (
            <View style={styles.emptyTab}>
              <Ionicons name="newspaper-outline" size={48} color={Colors.gray[300]} />
              <Text style={styles.emptyTabText}>No posts yet</Text>
            </View>
          )}
          {activeTab === 'courses' && (
            <View style={styles.emptyTab}>
              <Ionicons name="book-outline" size={48} color={Colors.gray[300]} />
              <Text style={styles.emptyTabText}>No courses yet</Text>
            </View>
          )}
          {activeTab === 'about' && (
            <Card style={styles.aboutCard}>
              <View style={styles.aboutSection}>
                <View style={styles.aboutHeader}>
                  <Ionicons name="mail-outline" size={20} color={Colors.gray[500]} />
                  <Text style={styles.aboutLabel}>Email</Text>
                </View>
                <Text style={styles.aboutValue}>{profile.email}</Text>
              </View>
              
              {profile.bio && (
                <View style={styles.aboutSection}>
                  <View style={styles.aboutHeader}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.gray[500]} />
                    <Text style={styles.aboutLabel}>Bio</Text>
                  </View>
                  <Text style={styles.aboutValue}>{profile.bio}</Text>
                </View>
              )}

              <View style={styles.aboutSection}>
                <View style={styles.aboutHeader}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.gray[500]} />
                  <Text style={styles.aboutLabel}>Joined</Text>
                </View>
                <Text style={styles.aboutValue}>
                  {new Date(profile.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </Card>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    height: HEADER_HEIGHT,
    paddingTop: Spacing[2],
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    marginTop: -80,
  },
  profileCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    borderRadius: BorderRadius.xl,
    padding: Spacing[6],
    alignItems: 'center',
    ...Shadows.md,
  },
  avatarContainer: {
    position: 'relative',
    marginTop: -60,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  name: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.gray[900],
    marginTop: Spacing[3],
  },
  headline: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
    marginTop: Spacing[1],
    textAlign: 'center',
    paddingHorizontal: Spacing[4],
  },
  role: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary[500],
    fontWeight: '600',
    marginTop: Spacing[2],
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: Spacing[6],
    paddingTop: Spacing[4],
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
    width: '100%',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
    marginTop: Spacing[1],
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: Spacing[6],
    gap: Spacing[3],
  },
  actionButton: {
    flex: 1,
  },
  messageButton: {
    width: 50,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    borderRadius: BorderRadius.lg,
    padding: Spacing[1],
    ...Shadows.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing[3],
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  activeTab: {
    backgroundColor: Colors.primary[50],
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.gray[500],
  },
  activeTabText: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  tabContent: {
    padding: Spacing[4],
    minHeight: 200,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[12],
  },
  emptyTabText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[400],
    marginTop: Spacing[3],
  },
  aboutCard: {
    padding: Spacing[4],
  },
  aboutSection: {
    marginBottom: Spacing[4],
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  aboutLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
    fontWeight: '500',
  },
  aboutValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[800],
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray[50],
  },
  errorText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.gray[500],
    marginTop: Spacing[3],
  },
});
