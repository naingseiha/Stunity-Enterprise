/**
 * Clubs Screen — Premium Enterprise Design
 * 
 * Matching feed/course design language:
 * - Soft purple background (#F5F3FF)
 * - Circular header buttons
 * - Amber brand FAB
 * - Gradient club cards
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

const StunityLogo = require('../../../../../Stunity.png');

import { Avatar } from '@/components/common';
import { Colors } from '@/config';
import { useNavigationContext } from '@/contexts';
import { Club } from '@/api/clubs';
import { useClubStore } from '@/stores';

const CLUB_TYPES = [
  { id: 'CASUAL_STUDY_GROUP', name: 'Study Groups', icon: 'people', color: '#2563EB', bgColor: '#DBEAFE' },
  { id: 'STRUCTURED_CLASS', name: 'Classes', icon: 'school', color: '#059669', bgColor: '#D1FAE5' },
  { id: 'PROJECT_GROUP', name: 'Projects', icon: 'rocket', color: '#DC2626', bgColor: '#FEE2E2' },
  { id: 'EXAM_PREP', name: 'Exam Prep', icon: 'book', color: '#7C3AED', bgColor: '#EDE9FE' },
];

export default function ClubsScreen() {
  // Cast to any to avoid complex navigation typing issues for now
  const navigation = useNavigation<any>();
  const { openSidebar } = useNavigationContext();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'joined' | 'discover'>('all');
  const [selectedType, setSelectedType] = useState('all');
  const {
    clubs,
    isLoading: loading,
    error,
    fetchClubs: fetchClubsAction,
    joinClub,
    leaveClub,
    subscribeToClubs,
    unsubscribeFromClubs
  } = useClubStore();

  const [refreshing, setRefreshing] = useState(false);

  // Fetch clubs
  const fetchClubs = useCallback(async () => {
    try {
      const params: any = {};

      if (selectedFilter === 'joined') {
        params.joined = true;
      } else if (selectedFilter === 'discover') {
        params.joined = false;
      }

      if (selectedType !== 'all') {
        params.type = selectedType;
      }

      await fetchClubsAction(params);
    } catch (err: any) {
      console.error('Failed to fetch clubs:', err);
    } finally {
      setRefreshing(false);
    }
  }, [selectedFilter, selectedType, fetchClubsAction]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClubs();
  }, [fetchClubs]);

  const handleToggleJoin = useCallback(async (clubId: string, isJoined: boolean) => {
    try {
      if (isJoined) {
        await leaveClub(clubId);
      } else {
        await joinClub(clubId);
      }
      // Store updates optimistically or refetches automatically
    } catch (err: any) {
      console.error('Failed to toggle club membership:', err);
      alert(err.message || 'Failed to update membership');
    }
  }, [joinClub, leaveClub]);

  // Subscribe to real-time updates
  useEffect(() => {
    subscribeToClubs();
    return () => unsubscribeFromClubs();
  }, [subscribeToClubs, unsubscribeFromClubs]);

  const filteredClubs = selectedType === 'all'
    ? clubs
    : clubs.filter(club => club.type === selectedType);

  const renderClubCard = ({ item: club, index }: { item: Club; index: number }) => {
    const isJoined = club.memberCount !== undefined && club.memberCount > 0;
    const typeConfig = CLUB_TYPES.find(t => t.id === club.type) || CLUB_TYPES[0];

    // Beautiful gradient colors for each type
    const gradients: Record<string, [string, string]> = {
      CASUAL_STUDY_GROUP: ['#667eea', '#764ba2'], // Purple to Dark Purple
      STRUCTURED_CLASS: ['#56CCF2', '#2F80ED'], // Cyan to Blue
      PROJECT_GROUP: ['#F2994A', '#F2C94C'], // Orange to Yellow
      EXAM_PREP: ['#C471ED', '#F64F59'], // Purple to Pink
    };

    const gradientColors = gradients[club.type] || gradients.CASUAL_STUDY_GROUP;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={styles.clubCard}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ClubDetails', { clubId: club.id })}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCard}
          >
            {/* Top Section - Icon & Badge */}
            <View style={styles.cardTopSection}>
              {/* Icon in White Rounded Square */}
              <View style={styles.iconSquare}>
                <Ionicons name={typeConfig.icon as any} size={32} color={gradientColors[0]} />
              </View>

              {/* Type Badge */}
              <View style={styles.typeBadgeNew}>
                <Text style={styles.typeBadgeTextNew}>{typeConfig.name}</Text>
              </View>
            </View>

            {/* Club Name - Bold White */}
            <Text style={styles.clubNameNew} numberOfLines={2}>
              {club.name}
            </Text>

            {/* Description - Light White */}
            <Text style={styles.clubDescriptionNew} numberOfLines={2}>
              {club.description}
            </Text>

            {/* Tags Row */}
            {club.tags && club.tags.length > 0 && (
              <View style={styles.tagsRowNew}>
                {club.tags.slice(0, 2).map((tag, i) => (
                  <View key={i} style={styles.tagNew}>
                    <Text style={styles.tagTextNew}>#{tag}</Text>
                  </View>
                ))}
                {club.tags.length > 2 && (
                  <Text style={styles.moreTagsTextNew}>+{club.tags.length - 2}</Text>
                )}
              </View>
            )}

            {/* Bottom Section - Creator & Stats */}
            <View style={styles.cardBottomSection}>
              {/* Creator Info */}
              {club.creator && (
                <View style={styles.creatorRowNew}>
                  <Avatar
                    uri={club.creator.profilePictureUrl}
                    name={`${club.creator.firstName} ${club.creator.lastName}`}
                    size="xs"
                    variant="post"
                  />
                  <Text style={styles.creatorNameNew} numberOfLines={1}>
                    {club.creator.firstName} {club.creator.lastName}
                  </Text>
                </View>
              )}

              {/* Member Count with Icon */}
              <View style={styles.memberBadgeNew}>
                <Ionicons name="people" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.memberCountNew}>{club.memberCount || 0}</Text>
              </View>
            </View>

            {/* Mode Indicator (if not public) */}
            {club.mode !== 'PUBLIC' && (
              <View style={styles.modeIndicatorNew}>
                <Ionicons
                  name={club.mode === 'INVITE_ONLY' ? 'lock-closed' : 'checkmark-circle'}
                  size={12}
                  color="rgba(255,255,255,0.9)"
                />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header - Match FeedScreen Design */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="#374151" />
        </TouchableOpacity>

        <Image
          source={StunityLogo}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Header Divider */}
      <View style={styles.headerDivider} />

      {/* Filter Tabs — Circle style matching course screen */}
      <Animated.View entering={FadeInDown.duration(300)} style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Main Filters as circles */}
          {(['all', 'joined', 'discover'] as const).map((filter, index) => {
            const isActive = selectedFilter === filter;
            const filterConfig = {
              all: { label: 'All', icon: 'apps' as const, color: '#0EA5E9', bg: '#E0F2FE' },
              joined: { label: 'My Clubs', icon: 'heart' as const, color: '#EC4899', bg: '#FCE7F3' },
              discover: { label: 'Discover', icon: 'compass' as const, color: '#6366F1', bg: '#EEF2FF' },
            }[filter];
            return (
              <Animated.View key={filter} entering={FadeInRight.delay(50 * index).duration(300)}>
                <TouchableOpacity
                  style={styles.tabCircleItem}
                  onPress={() => setSelectedFilter(filter)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.tabCircleIcon,
                    { backgroundColor: filterConfig.bg },
                    isActive && {
                      backgroundColor: filterConfig.color,
                      shadowColor: filterConfig.color,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 5,
                    },
                  ]}>
                    <Ionicons name={filterConfig.icon} size={24} color={isActive ? '#fff' : filterConfig.color} />
                  </View>
                  <Text style={[
                    styles.tabCircleLabel,
                    isActive && { color: filterConfig.color, fontWeight: '700' as const },
                  ]}>{filterConfig.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          <View style={styles.divider} />

          {/* Type Filters as circles */}
          {CLUB_TYPES.map((type, index) => {
            const isActive = selectedType === type.id;
            return (
              <Animated.View key={type.id} entering={FadeInRight.delay(50 * (index + 3)).duration(300)}>
                <TouchableOpacity
                  style={styles.tabCircleItem}
                  onPress={() => setSelectedType(isActive ? 'all' : type.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.tabCircleIcon,
                    { backgroundColor: type.bgColor },
                    isActive && {
                      backgroundColor: type.color,
                      shadowColor: type.color,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 5,
                    },
                  ]}>
                    <Ionicons name={type.icon as any} size={24} color={isActive ? '#fff' : type.color} />
                  </View>
                  <Text style={[
                    styles.tabCircleLabel,
                    isActive && { color: type.color, fontWeight: '700' as const },
                  ]}>{type.name}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Clubs List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchClubs}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredClubs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search" size={48} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>No clubs found</Text>
          <Text style={styles.emptySubtext}>
            {selectedFilter === 'joined'
              ? 'Join some clubs to see them here'
              : 'Try changing your filters'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredClubs}
          renderItem={renderClubCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}

      {/* Floating Action Button - Create Club */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateClub')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#7DD3FC', '#0EA5E9', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// Helper functions
const getTypeColor = (type: string) => {
  switch (type) {
    case 'CASUAL_STUDY_GROUP': return '#DBEAFE'; // Light blue
    case 'STRUCTURED_CLASS': return '#D1FAE5'; // Light green
    case 'PROJECT_GROUP': return '#FEE2E2'; // Light red
    case 'EXAM_PREP': return '#EDE9FE'; // Light purple
    default: return '#E0F2FE'; // Light amber
  }
};

const getTypeColorDark = (type: string) => {
  switch (type) {
    case 'CASUAL_STUDY_GROUP': return '#BFDBFE'; // Slightly darker blue
    case 'STRUCTURED_CLASS': return '#A7F3D0'; // Slightly darker green
    case 'PROJECT_GROUP': return '#FECACA'; // Slightly darker red
    case 'EXAM_PREP': return '#DDD6FE'; // Slightly darker purple
    default: return '#BAE6FD'; // Slightly darker amber
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'CASUAL_STUDY_GROUP': return 'people';
    case 'STRUCTURED_CLASS': return 'school';
    case 'PROJECT_GROUP': return 'rocket';
    case 'EXAM_PREP': return 'book';
    default: return 'school';
  }
};

const getIconColor = (type: string) => {
  switch (type) {
    case 'CASUAL_STUDY_GROUP': return '#2563EB'; // Blue
    case 'STRUCTURED_CLASS': return '#059669'; // Green
    case 'PROJECT_GROUP': return '#DC2626'; // Red
    case 'EXAM_PREP': return '#7C3AED'; // Purple
    default: return '#0EA5E9'; // Amber
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'CASUAL_STUDY_GROUP': return 'Study Group';
    case 'STRUCTURED_CLASS': return 'Class';
    case 'PROJECT_GROUP': return 'Project';
    case 'EXAM_PREP': return 'Exam Prep';
    default: return 'Club';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#EDE9FE',
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: {
    width: 110,
    height: 30,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSection: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tabCircleItem: {
    alignItems: 'center',
    width: 68,
  },
  tabCircleIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tabCircleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#EDE9FE',
    marginHorizontal: 4,
    alignSelf: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 32,
  },
  clubCard: {
    marginBottom: 16,
  },
  // Beautiful gradient card design
  gradientCard: {
    borderRadius: 20,
    padding: 20,
    minHeight: 200,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconSquare: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBadgeNew: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  typeBadgeTextNew: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  clubNameNew: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 28,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  clubDescriptionNew: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsRowNew: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tagNew: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tagTextNew: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  moreTagsTextNew: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
  },
  cardBottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  creatorRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  creatorNameNew: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  memberBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  memberCountNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  modeIndicatorNew: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  // OLD STYLES - Remove these later
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  clubCover: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadgeCorner: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBadgeCornerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  clubContent: {
    padding: 16,
  },
  clubName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 24,
    marginBottom: 8,
  },
  clubDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreTagsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    alignSelf: 'center',
  },
  clubFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  clubMeta: {
    flex: 1,
    gap: 6,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  metaStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 12,
    color: '#D1D5DB',
    marginHorizontal: 2,
  },
  modeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textSecondary,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    backgroundColor: '#0EA5E9',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  joinedButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  // Floating Action Button — Amber brand
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 29,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
