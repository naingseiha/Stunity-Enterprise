/**
 * Club Details Screen
 * 
 * Full club information, members, and activity
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Avatar, Card } from '@/components/common';
import { Colors } from '@/config';
import { clubsApi, Club, ClubMember } from '@/api';

export default function ClubDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { clubId } = route.params as { clubId: string };

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [userRole, setUserRole] = useState<ClubMember['role'] | null>(null);

  // Fetch club details
  const fetchClubDetails = useCallback(async () => {
    try {
      setError(null);
      const [clubData, membersData] = await Promise.all([
        clubsApi.getClubById(clubId),
        clubsApi.getClubMembers(clubId),
      ]);
      
      setClub(clubData);
      setMembers(membersData);
      
      // Check if current user is a member
      // Note: In real app, compare with current user ID from auth store
      const userMembership = membersData.find(m => m.isActive);
      setIsJoined(!!userMembership);
      setUserRole(userMembership?.role || null);
    } catch (err: any) {
      console.error('Failed to fetch club details:', err);
      setError(err.message || 'Failed to load club details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClubDetails();
  }, [fetchClubDetails]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClubDetails();
  }, [fetchClubDetails]);

  // Join/Leave club
  const handleToggleMembership = useCallback(async () => {
    if (!club) return;

    try {
      if (isJoined) {
        Alert.alert(
          'Leave Club',
          `Are you sure you want to leave ${club.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: async () => {
                await clubsApi.leaveClub(clubId);
                setIsJoined(false);
                fetchClubDetails();
              },
            },
          ]
        );
      } else {
        await clubsApi.joinClub(clubId);
        setIsJoined(true);
        fetchClubDetails();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update membership');
    }
  }, [club, clubId, isJoined, fetchClubDetails]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !club) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Club not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchClubDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeMembers = members.filter(m => m.isActive);
  const instructors = activeMembers.filter(m => 
    m.role === 'OWNER' || m.role === 'INSTRUCTOR' || m.role === 'TEACHING_ASSISTANT'
  );
  const students = activeMembers.filter(m => m.role === 'STUDENT');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header with Cover */}
        <View style={styles.header}>
          {club.coverImage ? (
            <Image source={{ uri: club.coverImage }} style={styles.coverImage} />
          ) : (
            <LinearGradient
              colors={[getTypeColor(club.type), getTypeColorDark(club.type)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImage}
            >
              <Ionicons name={getTypeIcon(club.type)} size={64} color="white" />
            </LinearGradient>
          )}

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {/* More Options */}
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Club Info */}
        <Animated.View entering={FadeIn} style={styles.infoSection}>
          <Card style={styles.infoCard}>
            <View style={styles.titleRow}>
              <Text style={styles.clubName}>{club.name}</Text>
              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(club.type) }]}>
                <Text style={styles.typeBadgeText}>{getTypeLabel(club.type)}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="people" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{activeMembers.length} members</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons 
                  name={club.mode === 'PUBLIC' ? 'globe' : 'lock-closed'} 
                  size={16} 
                  color={Colors.textSecondary} 
                />
                <Text style={styles.metaText}>{formatMode(club.mode)}</Text>
              </View>
            </View>

            <Text style={styles.description}>{club.description}</Text>

            {/* Tags */}
            {club.tags && club.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {club.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.primaryButton, isJoined && styles.joinedButton]}
                onPress={handleToggleMembership}
              >
                <Ionicons
                  name={isJoined ? 'checkmark-circle' : 'add-circle'}
                  size={20}
                  color={isJoined ? Colors.primary : 'white'}
                />
                <Text style={[styles.primaryButtonText, isJoined && styles.joinedButtonText]}>
                  {isJoined ? 'Joined' : 'Join Club'}
                </Text>
              </TouchableOpacity>

              {isJoined && (
                <TouchableOpacity style={styles.secondaryButton}>
                  <Ionicons name="notifications" size={20} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Assignments Button */}
            {isJoined && (
              <TouchableOpacity
                style={styles.assignmentsButton}
                onPress={() => navigation.navigate('AssignmentsList', { clubId })}
              >
                <Ionicons name="document-text" size={20} color={Colors.primary} />
                <Text style={styles.assignmentsButtonText}>View Assignments</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
              </TouchableOpacity>
            )}

            {/* User Role Badge */}
            {userRole && (
              <View style={styles.roleContainer}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
                <Text style={styles.roleText}>Your role: {formatRole(userRole)}</Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.statsSection}>
          <Card style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{instructors.length}</Text>
                <Text style={styles.statLabel}>Instructors</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{students.length}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {new Date(club.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Text>
                <Text style={styles.statLabel}>Created</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Creator */}
        {club.creator && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.creatorSection}>
            <Card style={styles.creatorCard}>
              <Text style={styles.sectionTitle}>Created by</Text>
              <View style={styles.creatorInfo}>
                <Avatar
                  size="md"
                  name={`${club.creator.firstName} ${club.creator.lastName}`}
                  imageUrl={club.creator.profilePictureUrl}
                />
                <View style={styles.creatorDetails}>
                  <Text style={styles.creatorName}>
                    {club.creator.firstName} {club.creator.lastName}
                  </Text>
                  <Text style={styles.creatorRole}>Club Owner</Text>
                </View>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Members Preview */}
        {isJoined && activeMembers.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.membersSection}>
            <Card style={styles.membersCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Members ({activeMembers.length})</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>

              {activeMembers.slice(0, 5).map((member, index) => (
                <View key={member.id} style={styles.memberItem}>
                  <Avatar
                    size="sm"
                    name={`${member.user.firstName} ${member.user.lastName}`}
                    imageUrl={member.user.profilePictureUrl}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.user.firstName} {member.user.lastName}
                    </Text>
                    <Text style={styles.memberRole}>{formatRole(member.role)}</Text>
                  </View>
                  {member.role === 'OWNER' && (
                    <View style={styles.ownerBadge}>
                      <Ionicons name="star" size={14} color="#FFA500" />
                    </View>
                  )}
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* Coming Soon Features (if user is a member) */}
        {isJoined && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.featuresSection}>
            <Card style={styles.featuresCard}>
              <Text style={styles.sectionTitle}>Club Features</Text>
              <Text style={styles.comingSoonText}>
                📚 Assignments, 📊 Grades, 📅 Schedule, and more coming soon!
              </Text>
            </Card>
          </Animated.View>
        )}
      </ScrollView>
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

const formatMode = (mode: string) => {
  switch (mode) {
    case 'PUBLIC': return 'Public';
    case 'INVITE_ONLY': return 'Invite Only';
    case 'APPROVAL_REQUIRED': return 'Approval Required';
    default: return mode;
  }
};

const formatRole = (role: string) => {
  switch (role) {
    case 'OWNER': return 'Owner';
    case 'INSTRUCTOR': return 'Instructor';
    case 'TEACHING_ASSISTANT': return 'Teaching Assistant';
    case 'STUDENT': return 'Student';
    case 'OBSERVER': return 'Observer';
    default: return role;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8F7FC',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F59E0B',
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  header: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    marginTop: -32,
    paddingHorizontal: 16,
  },
  infoCard: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clubName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    gap: 8,
  },
  joinedButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  joinedButtonText: {
    color: '#F59E0B',
  },
  secondaryButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  assignmentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  assignmentsButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  roleText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  statsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statsCard: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  creatorSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  creatorCard: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  creatorRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  membersSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  membersCard: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 13,
    color: '#6B7280',
  },
  ownerBadge: {
    marginLeft: 8,
  },
  featuresSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  featuresCard: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});
