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

import { Avatar, Card } from '@/components/common';
import { Colors } from '@/config';
import { useNavigationContext } from '@/contexts';
import { clubsApi, Club } from '@/api';

const CLUB_TYPES = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'CASUAL_STUDY_GROUP', name: 'Study Groups', icon: 'people' },
  { id: 'STRUCTURED_CLASS', name: 'Classes', icon: 'school' },
  { id: 'PROJECT_GROUP', name: 'Projects', icon: 'rocket' },
  { id: 'EXAM_PREP', name: 'Exam Prep', icon: 'book' },
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
    const isJoined = club.memberCount !== undefined;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={styles.clubCard}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ClubDetails' as never, { clubId: club.id } as never)}
        >
          <Card style={styles.cardInner}>
            {/* Cover */}
            {club.coverImage ? (
              <Image source={{ uri: club.coverImage }} style={styles.clubCover} />
            ) : (
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.clubCover}
              >
                <Ionicons name="school" size={32} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
            )}

            {/* Content */}
            <View style={styles.clubContent}>
              <View style={styles.clubHeader}>
                <Text style={styles.clubName} numberOfLines={1}>
                  {club.name}
                </Text>
                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(club.type) + '15' }]}>
                  <Text style={[styles.typeBadgeText, { color: getTypeColor(club.type) }]}>
                    {getTypeLabel(club.type)}
                  </Text>
                </View>
              </View>

              <Text style={styles.clubDescription} numberOfLines={2}>
                {club.description}
              </Text>

              <View style={styles.clubFooter}>
                <View style={styles.metaRow}>
                  <Ionicons name="people" size={14} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{club.memberCount || 0}</Text>
                  
                  {club.creator && (
                    <>
                      <View style={styles.dot} />
                      <Text style={styles.metaText}>
                        {club.creator.firstName} {club.creator.lastName.charAt(0)}.
                      </Text>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.joinButton, isJoined && styles.joinedButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleJoin(club.id, isJoined);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isJoined ? 'checkmark' : 'add'}
                    size={16}
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
          <Ionicons name="search" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Pills - Clean Design */}
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
                selectedType === type.id && styles.filterPillActive,
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <Ionicons
                name={type.icon as any}
                size={16}
                color={selectedType === type.id ? 'white' : Colors.textSecondary}
                style={styles.filterIcon}
              />
              <Text
                style={[
                  styles.filterPillText,
                  selectedType === type.id && styles.filterPillTextActive,
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
  filterSection: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: 'white',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
    height: 100,
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
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clubDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  clubFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    gap: 4,
  },
  joinedButton: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  joinButtonText: {
    fontSize: 13,
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
