/**
 * TopicPickerModal — two-step curriculum topic picker for quiz authoring.
 * Step 1: subjects that have topics (grouped by grade). Step 2: the
 * subject's topic tree — units as section rows, skills as capsules.
 * Selecting a unit itself is allowed (questions can be tagged at unit level).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/contexts';
import { Haptics } from '@/services/haptics';
import { topicsService, TopicSubject, TopicNode } from '@/services/topics.service';

export interface SelectedTopic {
  topicId: string;
  topicLabel: string;
  subjectLabel: string;
}

interface TopicPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (topic: SelectedTopic) => void;
}

export function TopicPickerModal({ visible, onClose, onSelect }: TopicPickerModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isKh = i18n.language?.startsWith('km');

  const [subjects, setSubjects] = useState<TopicSubject[] | null>(null);
  const [subject, setSubject] = useState<TopicSubject | null>(null);
  const [topics, setTopics] = useState<TopicNode[] | null>(null);
  const [error, setError] = useState(false);

  const subjectName = useCallback(
    (s: TopicSubject) => (isKh ? s.nameKh || s.name : s.nameEn || s.name),
    [isKh],
  );
  const topicName = useCallback(
    (n: TopicNode) => (isKh ? n.nameKh || n.name : n.name),
    [isKh],
  );

  useEffect(() => {
    if (!visible) return;
    setSubject(null);
    setTopics(null);
    setError(false);
    setSubjects(null);
    topicsService
      .getSubjects()
      .then(setSubjects)
      .catch(() => setError(true));
  }, [visible]);

  const openSubject = (s: TopicSubject) => {
    Haptics.selectionAsync();
    setSubject(s);
    setTopics(null);
    topicsService
      .getTopics(s.id)
      .then(setTopics)
      .catch(() => setError(true));
  };

  const pick = (node: TopicNode, parent?: TopicNode) => {
    if (!subject) return;
    Haptics.selectionAsync();
    onSelect({
      topicId: node.id,
      topicLabel: parent ? `${topicName(parent)} · ${topicName(node)}` : topicName(node),
      subjectLabel: subjectName(subject),
    });
    onClose();
  };

  const loading = (!subjects && !error && !subject) || (subject && !topics && !error);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            {subject ? (
              <TouchableOpacity onPress={() => { setSubject(null); setTopics(null); }} style={styles.headerButton}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerButton} />
            )}
            <Text style={styles.title}>
              {subject
                ? subjectName(subject)
                : t('feed.createPost.quiz.topicPickSubject')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {error && (
              <Text style={styles.emptyText}>{t('feed.createPost.quiz.topicLoadFailed')}</Text>
            )}

            {loading && !error && (
              <ActivityIndicator style={styles.loader} color={colors.textSecondary} />
            )}

            {!subject && subjects && subjects.length === 0 && !error && (
              <Text style={styles.emptyText}>{t('feed.createPost.quiz.topicEmpty')}</Text>
            )}

            {!subject &&
              subjects?.map((s) => (
                <TouchableOpacity key={s.id} style={styles.subjectRow} onPress={() => openSubject(s)}>
                  <View style={styles.subjectRowLeft}>
                    <Text style={styles.subjectName}>{subjectName(s)}</Text>
                    <Text style={styles.subjectMeta}>
                      {t('common.grade', { defaultValue: 'Grade' })} {s.grade} · {s.topicCount}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}

            {subject &&
              topics?.map((unit) => (
                <View key={unit.id} style={styles.unitBlock}>
                  <TouchableOpacity style={styles.unitRow} onPress={() => pick(unit)}>
                    <Text style={styles.unitName}>{topicName(unit)}</Text>
                    <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {unit.children.length > 0 && (
                    <View style={styles.skillWrap}>
                      {unit.children.map((skill) => (
                        <TouchableOpacity
                          key={skill.id}
                          style={styles.skillCapsule}
                          onPress={() => pick(skill, unit)}
                        >
                          <Text style={styles.skillText}>{topicName(skill)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}

            {subject && topics && topics.length === 0 && !error && (
              <Text style={styles.emptyText}>{t('feed.createPost.quiz.topicEmpty')}</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      minHeight: '50%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    body: {
      flexGrow: 0,
    },
    bodyContent: {
      padding: 16,
      paddingBottom: 32,
    },
    loader: {
      marginVertical: 24,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 14,
      marginVertical: 24,
    },
    subjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    subjectRowLeft: {
      flex: 1,
    },
    subjectName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    subjectMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    unitBlock: {
      marginBottom: 16,
    },
    unitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    unitName: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    skillWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    skillCapsule: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceVariant,
    },
    skillText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
