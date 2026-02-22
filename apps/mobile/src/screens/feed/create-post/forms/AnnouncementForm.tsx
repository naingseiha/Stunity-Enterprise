/**
 * Enhanced Announcement Form Component
 * Beautiful, clean UI for announcement creation with importance levels
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    description: 'General update',
  },
  {
    type: 'IMPORTANT' as const,
    label: 'Important',
    icon: 'alert-circle',
    color: '#0EA5E9',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    description: 'Needs attention',
  },
  {
    type: 'URGENT' as const,
    label: 'Urgent',
    icon: 'warning',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    description: 'Action required',
  },
  {
    type: 'CRITICAL' as const,
    label: 'Critical',
    icon: 'alert',
    color: '#7F1D1D',
    bgColor: '#FEF2F2',
    borderColor: '#EF4444',
    description: 'Immediate action',
  },
];

const EXPIRATION_OPTIONS = [
  { label: 'Never', value: null },
  { label: '24h', value: 24 },
  { label: '3d', value: 72 },
  { label: '1w', value: 168 },
  { label: '2w', value: 336 },
];

const AUDIENCE_OPTIONS = [
  { value: 'EVERYONE', label: 'Everyone', desc: 'All users can view', icon: 'globe', color: '#6366F1' },
  { value: 'MY_SCHOOL', label: 'My School', desc: 'Only school members', icon: 'school', color: '#10B981' },
  { value: 'MY_CLASS', label: 'My Class', desc: 'Only class members', icon: 'people', color: '#F59E0B' },
  { value: 'SPECIFIC', label: 'Specific Group', desc: 'Invite selected people', icon: 'person-add', color: '#8B5CF6' },
];

export function AnnouncementForm({ onDataChange }: AnnouncementFormProps) {
  const [importance, setImportance] = useState<AnnouncementData['importance']>('INFO');
  const [pinToTop, setPinToTop] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [targetAudience, setTargetAudience] = useState('EVERYONE');
  const [sendNotification, setSendNotification] = useState(true);

  useEffect(() => {
    onDataChange({ importance, pinToTop, expiresIn });
  }, [importance, pinToTop, expiresIn]);

  const selectedLevel = IMPORTANCE_LEVELS.find(level => level.type === importance)!;

  return (
    <View style={styles.container}>
      {/* Importance Level Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: selectedLevel.bgColor }]}>
            <Ionicons name={selectedLevel.icon as any} size={20} color={selectedLevel.color} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Importance Level</Text>
            <Text style={styles.cardSubtitle}>Set the urgency of this announcement</Text>
          </View>
        </View>

        <View style={styles.importanceGrid}>
          {IMPORTANCE_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.type}
              onPress={() => {
                Haptics.selectionAsync();
                setImportance(level.type);
              }}
              style={[
                styles.importanceCard,
                {
                  backgroundColor: importance === level.type ? level.bgColor : '#F4F6F9',
                  borderColor: importance === level.type ? level.borderColor : '#E5E7EB',
                },
                importance === level.type && styles.importanceCardSelected,
              ]}
            >
              <View style={[
                styles.importanceIcon,
                { backgroundColor: importance === level.type ? '#FFF' : '#E5E7EB' }
              ]}>
                <Ionicons
                  name={level.icon as any}
                  size={20}
                  color={importance === level.type ? level.color : '#9CA3AF'}
                />
              </View>
              <View>
                <Text style={[
                  styles.importanceLabel,
                  importance === level.type && { color: level.color, fontWeight: '700' }
                ]}>
                  {level.label}
                </Text>
                <Text style={styles.importanceDesc}>{level.description}</Text>
              </View>
              {importance === level.type && (
                <View style={[styles.checkBadge, { borderColor: level.color }]}>
                  <Ionicons name="checkmark" size={10} color={level.color} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Settings Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="settings" size={20} color="#4B5563" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Display Options</Text>
            <Text style={styles.cardSubtitle}>Control placement and duration</Text>
          </View>
        </View>

        <View style={styles.settingTile}>
          <View style={styles.settingTileLeft}>
            <View style={[styles.settingMiniIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="pin" size={16} color="#6366F1" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Pin to Top</Text>
              <Text style={styles.settingDesc}>Keep at top of feed</Text>
            </View>
          </View>
          <Switch
            value={pinToTop}
            onValueChange={(value) => {
              Haptics.selectionAsync();
              setPinToTop(value);
            }}
            trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
            thumbColor={pinToTop ? '#4F46E5' : '#FFF'}
            ios_backgroundColor="#E5E7EB"
          />
        </View>

        <View style={styles.settingTile}>
          <View style={styles.settingTileLeft}>
            <View style={[styles.settingMiniIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="time" size={16} color="#EF4444" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Auto-Expiration</Text>
              <Text style={styles.settingDesc}>Remove after set time</Text>
            </View>
          </View>

          <View style={styles.chipsWrap}>
            {EXPIRATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.label}
                onPress={() => {
                  Haptics.selectionAsync();
                  setExpiresIn(option.value);
                }}
                style={[
                  styles.chip,
                  expiresIn === option.value && styles.chipSelected
                ]}
              >
                <Text style={[
                  styles.chipText,
                  expiresIn === option.value && styles.chipTextSelected
                ]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Preview Card */}
      <View style={[
        styles.previewCard,
        {
          backgroundColor: selectedLevel.bgColor,
          borderColor: selectedLevel.borderColor,
        }
      ]}>
        <View style={styles.previewHeader}>
          <View style={[styles.previewIcon, { backgroundColor: selectedLevel.color }]}>
            <Ionicons name={selectedLevel.icon as any} size={16} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewTitle, { color: selectedLevel.color }]}>
              {selectedLevel.label.toUpperCase()} ANNOUNCEMENT
            </Text>
            <Text style={styles.previewSubtitle}>
              Visible to everyone • {expiresIn ? `Expires in ${expiresIn}h` : 'No expiration'}
            </Text>
          </View>
          {pinToTop && (
            <View style={[styles.pinBadge, { backgroundColor: selectedLevel.color }]}>
              <Ionicons name="pin" size={10} color="#FFF" />
              <Text style={styles.pinText}>PINNED</Text>
            </View>
          )}
        </View>
      </View>
      {/* Target Audience Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="people" size={20} color="#6366F1" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Target Audience</Text>
            <Text style={styles.cardSubtitle}>Who should see this</Text>
          </View>
        </View>

        <View style={styles.audienceList}>
          {AUDIENCE_OPTIONS.map((opt) => {
            const isSelected = targetAudience === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTargetAudience(opt.value);
                }}
                style={[
                  styles.audienceRow,
                  isSelected && {
                    backgroundColor: opt.color + '10',
                    borderColor: opt.color,
                  },
                ]}
              >
                <View style={[styles.audienceIconWrap, { backgroundColor: isSelected ? opt.color + '22' : '#F3F4F6' }]}>
                  <Ionicons
                    name={opt.icon as any}
                    size={18}
                    color={isSelected ? opt.color : '#9CA3AF'}
                  />
                </View>
                <View style={styles.audienceInfo}>
                  <Text style={[
                    styles.audienceLabel,
                    isSelected && { color: opt.color, fontWeight: '700' },
                  ]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.audienceHint}>{opt.desc}</Text>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={opt.color} />
                ) : (
                  <View style={styles.audienceRadio} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notification Toggle */}
        <View style={styles.notificationRow}>
          <View style={[styles.switchIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="notifications" size={18} color="#F59E0B" />
          </View>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.switchLabel}>Send Push Notification</Text>
            <Text style={styles.switchSubLabel}>Alert recipients immediately</Text>
          </View>
          <Switch
            value={sendNotification}
            onValueChange={(v) => { Haptics.selectionAsync(); setSendNotification(v); }}
            trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
            thumbColor={sendNotification ? '#4F46E5' : '#FFF'}
            ios_backgroundColor="#E5E7EB"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // Importance Grid
  importanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  importanceCard: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  importanceCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.08,
  },
  importanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  importanceDesc: {
    fontSize: 11,
    color: '#6B7280',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Settings
  settingTile: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
    marginBottom: 12,
  },
  settingTileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingMiniIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextWrap: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  settingDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#FFF',
  },
  // Preview
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  previewSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pinText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  // Audience
  audienceList: {
    gap: 10,
    marginBottom: 16,
  },
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  audienceIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceInfo: {
    flex: 1,
  },
  audienceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  audienceHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  audienceRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  switchIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  switchSubLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
});
