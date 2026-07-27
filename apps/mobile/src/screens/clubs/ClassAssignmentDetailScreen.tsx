import React from 'react';
import {
  Alert,
  Linking,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { Colors } from '@/config';
import { ClassAssignment } from '@/api/classHub';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';

export default function ClassAssignmentDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const {
    assignment,
    myRole,
    linkedStudentId,
  }: {
    assignment: ClassAssignment;
    myRole?: 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'STAFF' | 'SUPER_ADMIN' | 'SCHOOL_ADMIN';
    linkedStudentId?: string;
  } = route.params;
  const { user } = useAuthStore();

  const viewerRole = myRole || user?.role;
  const isTeacher = viewerRole === 'TEACHER';
  const isStudentViewer = viewerRole === 'STUDENT';
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const isOverdue = dueDate ? dueDate < new Date() : false;
  const effectiveStudentId = linkedStudentId || user?.student?.id;

  const mySubmission = !isTeacher 
    ? assignment.submissions?.find(s => s.studentId === effectiveStudentId)
    : null;

  const handleBack = () => navigation.goBack();

  const handleSubmit = () => {
    if (assignment.deepLinkUrl) {
      Linking.openURL(assignment.deepLinkUrl).catch(() => {
        Alert.alert(t('classScreens.assignmentDetail.alertTitle'), t('classScreens.assignmentDetail.openLinkedFailed'));
      });
      return;
    }

    Alert.alert(
      t('classScreens.assignmentDetail.alertTitle'),
      t('classScreens.assignmentDetail.readOnlyMessage')
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('classScreens.assignmentDetail.header')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.typeBadge}>
            <Ionicons name="document-text" size={16} color={colors.primary} />
            <Text style={styles.typeText}>{t('classScreens.assignmentDetail.classAssignment')}</Text>
          </View>
          
          <Text style={styles.title}>{assignment.title}</Text>
          
          {assignment.description ? (
            <Text style={styles.description}>{assignment.description}</Text>
          ) : (
            <Text style={styles.noDescription}>{t('classScreens.assignmentDetail.noDescription')}</Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <View>
                <Text style={styles.metaLabel}>{t('classScreens.assignmentDetail.dueDate')}</Text>
                <Text style={[styles.metaValue, isOverdue && !mySubmission && styles.overdueText]}>
                  {dueDate ? format(dueDate, 'MMM d, h:mm a') : t('classScreens.assignmentDetail.noDueDate')}
                </Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="trophy-outline" size={18} color={colors.textSecondary} />
              <View>
                <Text style={styles.metaLabel}>{t('classScreens.assignmentDetail.maxPoints')}</Text>
                <Text style={styles.metaValue}>{t('classScreens.assignmentDetail.maxPointsValue', { points: assignment.maxPoints || 100 })}</Text>
              </View>
            </View>
          </View>
        </View>

        {mySubmission && (
          <View style={[styles.card, styles.statusCard]}>
            <View style={styles.statusHeader}>
              <Ionicons 
                name={mySubmission.status === 'GRADED' ? 'checkmark-circle' : 'time-outline'} 
                size={24} 
                color={mySubmission.status === 'GRADED' ? '#10B981' : '#0EA5E9'} 
              />
              <Text style={[styles.statusTitle, { color: mySubmission.status === 'GRADED' ? '#10B981' : '#0EA5E9' }]}>
                {mySubmission.status === 'GRADED' ? t('classScreens.assignmentDetail.graded') : t('classScreens.assignments.submitted')}
              </Text>
            </View>
            
            {mySubmission.status === 'GRADED' && (
              <View style={styles.scoreRow}>
                <Text style={styles.scoreText}>
                  {t('classScreens.assignmentDetail.score')}: <Text style={styles.scoreValue}>{mySubmission.score}/{assignment.maxPoints || 100}</Text>
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {isStudentViewer && assignment.deepLinkUrl && !mySubmission && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, isOverdue && styles.submitBtnOverdue]} 
            onPress={handleSubmit}
          >
            <Text style={styles.submitBtnText}>
              {t('classScreens.assignmentDetail.openLinkedTask')}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: isDark ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(14,165,233,0.18)' : '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    marginBottom: 16,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  noDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  overdueText: {
    color: '#EF4444',
  },
  statusCard: {
    borderColor: colors.primary,
    backgroundColor: isDark ? 'rgba(14,165,233,0.12)' : '#F0F9FF',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scoreText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scoreValue: {
    fontWeight: '800',
    color: '#10B981',
  },
  footer: {
    padding: 20,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitBtn: {
    backgroundColor: '#0EA5E9',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnOverdue: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
