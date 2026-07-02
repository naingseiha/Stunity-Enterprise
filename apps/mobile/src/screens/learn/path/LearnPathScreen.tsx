/**
 * LearnPathScreen — Duolingo-style curriculum path.
 *
 * First visit: inline onboarding (pick grade → pick subjects with available
 * topic taxonomies). After onboarding: subject switcher + the unit path with
 * derived progress (locked / unlocked / completed / coming-soon), each
 * unlocked unit launching a PracticeSession.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { topicsService, TopicSubject } from '@/services/topics.service';
import {
  learnPathService,
  LearnerProfile,
  LearnPath,
  LearnUnit,
} from '@/services/learnPath.service';
import { LearnStackScreenProps } from '@/navigation/types';

type NavigationProp = LearnStackScreenProps<'LearnPath'>['navigation'];

const GRADES = ['7', '8', '9', '10', '11', '12'];

export function LearnPathScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NavigationProp>();
  const isKh = i18n.language?.startsWith('km');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [path, setPath] = useState<LearnPath | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  // Onboarding state
  const [obGrade, setObGrade] = useState<string | null>(null);
  const [obSubjects, setObSubjects] = useState<TopicSubject[] | null>(null);
  const [obSelected, setObSelected] = useState<Set<string>>(new Set());
  const [obSaving, setObSaving] = useState(false);

  const subjectName = useCallback(
    (s: { name: string; nameEn: string | null; nameKh: string | null }) =>
      isKh ? s.nameKh || s.name : s.nameEn || s.name,
    [isKh],
  );
  const unitName = useCallback(
    (u: LearnUnit) => (isKh ? u.nameKh || u.name : u.name),
    [isKh],
  );

  const loadPath = useCallback(async (subjectId: string) => {
    const data = await learnPathService.getPath(subjectId);
    setPath(data);
  }, []);

  const load = useCallback(async () => {
    try {
      const p = await learnPathService.getProfile();
      setProfile(p);
      if (p && p.subjects.length > 0) {
        const subjectId = activeSubjectId ?? p.subjects[0].id;
        setActiveSubjectId(subjectId);
        await loadPath(subjectId);
      }
    } catch (err) {
      console.warn('[LearnPath] load failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubjectId, loadPath]);

  // Refresh on focus so progress reflects a just-finished practice session.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Onboarding: load pickable subjects when a grade is chosen.
  useEffect(() => {
    if (!obGrade) return;
    setObSubjects(null);
    setObSelected(new Set());
    topicsService
      .getSubjects(obGrade)
      .then(setObSubjects)
      .catch(() => setObSubjects([]));
  }, [obGrade]);

  const completeOnboarding = async () => {
    if (!obGrade || obSelected.size === 0) return;
    setObSaving(true);
    try {
      await learnPathService.saveProfile(obGrade, [...obSelected]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(true);
      setActiveSubjectId(null);
      await load();
    } catch (err) {
      console.warn('[LearnPath] onboarding save failed', err);
    } finally {
      setObSaving(false);
    }
  };

  const switchSubject = async (subjectId: string) => {
    Haptics.selectionAsync();
    setActiveSubjectId(subjectId);
    setPath(null);
    await loadPath(subjectId);
  };

  const openUnit = (unit: LearnUnit) => {
    if (unit.state === 'locked' || unit.state === 'no_content') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('PracticeSession', {
      topicId: unit.topicId,
      title: unitName(unit),
    });
  };

  // ── Renderers ─────────────────────────────────────────────

  const renderOnboarding = () => (
    <ScrollView contentContainerStyle={styles.obContainer}>
      <View style={styles.obHero}>
        <Ionicons name="school" size={40} color="#0EA5E9" />
        <Text style={styles.obTitle}>{t('learn.path.onboardTitle')}</Text>
        <Text style={styles.obSubtitle}>{t('learn.path.onboardSubtitle')}</Text>
      </View>

      <Text style={styles.obSectionLabel}>{t('learn.path.pickGrade')}</Text>
      <View style={styles.gradeGrid}>
        {GRADES.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.gradeCell, obGrade === g && styles.gradeCellSelected]}
            onPress={() => {
              Haptics.selectionAsync();
              setObGrade(g);
            }}
          >
            <Text style={[styles.gradeCellText, obGrade === g && styles.gradeCellTextSelected]}>
              {t('learn.path.gradeShort', { grade: g })}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {obGrade && (
        <>
          <Text style={styles.obSectionLabel}>{t('learn.path.pickSubjects')}</Text>
          {!obSubjects && <ActivityIndicator style={{ marginVertical: 16 }} color={colors.textSecondary} />}
          {obSubjects && obSubjects.length === 0 && (
            <Text style={styles.obEmpty}>{t('learn.path.noSubjectsForGrade')}</Text>
          )}
          <View style={styles.subjectWrap}>
            {obSubjects?.map((s) => {
              const selected = obSelected.has(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.subjectChip, selected && styles.subjectChipSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    const next = new Set(obSelected);
                    if (selected) next.delete(s.id);
                    else next.add(s.id);
                    setObSelected(next);
                  }}
                >
                  {selected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  <Text style={[styles.subjectChipText, selected && styles.subjectChipTextSelected]}>
                    {subjectName(s)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.startButton, (!obGrade || obSelected.size === 0 || obSaving) && styles.startButtonDisabled]}
        disabled={!obGrade || obSelected.size === 0 || obSaving}
        onPress={completeOnboarding}
      >
        <Text style={styles.startButtonText}>
          {obSaving ? t('learn.path.saving') : t('learn.path.startLearning')}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderUnit = (unit: LearnUnit, index: number, isLast: boolean) => {
    const locked = unit.state === 'locked';
    const comingSoon = unit.state === 'no_content';
    const completed = unit.state === 'completed';
    const pct = unit.target > 0 ? Math.min(1, unit.correct / unit.target) : 0;

    return (
      <View key={unit.topicId} style={styles.unitRow}>
        <View style={styles.unitRail}>
          <View
            style={[
              styles.unitNode,
              completed && styles.unitNodeCompleted,
              unit.state === 'unlocked' && styles.unitNodeActive,
              (locked || comingSoon) && styles.unitNodeLocked,
            ]}
          >
            {completed ? (
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
            ) : locked ? (
              <Ionicons name="lock-closed" size={18} color={colors.textTertiary} />
            ) : comingSoon ? (
              <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
            ) : (
              <Text style={styles.unitNodeNumber}>{index + 1}</Text>
            )}
          </View>
          {!isLast && <View style={[styles.unitConnector, completed && styles.unitConnectorDone]} />}
        </View>

        <TouchableOpacity
          style={[styles.unitCard, (locked || comingSoon) && styles.unitCardDim]}
          disabled={locked || comingSoon}
          onPress={() => openUnit(unit)}
          activeOpacity={0.75}
        >
          <Text style={[styles.unitTitle, (locked || comingSoon) && styles.unitTitleDim]} numberOfLines={2}>
            {unitName(unit)}
          </Text>
          {comingSoon ? (
            <Text style={styles.unitMeta}>{t('learn.path.comingSoon')}</Text>
          ) : (
            <>
              <Text style={styles.unitMeta}>
                {t('learn.path.unitProgress', { correct: unit.correct, target: unit.target })}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderPath = () => (
    <ScrollView
      contentContainerStyle={styles.pathContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.textSecondary}
        />
      }
    >
      {profile && profile.subjects.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectSwitcher}>
          {profile.subjects.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.switcherChip, activeSubjectId === s.id && styles.switcherChipActive]}
              onPress={() => switchSubject(s.id)}
            >
              <Text
                style={[styles.switcherChipText, activeSubjectId === s.id && styles.switcherChipTextActive]}
              >
                {subjectName(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {!path && <ActivityIndicator style={{ marginTop: 40 }} color={colors.textSecondary} />}

      {path && (
        <>
          <View style={styles.pathHeader}>
            <Text style={styles.pathSubject}>{subjectName(path.subject)}</Text>
            <Text style={styles.pathGrade}>{t('learn.path.gradeShort', { grade: path.subject.grade })}</Text>
          </View>
          <View style={styles.unitList}>
            {path.units.map((u, i) => renderUnit(u, i, i === path.units.length - 1))}
          </View>
        </>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('learn.path.title')}</Text>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.textSecondary} />
      ) : !profile || profile.subjects.length === 0 ? (
        renderOnboarding()
      ) : (
        renderPath()
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 10,
    },
    headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },

    // Onboarding
    obContainer: { padding: 20, paddingBottom: 48 },
    obHero: { alignItems: 'center', marginBottom: 28, gap: 8 },
    obTitle: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
    obSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    obSectionLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 8 },
    gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    gradeCell: {
      width: '30%',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
    },
    gradeCellSelected: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
    gradeCellText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
    gradeCellTextSelected: { color: '#FFFFFF' },
    subjectWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    subjectChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    subjectChipSelected: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
    subjectChipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    subjectChipTextSelected: { color: '#FFFFFF' },
    obEmpty: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 28,
      paddingVertical: 15,
      borderRadius: 16,
      backgroundColor: '#0EA5E9',
    },
    startButtonDisabled: { opacity: 0.4 },
    startButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    // Path
    pathContainer: { paddingHorizontal: 20, paddingBottom: 48 },
    subjectSwitcher: { marginBottom: 8 },
    switcherChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginRight: 8,
    },
    switcherChipActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
    switcherChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    switcherChipTextActive: { color: '#FFFFFF' },
    pathHeader: { marginVertical: 16 },
    pathSubject: { fontSize: 22, fontWeight: '800', color: colors.text },
    pathGrade: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    unitList: { paddingBottom: 24 },
    unitRow: { flexDirection: 'row', alignItems: 'stretch' },
    unitRail: { width: 56, alignItems: 'center' },
    unitNode: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unitNodeActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
    unitNodeCompleted: { backgroundColor: '#10B981', borderColor: '#10B981' },
    unitNodeLocked: {},
    unitNodeNumber: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    unitConnector: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4 },
    unitConnectorDone: { backgroundColor: '#10B981' },
    unitCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 16,
    },
    unitCardDim: { opacity: 0.55 },
    unitTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    unitTitleDim: { color: colors.textSecondary },
    unitMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? colors.surfaceVariant : colors.border,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressFill: { height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  });
