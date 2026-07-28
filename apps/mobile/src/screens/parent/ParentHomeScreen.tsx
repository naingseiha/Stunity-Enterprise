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
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/config';
import { useThemeContext } from '@/contexts';
import { useAuthStore } from '@/stores';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  khmerName?: string;
  studentId?: string;
}

export default function ParentHomeScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();

  const children: Child[] = (user as any)?.children || [];
  const school = (user as any)?.school;

  const handleLogout = () => {
    Alert.alert(t('parent.logoutConfirmTitle'), t('parent.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('parent.signOut'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleChildPress = (studentId: string) => {
    navigation.navigate('ParentChild', { studentId });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={isDark ? [colors.background, colors.background] : ['#ECFDF5', '#D1FAE5', '#F0FDF4']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>{t('parent.portalTitle')}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.text} />
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
        <Text style={styles.sectionTitle}>{t('parent.myChildren')}</Text>
        {children.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{t('parent.noChildrenLinked')}</Text>
            <Text style={styles.emptyDesc}>{t('parent.linkChildHelp')}</Text>
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
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>{t('parent.quickActions')}</Text>
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
            <Text style={styles.quickTitle}>{t('parent.actions.gradesTitle')}</Text>
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
            <Text style={styles.quickTitle}>{t('parent.actions.attendanceTitle')}</Text>
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
            <Text style={styles.quickTitle}>{t('parent.actions.reportCardTitle')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
    color: colors.text,
  },
  logoutBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9999 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  schoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: isDark ? 'transparent' : '#000000',
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
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: Spacing.xl * 2,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: isDark ? 'transparent' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.text, marginTop: Spacing.md },
  emptyDesc: { fontSize: 12, lineHeight: 18, fontWeight: '500', color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  childrenList: { gap: 12, marginBottom: Spacing.xl },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    shadowColor: isDark ? 'transparent' : '#000000',
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
  avatarText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  childInfo: { flex: 1 },
  childName: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.text },
  childSub: { fontSize: 12, lineHeight: 18, fontWeight: '500', color: colors.textSecondary, marginTop: 2 },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: isDark ? 'transparent' : '#000000',
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
  quickTitle: { fontSize: 12, lineHeight: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
});
