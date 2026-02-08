/**
 * Clubs Screen
 * 
 * Clean, professional design matching Feed/Learn screens
 * Discover and join study clubs, student organizations
 */

import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

const StunityLogo = require('../../../../../Stunity.png');

import { Avatar, Card } from '@/components/common';
import { Colors } from '@/config';
import { useNavigationContext } from '@/contexts';

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  imageUrl?: string;
  isJoined: boolean;
}

const MOCK_CLUBS: Club[] = [
  {
    id: '1',
    name: 'Computer Science Club',
    description: 'Learn programming, algorithms, and build projects together',
    category: 'Technology',
    memberCount: 124,
    isJoined: true,
  },
  {
    id: '2',
    name: 'Mathematics Society',
    description: 'Explore advanced math topics and compete in competitions',
    category: 'Academics',
    memberCount: 89,
    isJoined: false,
  },
  {
    id: '3',
    name: 'English Debate Club',
    description: 'Improve public speaking and critical thinking skills',
    category: 'Language',
    memberCount: 67,
    isJoined: true,
  },
  {
    id: '4',
    name: 'Science Innovation Lab',
    description: 'Conduct experiments and work on science fair projects',
    category: 'Science',
    memberCount: 52,
    isJoined: false,
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'apps', color: '#FFA500' },
  { id: 'academics', name: 'Academics', icon: 'school', color: '#6366F1' },
  { id: 'technology', name: 'Technology', icon: 'code-slash', color: '#10B981' },
  { id: 'language', name: 'Language', icon: 'language', color: '#EC4899' },
  { id: 'science', name: 'Science', icon: 'flask', color: '#8B5CF6' },
  { id: 'arts', name: 'Arts', icon: 'color-palette', color: '#F59E0B' },
];

export default function ClubsScreen() {
  const { openSidebar } = useNavigationContext();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [clubs, setClubs] = useState<Club[]>(MOCK_CLUBS);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleJoinClub = useCallback((clubId: string) => {
    setClubs(clubs.map(club => 
      club.id === clubId ? { ...club, isJoined: !club.isJoined } : club
    ));
  }, [clubs]);

  const filteredClubs = clubs.filter(club =>
    selectedCategory === 'all' || club.category.toLowerCase() === selectedCategory
  );

  const renderClubCard = ({ item, index }: { item: Club; index: number }) => (
    <Animated.View entering={FadeInDown.delay(30 * Math.min(index, 5)).duration(300)}>
      <TouchableOpacity style={styles.clubCard} activeOpacity={0.8}>
        <View style={styles.clubImageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.clubImage} />
          ) : (
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.clubImagePlaceholder}
            >
              <Ionicons name="people" size={32} color="#6B7280" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.clubContent}>
          <Text style={styles.clubName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.clubDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.clubFooter}>
            <View style={styles.clubStats}>
              <Ionicons name="people-outline" size={16} color="#6B7280" />
              <Text style={styles.clubMemberCount}>
                {item.memberCount} members
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleJoinClub(item.id)}
              style={[
                styles.joinButton,
                item.isJoined && styles.joinedButton,
              ]}
              activeOpacity={0.7}
            >
              {item.isJoined ? (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.joinedButtonText}>Joined</Text>
                </>
              ) : (
                <>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.joinButtonText}>Join</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header - matching Feed/Learn style */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          {/* Menu Button - Left */}
          <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#374151" />
          </TouchableOpacity>

          {/* Stunity Logo - Center */}
          <Image
            source={StunityLogo}
            style={styles.headerLogo}
            resizeMode="contain"
          />

          {/* Actions - Right */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="add-circle-outline" size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="search-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerDivider} />
      </SafeAreaView>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat, index) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Animated.View
                key={cat.id}
                entering={FadeInRight.delay(50 * index).duration(300)}
              >
                <TouchableOpacity
                  style={styles.categoryChip}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={['#FFA500', '#FF8C00']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.categoryChipGradient}
                    >
                      <Ionicons name={cat.icon as any} size={18} color="#fff" />
                      <Text style={styles.categoryChipTextActive}>{cat.name}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.categoryChipInner}>
                      <Ionicons name={cat.icon as any} size={18} color="#6B7280" />
                      <Text style={styles.categoryChipText}>{cat.name}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>

      {/* Clubs List */}
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
            tintColor="#FFA500"
            colors={['#FFA500']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  headerSafe: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  headerLogo: {
    height: 32,
    width: 120,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesSection: {
    backgroundColor: '#fff',
    paddingBottom: 2,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  categoryChip: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 5,
    borderRadius: 50,
  },
  categoryChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 5,
    backgroundColor: '#F9FAFB',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  clubCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    // Match Feed card shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  clubImageContainer: {
    height: 140,
  },
  clubImage: {
    width: '100%',
    height: '100%',
  },
  clubImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubContent: {
    padding: 16,
  },
  clubName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  clubDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  clubFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clubStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clubMemberCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  joinedButton: {
    backgroundColor: '#D1FAE5',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  joinedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});
