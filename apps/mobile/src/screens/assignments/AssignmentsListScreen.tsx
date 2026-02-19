/**
 * Assignments List Screen
 * 
 * Display all assignments for a club with tabs: All, Active, Submitted, Graded
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, isPast, isFuture } from 'date-fns';

import { Colors } from '@/config';
import { assignmentsApi } from '@/api';
import type { ClubAssignment } from '@/api/assignments';
import type { ClubsStackScreenProps } from '@/navigation/types';

type Tab = 'all' | 'active' | 'submitted' | 'graded';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'graded', label: 'Graded' },
] as const;

export default function AssignmentsListScreen() {
  const navigation = useNavigation();
  const route = useRoute<ClubsStackScreenProps<'AssignmentsList'>['route']>();
  const { clubId } = route.params;

  const [selectedTab, setSelectedTab] = useState<Tab>('all');
  const [assignments, setAssignments] = useState<ClubAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setError(null);
      const data = await assignmentsApi.getClubAssignments(clubId, { 
        status: 'PUBLISHED' 
      });
      setAssignments(data);
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssignments();
  }, [fetchAssignments]);

  const filteredAssignments = assignments.filter(assignment => {
    if (selectedTab === 'all') return true;
    
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const hasSubmission = assignment.userSubmission != null;
    const isGraded = assignment.userSubmission?.status === 'GRADED';
    
    switch (selectedTab) {
      case 'active':
        return !hasSubmission && isFuture(dueDate);
      case 'submitted':
        return hasSubmission && !isGraded;
      case 'graded':
        return isGraded;
      default:
        return true;
    }
  });

  const renderAssignmentCard = ({ item, index }: { item: ClubAssignment; index: number }) => {
    const dueDate = new Date(item.dueDate);
    const isOverdue = isPast(dueDate) && !item.userSubmission;
    const isSubmitted = item.userSubmission != null;
    const isGraded = item.userSubmission?.status === 'GRADED';
    
    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'HOMEWORK': return 'document-text';
        case 'QUIZ': return 'help-circle';
        case 'EXAM': return 'school';
        case 'PROJECT': return 'rocket';
        default: return 'document';
      }
    };

    const getTypeColor = (type: string) => {
      switch (type) {
        case 'HOMEWORK': return '#3B82F6';
        case 'QUIZ': return '#8B5CF6';
        case 'EXAM': return '#EF4444';
        case 'PROJECT': return '#10B981';
        default: return Colors.primary;
      }
    };

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).duration(400)}
        style={styles.assignmentCard}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('AssignmentDetail', { 
            assignmentId: item.id,
            clubId 
          })}
        >
          <View style={styles.cardHeader}>
            <View style={[
              styles.typeIcon,
              { backgroundColor: `${getTypeColor(item.type)}15` }
            ]}>
              <Ionicons 
                name={getTypeIcon(item.type) as any} 
                size={20} 
                color={getTypeColor(item.type)} 
              />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.subject && (
                <Text style={styles.subjectLabel}>
                  {item.subject.name}
                </Text>
              )}
            </View>
            {isGraded && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>
                  {item.userSubmission?.score}/{item.maxPoints}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            {item.description && (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={Colors.gray[500]} />
                <Text style={[
                  styles.metaText,
                  isOverdue && styles.overdueText
                ]}>
                  Due {format(dueDate, 'MMM d, h:mm a')}
                </Text>
              </View>
              
              <View style={styles.metaItem}>
                <Ionicons name="trophy-outline" size={14} color={Colors.gray[500]} />
                <Text style={styles.metaText}>
                  {item.maxPoints} pts
                </Text>
              </View>
            </View>

            {(isSubmitted || isOverdue) && (
              <View style={styles.statusBar}>
                {isGraded && (
                  <View style={[styles.statusBadge, styles.gradedBadge]}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.gradedText}>Graded</Text>
                  </View>
                )}
                {isSubmitted && !isGraded && (
                  <View style={[styles.statusBadge, styles.submittedBadge]}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
                    <Text style={styles.submittedText}>Submitted</Text>
                  </View>
                )}
                {isOverdue && !isSubmitted && (
                  <View style={[styles.statusBadge, styles.overdueBadge]}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.overdueText}>Overdue</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assignments</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignments</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.activeTab,
            ]}
            onPress={() => setSelectedTab(tab.id as Tab)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Assignments List */}
      <FlatList
        data={filteredAssignments}
        renderItem={renderAssignmentCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color={Colors.gray[300]} />
            <Text style={styles.emptyTitle}>No assignments</Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'all'
                ? 'No assignments have been created yet'
                : `No ${selectedTab} assignments`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#E0F2FE',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  subjectLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  scoreContainer: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  cardBody: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  statusBar: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradedBadge: {},
  submittedBadge: {},
  overdueBadge: {},
  gradedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#10B981',
  },
  submittedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
});
