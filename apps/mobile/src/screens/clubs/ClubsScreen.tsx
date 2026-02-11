/**
 * Clubs Screen
 * 
 * Discover and join study clubs with real-time data
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

const StunityLogo = require('../../../../../Stunity.png');

import { Avatar, Card } from '@/components/common';
import { Colors } from '@/config';
import { useNavigationContext } from '@/contexts';
import { clubsApi, Club } from '@/api';

const CLUB_TYPES = [
  { id: 'all', name: 'All Clubs', icon: 'apps', color: '#FFA500' },
  { id: 'CASUAL_STUDY_GROUP', name: 'Study Groups', icon: 'people', color: '#6366F1' },
  { id: 'STRUCTURED_CLASS', name: 'Classes', icon: 'school', color: '#10B981' },
  { id: 'PROJECT_GROUP', name: 'Projects', icon: 'rocket', color: '#EC4899' },
  { id: 'EXAM_PREP', name: 'Exam Prep', icon: 'book', color: '#8B5CF6' },
];

export default function ClubsScreen() {
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
      
      // Filter by joined status
      if (selectedFilter === 'joined') {
        params.joined = true;
      } else if (selectedFilter === 'discover') {
        params.joined = false;
      }
      
      // Filter by type
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

  // Initial load
  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClubs();
  }, [fetchClubs]);

  // Join/Leave club
  const handleToggleJoin = useCallback(async (clubId: string, isJoined: boolean) => {
    try {
      if (isJoined) {
        await clubsApi.leaveClub(clubId);
      } else {
        await clubsApi.joinClub(clubId);
      }
      
      // Refresh club list
      fetchClubs();
    } catch (err: any) {
      console.error('Failed to toggle club membership:', err);
      alert(err.message || 'Failed to update membership');
    }
  }, [fetchClubs]);

  // Filter clubs by type
  const filteredClubs = selectedType === 'all' 
    ? clubs 
    : clubs.filter(club => club.type === selectedType);

  // Render club card
  const renderClubCard = ({ item: club, index }: { item: Club; index: number }) => {
    const isJoined = club.memberCount !== undefined; // Simple check, could be improved

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={styles.clubCard}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          // onPress={() => navigation.navigate('ClubDetails', { clubId: club.id })}
        >
          <Card style={styles.cardInner}>
            {/* Cover Image */}
            {club.coverImage ? (
              <Image source={{ uri: club.coverImage }} style={styles.clubCover} />
            ) : (
              <LinearGradient
                colors={['#6366F1', '#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.clubCover}
              >
                <Ionicons name="school" size={40} color="white" />
              </LinearGradient>
            )}

            {/* Content */}
            <View style={styles.clubContent}>
              <View style={styles.clubHeader}>
                <Text style={styles.clubName} numberOfLines={1}>
                  {club.name}
                </Text>
                
                {/* Club Type Badge */}
                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(club.type) }]}>
                  <Text style={styles.typeBadgeText}>{getTypeLabel(club.type)}</Text>
                </View>
              </View>

              <Text style={styles.clubDescription} numberOfLines={2}>
                {club.description}
              </Text>

              {/* Creator */}
              {club.creator && (
                <View style={styles.creatorRow}>
                  <Avatar
                    size="xs"
                    name={`${club.creator.firstName} ${club.creator.lastName}`}
                    imageUrl={club.creator.profilePictureUrl}
                  />
                  <Text style={styles.creatorName}>
                    {club.creator.firstName} {club.creator.lastName}
                  </Text>
                </View>
              )}

              {/* Footer */}
              <View style={styles.clubFooter}>
                <View style={styles.memberCount}>
                  <Ionicons name="people" size={16} color={Colors.textSecondary} />
                  <Text style={styles.memberCountText}>
                    {club.memberCount || 0} members
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.joinButton, isJoined && styles.joinedButton]}
                  onPress={() => handleToggleJoin(club.id, isJoined)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isJoined ? 'checkmark-circle' : 'add-circle'}
                    size={18}
                    color={isJoined ? Colors.primary : 'white'}
                  />
                  <Text style={[styles.joinButtonText, isJoined && styles.joinedButtonText]}>
                    {isJoined ? 'Joined' : 'Join'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openSidebar} style={styles.logoContainer}>
          <Image source={StunityLogo} style={styles.logo} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Clubs</Text>

        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="search" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['all', 'joined', 'discover'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.filterTabActive,
            ]}
            onPress={() => setSelectedFilter(filter as any)}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedFilter === filter && styles.filterTabTextActive,
              ]}
            >
              {filter === 'all' ? 'All' : filter === 'joined' ? 'My Clubs' : 'Discover'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        style={styles.categoriesScroll}
      >
        {CLUB_TYPES.map((type, index) => (
          <Animated.View
            key={type.id}
            entering={FadeInRight.delay(index * 50).springify()}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedType === type.id && {
                  backgroundColor: type.color,
                  borderColor: type.color,
                },
              ]}
              onPress={() => setSelectedType(type.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={type.icon as any}
                size={18}
                color={selectedType === type.id ? 'white' : type.color}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedType === type.id && styles.categoryChipTextActive,
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// Helper functions
const getTypeColor = (type: string) => {
  switch (type) {
    case 'CASUAL_STUDY_GROUP': return '#6366F1';
    case 'STRUCTURED_CLASS': return '#10B981';
    case 'PROJECT_GROUP': return '#EC4899';
    case 'EXAM_PREP': return '#8B5CF6';
    default: return '#FFA500';
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
  logoContainer: {
    padding: 4,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    padding: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: 'white',
  },
  categoriesScroll: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryChipTextActive: {
    color: 'white',
  },
  listContent: {
    padding: 16,
  },
  clubCard: {
    marginBottom: 16,
  },
  cardInner: {
    overflow: 'hidden',
    padding: 0,
  },
  clubCover: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubContent: {
    padding: 16,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clubName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  clubDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  creatorName: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  clubFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCountText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    gap: 4,
  },
  joinedButton: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  joinedButtonText: {
    color: Colors.primary,
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
    borderRadius: 8,
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
});
