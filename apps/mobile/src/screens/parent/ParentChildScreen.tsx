/**
 * Parent Child Screen
 *
 * Child overview with links to grades, attendance, report card
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Typography, Spacing } from '@/config';
import { useAuthStore } from '@/stores';
import { Config } from '@/config';
import { tokenService } from '@/services/token';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  khmerName?: string;
  studentId?: string;
}

export default function ParentChildScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { studentId: string } }, 'params'>>();
  const { user } = useAuthStore();
  const studentId = (route.params as any)?.studentId;

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const children = (user as any)?.children || [];
  const childFromList = children.find((c: Child) => c.id === studentId);

  useEffect(() => {
    if (!studentId) return;
    const token = tokenService.getAccessToken();
    if (!token) return;

    const fetchStudent = async () => {
      try {
        const res = await fetch(`${Config.studentUrl}/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStudent(data.data || data);
      } catch (e) {
        console.error('Failed to fetch student:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId]);

  if (loading || !childFromList) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const displayName = childFromList.khmerName || `${childFromList.firstName} ${childFromList.lastName}`;
  const classInfo = student?.class;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#ECFDF5', '#D1FAE5', '#F0FDF4']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Child Overview</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Child info card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {childFromList.firstName?.[0]}{childFromList.lastName?.[0]}
            </Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.subName}>
            {childFromList.firstName} {childFromList.lastName}
            {childFromList.studentId ? ` • ${childFromList.studentId}` : ''}
          </Text>
          {classInfo && (
            <View style={styles.classBadge}>
              <Ionicons name="school" size={14} color="#059669" />
              <Text style={styles.classText}>{classInfo.name}</Text>
            </View>
          )}
        </View>

        {/* Action tiles */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => navigation.navigate('ParentChildGrades', { studentId })}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="bar-chart" size={28} color="#2563EB" />
            </View>
            <Text style={styles.actionTitle}>Grades</Text>
            <Text style={styles.actionDesc}>View subject grades and averages</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => navigation.navigate('ParentChildAttendance', { studentId })}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="calendar" size={28} color="#D97706" />
            </View>
            <Text style={styles.actionTitle}>Attendance</Text>
            <Text style={styles.actionDesc}>View attendance records</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => navigation.navigate('ParentChildReportCard', { studentId })}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E9D5FF' }]}>
              <Ionicons name="document-text" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.actionTitle}>Report Card</Text>
            <Text style={styles.actionDesc}>View and download report card</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} style={styles.chevron} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.gray[600],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gray[900],
    textAlign: 'center',
  },
  subName: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 4,
    textAlign: 'center',
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
  },
  classText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  actions: { gap: 12 },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  actionDesc: {
    position: 'absolute',
    left: 84,
    top: 42,
    fontSize: 13,
    color: Colors.gray[500],
  },
  chevron: { marginLeft: 8 },
});
