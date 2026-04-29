import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LearnPath } from '@/api/learn';

interface PathCardProps {
  path: LearnPath;
  isBusy: boolean;
  onEnroll: (pathId: string) => void;
}

const formatDuration = (minutes: number) => {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins  = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatK = (value: number) => {
  if (!value) return '0';
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(1)}k`;
};

export const PathCard = React.memo(function PathCard({ path, isBusy, onEnroll }: PathCardProps) {
  return (
    <View style={styles.pathCard}>
      <Text style={styles.pathTitle}>{path.title}</Text>
      <Text style={styles.pathDescription} numberOfLines={2}>{path.description}</Text>
      <View style={styles.pathMetaRow}>
        <Text style={styles.pathMetaText}>{path.coursesCount} <AutoI18nText i18nKey="auto.mobile.components_learn_PathCard.k_afbc8959" /></Text>
        <Text style={styles.pathMetaDot}>•</Text>
        <Text style={styles.pathMetaText}>{formatDuration(path.totalDuration)}</Text>
        <Text style={styles.pathMetaDot}>•</Text>
        <Text style={styles.pathMetaText}>{formatK(path.enrolledCount)} <AutoI18nText i18nKey="auto.mobile.components_learn_PathCard.k_7bf027d2" /></Text>
      </View>
      <TouchableOpacity
        style={[styles.pathActionButton, (path.isEnrolled || isBusy) && styles.pathActionButtonDisabled]}
        activeOpacity={0.8}
        onPress={() => onEnroll(path.id)}
        disabled={path.isEnrolled || isBusy}
      >
        {isBusy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.pathActionText}>{path.isEnrolled ? 'Enrolled' : 'Start Path'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  pathCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pathTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  pathDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  pathMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  pathMetaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  pathMetaDot: {
    marginHorizontal: 6,
    color: '#CBD5E1',
  },
  pathActionButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathActionButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.8,
  },
  pathActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
