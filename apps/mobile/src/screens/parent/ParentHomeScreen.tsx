/**
 * Parent Home Screen
 *
 * Parent dashboard showing children list, school name, logout, quick actions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Spacing } from '@/config';
import { useAuthStore } from '@/stores';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  khmerName?: string;
  studentId?: string;
}

export default function ParentHomeScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();

  const children: Child[] = (user as any)?.children || [];
  const school = (user as any)?.school;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleChildPress = (studentId: string) => {
    navigation.navigate('ParentChild', { studentId });
  };

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
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Parent Portal</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color={Colors.gray[700]} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* School card */}
        {school && (
          <View style={styles.schoolCard}>
            <View style={styles.schoolIcon}>
              <Ionicons name="school" size={24} color="#059669" />
            </View>
            <Text style={styles.schoolName}>{school.name}</Text>
          </View>
        )}

        {/* Children list */}
        <Text style={styles.sectionTitle}>My Children</Text>
        {children.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyTitle}>No children linked</Text>
            <Text style={styles.emptyDesc}>Contact your school to link your child's account.</Text>
          </View>
        ) : (
          <View style={styles.childrenList}>
            {children.map((child) => {
              const displayName = child.khmerName || `${child.firstName} ${child.lastName}`;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={styles.childCard}
                  onPress={() => handleChildPress(child.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {child.firstName?.[0]}{child.lastName?.[0]}
                    </Text>
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{displayName}</Text>
                    <Text style={styles.childSub}>
                      {child.firstName} {child.lastName}
                      {child.studentId ? ` • ${child.studentId}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() =>
              children[0] && navigation.navigate('ParentChildGrades', { studentId: children[0].id })
            }
            disabled={children.length === 0}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="bar-chart" size={28} color="#2563EB" />
            </View>
            <Text style={styles.quickTitle}>Grades</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() =>
              children[0] && navigation.navigate('ParentChildAttendance', { studentId: children[0].id })
            }
            disabled={children.length === 0}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="calendar" size={28} color="#D97706" />
            </View>
            <Text style={styles.quickTitle}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() =>
              children[0] && navigation.navigate('ParentChildReportCard', { studentId: children[0].id })
            }
            disabled={children.length === 0}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#E9D5FF' }]}>
              <Ionicons name="document-text" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.quickTitle}>Report Card</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerLeft: { width: 40 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  logoutBtn: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  schoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  schoolIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  schoolName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: Spacing.md,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.xl * 2,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.gray[900], marginTop: Spacing.md },
  emptyDesc: { fontSize: 14, color: Colors.gray[600], marginTop: 4, textAlign: 'center' },
  childrenList: { gap: 12, marginBottom: Spacing.xl },
  childCard: {
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  childInfo: { flex: 1 },
  childName: { fontSize: 17, fontWeight: '600', color: Colors.gray[900] },
  childSub: { fontSize: 13, color: Colors.gray[600], marginTop: 2 },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickTitle: { fontSize: 13, fontWeight: '600', color: Colors.gray[900] },
});
