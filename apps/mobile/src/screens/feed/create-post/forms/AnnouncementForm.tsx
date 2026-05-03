/**
 * Enhanced Announcement Form Component
 * Beautiful, clean UI for announcement creation with importance levels
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Haptics } from '@/services/haptics';
import { AIGenerateButton } from '@/components/ai/AIGenerateButton';
import { AIPromptModal } from '@/components/ai/AIPromptModal';
import { AILoadingOverlay } from '@/components/ai/AILoadingOverlay';
import { AIResultPreview } from '@/components/ai/AIResultPreview';
import type { AIPromptData } from '@/components/ai/AIPromptModal';
import { useThemeContext } from '@/contexts';
import { aiService } from '@/services/ai.service';
import { useTranslation } from 'react-i18next';

interface AnnouncementFormProps {
  onDataChange: (data: AnnouncementData) => void;
  onGenerated?: (title: string, content: string) => void;
}

export interface AnnouncementData {
  importance: 'INFO' | 'IMPORTANT' | 'URGENT' | 'CRITICAL';
  pinToTop: boolean;
  expiresIn: number | null; // hours, null = no expiration
}

const IMPORTANCE_LEVELS = [
  {
    type: 'INFO' as const,
    labelKey: 'feed.createPost.announcement.level.info',
    icon: 'information-circle',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    descriptionKey: 'feed.createPost.announcement.levelDesc.info',
  },
  {
    type: 'IMPORTANT' as const,
    labelKey: 'feed.createPost.announcement.level.important',
    icon: 'alert-circle',
    color: '#0EA5E9',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    descriptionKey: 'feed.createPost.announcement.levelDesc.important',
  },
  {
    type: 'URGENT' as const,
    labelKey: 'feed.createPost.announcement.level.urgent',
    icon: 'warning',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    descriptionKey: 'feed.createPost.announcement.levelDesc.urgent',
  },
  {
    type: 'CRITICAL' as const,
    labelKey: 'feed.createPost.announcement.level.critical',
    icon: 'alert',
    color: '#7F1D1D',
    bgColor: '#FEF2F2',
    borderColor: '#EF4444',
    descriptionKey: 'feed.createPost.announcement.levelDesc.critical',
  },
];

const EXPIRATION_OPTIONS = [
  { labelKey: 'feed.createPost.announcement.expiration.never', value: null },
  { labelKey: 'feed.createPost.announcement.expiration.h24', value: 24 },
  { labelKey: 'feed.createPost.announcement.expiration.d3', value: 72 },
  { labelKey: 'feed.createPost.announcement.expiration.w1', value: 168 },
  { labelKey: 'feed.createPost.announcement.expiration.w2', value: 336 },
];

const AUDIENCE_OPTIONS = [
  { value: 'EVERYONE', labelKey: 'feed.createPost.announcement.audience.everyone', descKey: 'feed.createPost.announcement.audienceDesc.everyone', icon: 'globe', color: '#6366F1' },
  { value: 'MY_SCHOOL', labelKey: 'feed.createPost.announcement.audience.mySchool', descKey: 'feed.createPost.announcement.audienceDesc.mySchool', icon: 'school', color: '#10B981' },
  { value: 'MY_CLASS', labelKey: 'feed.createPost.announcement.audience.myClass', descKey: 'feed.createPost.announcement.audienceDesc.myClass', icon: 'people', color: '#F59E0B' },
  { value: 'SPECIFIC', labelKey: 'feed.createPost.announcement.audience.specificGroup', descKey: 'feed.createPost.announcement.audienceDesc.specificGroup', icon: 'person-add', color: '#8B5CF6' },
];

export function AnnouncementForm({ onDataChange, onGenerated }: AnnouncementFormProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [importance, setImportance] = useState<AnnouncementData['importance']>('INFO');
  const [pinToTop, setPinToTop] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [targetAudience, setTargetAudience] = useState('EVERYONE');
  const [sendNotification, setSendNotification] = useState(true);

  // AI State
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<{ subject: string, body: string } | null>(null);
  const [lastPrompt, setLastPrompt] = useState<AIPromptData | null>(null);

  const handleGenerateAI = async (data: AIPromptData) => {
    setLastPrompt(data);
    setIsAiLoading(true);
    try {
      // For announcement, we map topic -> notes, gradeLevel -> urgency hint
      const urgencyMap: Record<string, string> = {
        'INFO': 'info',
        'IMPORTANT': 'important',
        'URGENT': 'urgent',
        'CRITICAL': 'critical'
      };
      const mappedUrgency = urgencyMap[importance] || 'info';
      const result = await aiService.generateAnnouncement(data.topic, undefined, mappedUrgency);
      setAiPreviewData(result || null);
    } catch (error: any) {
      alert(error.message || t('feed.createPost.announcement.failedDraft'));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptAI = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (aiPreviewData?.subject && aiPreviewData?.body && onGenerated) {
      onGenerated(aiPreviewData.subject, aiPreviewData.body);
    } else if (!onGenerated) {
      alert(t('feed.createPost.announcement.cannotApplyText'));
    }
    setAiPreviewData(null);
  };

  useEffect(() => {
    onDataChange({ importance, pinToTop, expiresIn });
  }, [importance, pinToTop, expiresIn]);

  const selectedLevel = IMPORTANCE_LEVELS.find(level => level.type === importance)!;

  return (
    <View style={styles.container}>
      {/* Importance Level Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.iconContainer, { backgroundColor: selectedLevel.bgColor }]}>
              <Ionicons name={selectedLevel.icon as any} size={20} color={selectedLevel.color} />
            </View>
            <View>
              <Text style={styles.cardTitle}>{t('feed.createPost.announcement.importanceLevel')}</Text>
              <Text style={styles.cardSubtitle}>{t('feed.createPost.announcement.setUrgency')}</Text>
            </View>
          </View>
          <AIGenerateButton
            label={t('feed.createPost.announcement.draft')}
            size="small"
            type="ghost"
            onPress={() => setIsAiModalVisible(true)}
          />
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
                  borderColor: importance === level.type ? level.borderColor : colors.border,
                },
                importance === level.type && styles.importanceCardSelected,
              ]}
            >
              <View style={[
                styles.importanceIcon,
                { backgroundColor: importance === level.type ? colors.card : colors.border }
              ]}>
                <Ionicons
                  name={level.icon as any}
                  size={20}
                  color={importance === level.type ? level.color : colors.textTertiary}
                />
              </View>
              <View>
                <Text style={[
                  styles.importanceLabel,
                  !!(importance === level.type) && { color: level.color, fontWeight: '700' }
                ]}>
                  {t(level.labelKey)}
                </Text>
                <Text style={styles.importanceDesc}>{t(level.descriptionKey)}</Text>
              </View>
              {!!(importance === level.type) && (
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
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="settings" size={20} color="#4B5563" />
          </View>
          <View>
            <Text style={styles.cardTitle}>{t('feed.createPost.announcement.displayOptions')}</Text>
            <Text style={styles.cardSubtitle}>{t('feed.createPost.announcement.controlPlacementDuration')}</Text>
          </View>
        </View>

        <View style={styles.settingTile}>
          <View style={styles.settingTileLeft}>
            <View style={[styles.settingMiniIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="pin" size={16} color="#6366F1" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>{t('feed.createPost.announcement.pinToTop')}</Text>
              <Text style={styles.settingDesc}>{t('feed.createPost.announcement.keepAtTop')}</Text>
            </View>
          </View>
          <Switch
            value={pinToTop}
            onValueChange={(value) => {
              Haptics.selectionAsync();
              setPinToTop(value);
            }}
            trackColor={{ false: colors.border, true: '#C7D2FE' }}
            thumbColor={pinToTop ? '#4F46E5' : '#FFF'}
            ios_backgroundColor={colors.border}
          />
        </View>

        <View style={styles.settingTile}>
          <View style={styles.settingTileLeft}>
            <View style={[styles.settingMiniIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="time" size={16} color="#EF4444" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>{t('feed.createPost.announcement.autoExpiration')}</Text>
              <Text style={styles.settingDesc}>{t('feed.createPost.announcement.removeAfterTime')}</Text>
            </View>
          </View>

          <View style={styles.chipsWrap}>
            {EXPIRATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.labelKey}
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
                  !!(expiresIn === option.value) && styles.chipTextSelected
                ]}>{t(option.labelKey)}</Text>
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
              {`${t(selectedLevel.labelKey).toUpperCase()} ${t('feed.createPost.announcement.announcementWord').toUpperCase()}`}
            </Text>
            <Text style={styles.previewSubtitle}>
              {t('feed.createPost.announcement.visibleToEveryone')} • {expiresIn ? t('feed.createPost.announcement.expiresIn', { hours: expiresIn }) : t('feed.createPost.announcement.noExpiration')}
            </Text>
          </View>
          {!!pinToTop && (
            <View style={[styles.pinBadge, { backgroundColor: selectedLevel.color }]}>
              <Ionicons name="pin" size={10} color="#FFF" />
              <Text style={styles.pinText}>{t('feed.createPost.announcement.pinned')}</Text>
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
            <Text style={styles.cardTitle}>{t('feed.createPost.announcement.targetAudience')}</Text>
            <Text style={styles.cardSubtitle}>{t('feed.createPost.announcement.whoShouldSee')}</Text>
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
                  !!isSelected && {
                    backgroundColor: opt.color + '10',
                    borderColor: opt.color,
                  },
                ]}
              >
                <View style={[styles.audienceIconWrap, { backgroundColor: isSelected ? opt.color + '22' : colors.surfaceVariant }]}>
                  <Ionicons
                    name={opt.icon as any}
                    size={18}
                    color={isSelected ? opt.color : colors.textTertiary}
                  />
                </View>
                <View style={styles.audienceInfo}>
                  <Text style={[
                    styles.audienceLabel,
                    !!isSelected && { color: opt.color, fontWeight: '700' },
                  ]}>
                    {t(opt.labelKey)}
                  </Text>
                  <Text style={styles.audienceHint}>{t(opt.descKey)}</Text>
                </View>
                {!!isSelected ? (
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
            <Text style={styles.switchLabel}>{t('feed.createPost.announcement.sendPushNotification')}</Text>
            <Text style={styles.switchSubLabel}>{t('feed.createPost.announcement.alertRecipientsImmediately')}</Text>
          </View>
          <Switch
            value={sendNotification}
            onValueChange={(v) => { Haptics.selectionAsync(); setSendNotification(v); }}
            trackColor={{ false: colors.border, true: '#818CF8' }}
            thumbColor={sendNotification ? '#4F46E5' : '#FFF'}
            ios_backgroundColor={colors.border}
          />
        </View>
      </View>

      {/* AI Modals */}
      <AIPromptModal
        visible={isAiModalVisible}
        onClose={() => setIsAiModalVisible(false)}
        onGenerate={handleGenerateAI}
        type="lesson" // generic topic prompt
        title={t('feed.createPost.announcement.draftAnnouncement')}
      />

      <AIResultPreview
        visible={!!aiPreviewData}
        content={aiPreviewData?.subject && aiPreviewData?.body ? `Subject: ${aiPreviewData.subject}\n\n${aiPreviewData.body}` : ''}
        title={t('feed.createPost.announcement.announcementDrafted')}
        onAccept={handleAcceptAI}
        onRegenerate={() => lastPrompt && handleGenerateAI(lastPrompt)}
        onDiscard={() => setAiPreviewData(null)}
        isRegenerating={isAiLoading}
      />

      <AILoadingOverlay
        isVisible={!!(isAiLoading && !aiPreviewData)}
        message={t('feed.createPost.announcement.aiDrafting')}
      />
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
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
    borderColor: colors.border,
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
    color: colors.text,
  },
  importanceDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Settings
  settingTile: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.textSecondary,
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
  },
  audienceHint: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1,
  },
  audienceRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
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
    color: colors.textSecondary,
    marginTop: 1,
  },
});
