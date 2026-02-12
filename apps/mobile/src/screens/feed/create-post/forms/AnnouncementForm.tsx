/**
 * Announcement Form Component
 * Beautiful, clean UI for announcement creation with importance levels
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AnnouncementFormProps {
  onDataChange: (data: AnnouncementData) => void;
}

export interface AnnouncementData {
  importance: 'INFO' | 'IMPORTANT' | 'URGENT' | 'CRITICAL';
  pinToTop: boolean;
  expiresIn: number | null; // hours, null = no expiration
}

const IMPORTANCE_LEVELS = [
  {
    type: 'INFO' as const,
    label: 'Info',
    icon: 'information-circle',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    description: 'General information',
  },
  {
    type: 'IMPORTANT' as const,
    label: 'Important',
    icon: 'alert-circle',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    borderColor: '#FCD34D',
    description: 'Needs attention',
  },
  {
    type: 'URGENT' as const,
    label: 'Urgent',
    icon: 'warning',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    description: 'Action required',
  },
  {
    type: 'CRITICAL' as const,
    label: 'Critical',
    icon: 'alert',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#EF4444',
    description: 'Immediate attention',
  },
];

const EXPIRATION_OPTIONS = [
  { label: 'No expiration', value: null },
  { label: '24 hours', value: 24 },
  { label: '3 days', value: 72 },
  { label: '1 week', value: 168 },
  { label: '2 weeks', value: 336 },
  { label: '1 month', value: 720 },
];

export function AnnouncementForm({ onDataChange }: AnnouncementFormProps) {
  const [importance, setImportance] = useState<AnnouncementData['importance']>('INFO');
  const [pinToTop, setPinToTop] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  useEffect(() => {
    onDataChange({ importance, pinToTop, expiresIn });
  }, [importance, pinToTop, expiresIn]);

  const selectedLevel = IMPORTANCE_LEVELS.find(level => level.type === importance)!;

  return (
    <View style={styles.container}>
      {/* Importance Level Card */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: selectedLevel.bgColor }]}>
            <Ionicons name={selectedLevel.icon as any} size={18} color={selectedLevel.color} />
          </View>
          <Text style={styles.cardTitle}>Importance Level</Text>
        </View>

        <Text style={styles.description}>
          Choose how critical this announcement is to help others prioritize.
        </Text>

        <View style={styles.importanceLevels}>
          {IMPORTANCE_LEVELS.map((level) => (
            <Animated.View
              key={level.type}
              layout={Layout.springify()}
              style={{ flex: 1, minWidth: '48%' }}
            >
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setImportance(level.type);
                }}
                style={[
                  styles.importanceCard,
                  {
                    backgroundColor: importance === level.type ? level.bgColor : '#F9FAFB',
                    borderColor: importance === level.type ? level.borderColor : '#E5E7EB',
                  },
                  importance === level.type && styles.importanceCardSelected,
                ]}
              >
                <View style={[styles.importanceIconBadge, { backgroundColor: level.bgColor }]}>
                  <Ionicons
                    name={level.icon as any}
                    size={24}
                    color={level.color}
                  />
                </View>
                <Text style={[
                  styles.importanceLabel,
                  importance === level.type && { color: level.color, fontWeight: '700' },
                ]}>
                  {level.label}
                </Text>
                <Text style={styles.importanceDescription}>{level.description}</Text>
                {importance === level.type && (
                  <View style={[styles.selectedCheckmark, { backgroundColor: level.color }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Pin to Top Card */}
      <Animated.View entering={FadeIn.duration(300).delay(100)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="push" size={18} color="#8B5CF6" />
          </View>
          <Text style={styles.cardTitle}>Pin Options</Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setPinToTop(!pinToTop);
          }}
          style={styles.toggleOption}
        >
          <View style={styles.toggleLeft}>
            <View style={[styles.toggleIconBadge, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="pin" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Pin to Top</Text>
              <Text style={styles.toggleDescription}>
                Keep this announcement at the top of the feed
              </Text>
            </View>
          </View>
          <View style={[
            styles.toggle,
            pinToTop && styles.toggleActive,
          ]}>
            <View style={[
              styles.toggleThumb,
              pinToTop && styles.toggleThumbActive,
            ]} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Expiration Card */}
      <Animated.View entering={FadeIn.duration(300).delay(200)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="time" size={18} color="#10B981" />
          </View>
          <Text style={styles.cardTitle}>Auto-Expiration</Text>
        </View>

        <Text style={styles.description}>
          Automatically hide this announcement after a certain time.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {EXPIRATION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.label}
              onPress={() => {
                Haptics.selectionAsync();
                setExpiresIn(option.value);
              }}
              style={[
                styles.chip,
                expiresIn === option.value && styles.chipSelected,
              ]}
            >
              <Text style={[
                styles.chipText,
                expiresIn === option.value && styles.chipTextSelected,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Preview Card */}
      <Animated.View entering={FadeIn.duration(300).delay(300)} style={[
        styles.previewCard,
        {
          backgroundColor: selectedLevel.bgColor,
          borderColor: selectedLevel.borderColor,
        }
      ]}>
        <View style={styles.previewHeader}>
          <View style={[styles.previewIconBadge, { backgroundColor: selectedLevel.color }]}>
            <Ionicons name={selectedLevel.icon as any} size={20} color="#fff" />
          </View>
          <View style={styles.previewContent}>
            <Text style={[styles.previewLabel, { color: selectedLevel.color }]}>
              {selectedLevel.label.toUpperCase()} ANNOUNCEMENT
            </Text>
            {pinToTop && (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={12} color={selectedLevel.color} />
                <Text style={[styles.pinnedText, { color: selectedLevel.color }]}>Pinned</Text>
              </View>
            )}
          </View>
          {expiresIn && (
            <View style={[styles.expiryBadge, { backgroundColor: '#fff' }]}>
              <Ionicons name="hourglass" size={12} color={selectedLevel.color} />
              <Text style={[styles.expiryText, { color: selectedLevel.color }]}>
                {expiresIn < 48 ? `${expiresIn}h` : `${Math.round(expiresIn / 24)}d`}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.previewDescription}>
          This is how your announcement will appear in the feed
        </Text>
      </Animated.View>

      {/* Summary Card */}
      <Animated.View entering={FadeIn.duration(300).delay(400)} style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.summaryTitle}>Announcement Summary</Text>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Level</Text>
            <Text style={[styles.summaryValue, { color: selectedLevel.color, fontSize: 16 }]}>
              {selectedLevel.label}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pinned</Text>
            <Ionicons
              name={pinToTop ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={pinToTop ? '#10B981' : '#9CA3AF'}
            />
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expires</Text>
            <Text style={[styles.summaryValue, { fontSize: 16 }]}>
              {expiresIn ? `${expiresIn}h` : 'Never'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  importanceLevels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  importanceCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2.5,
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  importanceCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  importanceIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  importanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  importanceDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D1D5DB',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#8B5CF6',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  chipsContainer: {
    gap: 10,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.2,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  previewCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  previewContent: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#BBF7D0',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
});
