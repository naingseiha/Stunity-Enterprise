/**
 * Clubs Screen
 * 
 * Clean, professional club discovery interface
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
import { clubsApi, Club } from '@/api';

const CLUB_TYPES = [
  { id: 'CASUAL_STUDY_GROUP', name: 'Study Groups', icon: 'people', color: '#2563EB', bgColor: '#DBEAFE' },
  { id: 'STRUCTURED_CLASS', name: 'Classes', icon: 'school', color: '#059669', bgColor: '#D1FAE5' },
  { id: 'PROJECT_GROUP', name: 'Projects', icon: 'rocket', color: '#DC2626', bgColor: '#FEE2E2' },
  { id: 'EXAM_PREP', name: 'Exam Prep', icon: 'book', color: '#7C3AED', bgColor: '#EDE9FE' },
];

export default function ClubsScreen() {
  const navigation = useNavigation();
  const { openSidebar } = useNavigationContext();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'joined' | 'discover'>('all');
  const [selectedType, setSelectedType] = useState('all');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch clubs
  const fetchClubs = useCallback(async () => {
    try {
      setError(null);
      const params: any = {};
      
      if (selectedFilter === 'joined') {
        params.joined = true;
      } else if (selectedFilter === 'discover') {
        params.joined = false;
      }
      
      if (selectedType !== 'all') {
        params.type = selectedType;
      }

      const data = await clubsApi.getClubs(params);
      setClubs(data);
    } catch (err: any) {
      console.error('Failed to fetch clubs:', err);
      setError(err.message || 'Failed to load clubs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter, selectedType]);

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
        await clubsApi.leaveClub(clubId);
      } else {
        await clubsApi.joinClub(clubId);
      }
      fetchClubs();
    } catch (err: any) {
      console.error('Failed to toggle club membership:', err);
      alert(err.message || 'Failed to update membership');
    }
  }, [fetchClubs]);

  const filteredClubs = selectedType === 'all' 
    ? clubs 
    : clubs.filter(club => club.type === selectedType);

  const renderClubCard = ({ item: club, index }: { item: Club; index: number }) => {
    const isJoined = club.memberCount !== undefined && club.memberCount > 0;
    const typeConfig = CLUB_TYPES.find(t => t.id === club.type) || CLUB_TYPES[0];

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={styles.clubCard}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ClubDetails' as never, { clubId: club.id } as never)}
        >
          <View style={styles.cardInner}>
            {/* Cover Image / Gradient */}
            {club.coverImage ? (
              <Image source={{ uri: club.coverImage }} style={styles.clubCover} />
            ) : (
              <LinearGradient
                colors={[typeConfig.color, getTypeColorDark(club.type)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.clubCover}
              >
                <Ionicons name={typeConfig.icon as any} size={40} color="rgba(255,255,255,0.95)" />
              </LinearGradient>
            )}

            {/* Type Badge - Top Right Corner */}
            <View style={[styles.typeBadgeCorner, { backgroundColor: typeConfig.color }]}>
              <Ionicons name={typeConfig.icon as any} size={14} color="#fff" />
              <Text style={styles.typeBadgeCornerText}>{typeConfig.name}</Text>
            </View>

            {/* Content */}
            <View style={styles.clubContent}>
              {/* Club Name */}
              <Text style={styles.clubName} numberOfLines={2}>
                {club.name}
              </Text>

              {/* Description */}
              <Text style={styles.clubDescription} numberOfLines={2}>
                {club.description}
              </Text>

              {/* Tags */}
              {club.tags && club.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {club.tags.slice(0, 3).map((tag, i) => (
                    <View key={i} style={[styles.tag, { backgroundColor: typeConfig.bgColor }]}>
                      <Text style={[styles.tagText, { color: typeConfig.color }]}>
                        #{tag}
                      </Text>
                    </View>
                  ))}
                  {club.tags.length > 3 && (
                    <Text style={styles.moreTagsText}>+{club.tags.length - 3}</Text>
                  )}
                </View>
              )}

              {/* Footer */}
              <View style={styles.clubFooter}>
                {/* Creator & Member Info */}
                <View style={styles.clubMeta}>
                  {club.creator && (
                    <View style={styles.creatorRow}>
                      <Avatar
                        uri={club.creator.profilePictureUrl}
                        name={`${club.creator.firstName} ${club.creator.lastName}`}
                        size="xs"
                        variant="post"
                      />
                      <Text style={styles.creatorName} numberOfLines={1}>
                        {club.creator.firstName} {club.creator.lastName.charAt(0)}.
                      </Text>
                    </View>
                  )}
                  <View style={styles.metaStats}>
                    <Ionicons name="people" size={14} color="#9CA3AF" />
                    <Text style={styles.memberCount}>
                      {club.memberCount || 0} {club.memberCount === 1 ? 'member' : 'members'}
                    </Text>
                    {club.mode !== 'PUBLIC' && (
                      <>
                        <Text style={styles.metaDot}>•</Text>
                        <Ionicons 
                          name={club.mode === 'INVITE_ONLY' ? 'lock-closed' : 'checkmark-circle'} 
                          size={12} 
                          color="#9CA3AF" 
                        />
                        <Text style={styles.modeText}>
                          {club.mode === 'INVITE_ONLY' ? 'Invite Only' : 'Approval Required'}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Join Button */}
                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    isJoined && [styles.joinedButton, { borderColor: typeConfig.color }]
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleJoin(club.id, isJoined);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isJoined ? 'checkmark' : 'add'}
                    size={18}
                    color={isJoined ? typeConfig.color : '#fff'}
                  />
                  <Text style={[
                    styles.joinButtonText,
                    isJoined && { color: typeConfig.color }
                  ]}>
                    {isJoined ? 'Joined' : 'Join'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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

      {/* Filter Pills */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Main Filters */}
          {(['all', 'joined', 'discover'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                selectedFilter === filter && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === filter && styles.filterPillTextActive,
                ]}
              >
                {filter === 'all' ? 'All' : filter === 'joined' ? 'My Clubs' : 'Discover'}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          {/* Type Filters */}
          {CLUB_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.filterPill,
                selectedType === type.id && { backgroundColor: type.color },
                selectedType !== type.id && { backgroundColor: type.bgColor },
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <Ionicons
                name={type.icon as any}
                size={16}
                color={selectedType === type.id ? 'white' : type.color}
                style={styles.filterIcon}
              />
              <Text
                style={[
                  styles.filterPillText,
                  selectedType === type.id ? { color: 'white' } : { color: type.color },
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
        onPress={() => navigation.navigate('CreateClub' as never)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
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
    case 'CASUAL_STUDY_GROUP': return '#2563EB';
    case 'STRUCTURED_CLASS': return '#059669';
    case 'PROJECT_GROUP': return '#DC2626';
    case 'EXAM_PREP': return '#7C3AED';
    default: return '#F59E0B';
  }
};

const getTypeColorDark = (type: string) => {
  switch (type) {
    case 'CASUAL_STUDY_GROUP': return '#1E40AF';
    case 'STRUCTURED_CLASS': return '#047857';
    case 'PROJECT_GROUP': return '#B91C1C';
    case 'EXAM_PREP': return '#6D28D9';
    default: return '#D97706';
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: {
    width: 120,
    height: 32,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSection: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: 'white',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 32,
  },
  clubCard: {
    marginBottom: 16,
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    // Modern shadow like PostCard
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
    // Gradient effect using solid color
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  joinedButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
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
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
