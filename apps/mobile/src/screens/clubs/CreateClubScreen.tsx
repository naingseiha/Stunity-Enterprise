import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import StunityLogo from '../../../assets/Stunity.svg';
import { clubsApi } from '@/api';
import type { CreateClubData } from '@/api/clubs';

const CLUB_TYPES: Array<{
  id: CreateClubData['type'];
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  soft: string;
  gradient: [string, string];
  description: string;
}> = [
  {
    id: 'CASUAL_STUDY_GROUP',
    name: 'Study Group',
    icon: 'people-outline',
    color: '#0EA5A4',
    soft: '#E2F6F4',
    gradient: ['#24B7B1', '#0E9C96'],
    description: 'Casual learning with peers',
  },
  {
    id: 'STRUCTURED_CLASS',
    name: 'Class',
    icon: 'school-outline',
    color: '#128E87',
    soft: '#E0F3F1',
    gradient: ['#31BBAE', '#138F88'],
    description: 'Formal structured course',
  },
  {
    id: 'PROJECT_GROUP',
    name: 'Project',
    icon: 'rocket-outline',
    color: '#C79822',
    soft: '#FFF5DC',
    gradient: ['#E1B84A', '#C99824'],
    description: 'Collaborative project team',
  },
  {
    id: 'EXAM_PREP',
    name: 'Exam Prep',
    icon: 'book-outline',
    color: '#1D9F95',
    soft: '#E8F8F6',
    gradient: ['#2FB4A7', '#B88E1A'],
    description: 'Test preparation group',
  },
];

const CLUB_MODES: Array<{
  id: CreateClubData['mode'];
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}> = [
  { id: 'PUBLIC', name: 'Public', icon: 'globe-outline', description: 'Anyone can join' },
  { id: 'INVITE_ONLY', name: 'Invite Only', icon: 'lock-closed-outline', description: 'Join by invitation' },
  {
    id: 'APPROVAL_REQUIRED',
    name: 'Approval Required',
    icon: 'checkmark-circle-outline',
    description: 'Join after approval',
  },
];

const COLORS = {
  background: '#F2F6F5',
  surface: '#FFFFFF',
  surfaceSoft: '#F8FCFB',
  field: '#F4FAF9',
  border: '#D7ECE9',
  borderStrong: '#B9DDD8',
  textPrimary: '#1E2F36',
  textSecondary: '#4E6871',
  textMuted: '#86A0A8',
  primary: '#0EA5A4',
  primaryStrong: '#0B8B8A',
  primarySoft: '#E3F6F4',
  secondary: '#E2B233',
  secondarySoft: '#FFF6DB',
} as const;

export default function CreateClubScreen() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<CreateClubData['type']>('CASUAL_STUDY_GROUP');
  const [selectedMode, setSelectedMode] = useState<CreateClubData['mode']>('PUBLIC');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const selectedTypeConfig = useMemo(
    () => CLUB_TYPES.find((type) => type.id === selectedType) || CLUB_TYPES[0],
    [selectedType],
  );

  const selectedModeConfig = useMemo(
    () => CLUB_MODES.find((mode) => mode.id === selectedMode) || CLUB_MODES[0],
    [selectedMode],
  );

  const parsedTags = useMemo(
    () =>
      tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    [tags],
  );

  const nameError = name.trim().length === 0 ? 'Club name is required.' : null;
  const descriptionError = description.trim().length === 0 ? 'Description is required.' : null;
  const canSubmit = !nameError && !descriptionError;
  const showNameError = attemptedSubmit && !!nameError;
  const showDescriptionError = attemptedSubmit && !!descriptionError;
  const hasTooManyTags = parsedTags.length > 5;

  const handleCreate = async () => {
    setAttemptedSubmit(true);
    if (!canSubmit) {
      return;
    }

    try {
      setCreating(true);

      const payload: CreateClubData = {
        name: name.trim(),
        description: description.trim(),
        type: selectedType,
        mode: selectedMode,
        tags: parsedTags.length > 0 ? parsedTags.slice(0, 5) : undefined,
      };

      await clubsApi.createClub(payload);

      Alert.alert('Success!', 'Your club has been created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err: any) {
      console.error('Failed to create club:', err);
      Alert.alert('Error', err?.message || 'Failed to create club. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']} style={styles.topSafeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <StunityLogo width={108} height={30} />

          <TouchableOpacity
            onPress={handleCreate}
            disabled={creating}
            style={[styles.iconButton, !canSubmit && styles.iconButtonInactive]}
          >
            {creating ? (
              <ActivityIndicator size="small" color={COLORS.primaryStrong} />
            ) : (
              <Ionicons
                name="checkmark"
                size={22}
                color={canSubmit ? COLORS.primaryStrong : COLORS.textMuted}
              />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Create Club</Text>
            <Text style={styles.heroSubtitle}>
              Build a professional community with clear details and a focused purpose.
            </Text>

            <View style={styles.heroMetaRow}>
              <View style={[styles.heroMetaPill, { backgroundColor: selectedTypeConfig.soft }]}> 
                <Ionicons name={selectedTypeConfig.icon} size={14} color={selectedTypeConfig.color} />
                <Text style={[styles.heroMetaText, { color: selectedTypeConfig.color }]}>
                  {selectedTypeConfig.name}
                </Text>
              </View>

              <View style={styles.heroMetaPill}> 
                <Ionicons name={selectedModeConfig.icon} size={14} color={COLORS.textSecondary} />
                <Text style={styles.heroMetaText}>{selectedModeConfig.name}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Club Name *</Text>
            <TextInput
              style={[styles.input, showNameError && styles.inputError]}
              placeholder="e.g., Advanced Mathematics Study Group"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={100}
            />
            {showNameError ? <Text style={styles.inlineErrorText}>{nameError}</Text> : null}
            <Text style={styles.charCount}>{name.length}/100</Text>
          </Animated.View>

          <Animated.View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, showDescriptionError && styles.inputError]}
              placeholder="Tell others what this club is about and who should join..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            {showDescriptionError ? <Text style={styles.inlineErrorText}>{descriptionError}</Text> : null}
            <Text style={styles.charCount}>{description.length}/500</Text>
          </Animated.View>

          <Animated.View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Club Type *</Text>
            <View style={styles.optionsGrid}>
              {CLUB_TYPES.map((type) => {
                const selected = selectedType === type.id;

                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      selected && {
                        borderColor: type.color,
                        backgroundColor: type.soft,
                        shadowColor: type.color,
                        shadowOpacity: 0.14,
                      },
                    ]}
                    onPress={() => setSelectedType(type.id)}
                    activeOpacity={0.86}
                  >
                    <View style={[styles.typeIconWrap, { backgroundColor: type.soft }]}> 
                      <Ionicons name={type.icon} size={22} color={type.color} />
                    </View>

                    <Text style={styles.typeName}>{type.name}</Text>
                    <Text style={styles.typeDescription}>{type.description}</Text>

                    {selected ? (
                      <View style={[styles.selectedBadge, { backgroundColor: type.color }]}> 
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Privacy *</Text>
            <View style={styles.modeOptions}>
              {CLUB_MODES.map((mode) => {
                const selected = selectedMode === mode.id;

                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[styles.modeOption, selected && styles.modeOptionSelected]}
                    onPress={() => setSelectedMode(mode.id)}
                    activeOpacity={0.86}
                  >
                    <View style={[styles.modeIconWrap, selected && styles.modeIconWrapSelected]}>
                      <Ionicons
                        name={mode.icon}
                        size={18}
                        color={selected ? COLORS.primaryStrong : COLORS.textSecondary}
                      />
                    </View>

                    <View style={styles.modeInfo}>
                      <Text style={[styles.modeName, selected && styles.modeNameSelected]}>{mode.name}</Text>
                      <Text style={styles.modeDescription}>{mode.description}</Text>
                    </View>

                    {selected ? (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.primaryStrong} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tags (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Math, Calculus, Problem Solving"
              placeholderTextColor={COLORS.textMuted}
              value={tags}
              onChangeText={setTags}
            />
            <Text style={styles.hint}>Separate tags with commas. Max 5 tags.</Text>
            {hasTooManyTags ? (
              <Text style={styles.warningText}>Only the first 5 tags will be used.</Text>
            ) : null}
          </Animated.View>

          <Animated.View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Live Preview</Text>

            <View style={styles.previewCard}>
              <LinearGradient
                colors={selectedTypeConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.previewHeader}
              >
                <Ionicons name={selectedTypeConfig.icon} size={30} color="rgba(255,255,255,0.95)" />
              </LinearGradient>

              <View style={styles.previewBody}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {name || 'Your Club Name'}
                </Text>

                <Text style={styles.previewDescription} numberOfLines={2}>
                  {description || 'Your club description will appear here...'}
                </Text>

                <View style={styles.previewMetaRow}>
                  <View style={styles.previewMetaChip}>
                    <Ionicons name={selectedModeConfig.icon} size={12} color={COLORS.textSecondary} />
                    <Text style={styles.previewMetaText}>{selectedModeConfig.name}</Text>
                  </View>

                  <View style={[styles.previewMetaChip, { backgroundColor: selectedTypeConfig.soft }]}> 
                    <Text style={[styles.previewMetaText, { color: selectedTypeConfig.color }]}> 
                      {selectedTypeConfig.name}
                    </Text>
                  </View>
                </View>

                {parsedTags.length > 0 ? (
                  <View style={styles.previewTags}>
                    {parsedTags.slice(0, 3).map((tag) => (
                      <View
                        key={tag}
                        style={[styles.previewTag, { backgroundColor: selectedTypeConfig.soft }]}
                      >
                        <Text style={[styles.previewTagText, { color: selectedTypeConfig.color }]}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
          <TouchableOpacity
            style={[styles.createButton, (creating || !canSubmit) && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                canSubmit
                  ? ['#1AAFA8', '#0E8F88', '#B98E1B']
                  : ['#B8CBC7', '#A8BDB8', '#9DB1AD']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Create Club</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topSafeArea: {
    backgroundColor: COLORS.surface,
  },
  topBar: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconButtonInactive: {
    backgroundColor: '#F0F7F6',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  heroMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroMetaPill: {
    height: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaPillSecondary: {
    height: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  input: {
    borderRadius: 12,
    backgroundColor: COLORS.field,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  inputError: {
    borderColor: '#E87979',
    backgroundColor: '#FFF8F8',
  },
  textArea: {
    minHeight: 116,
    paddingTop: 12,
  },
  inlineErrorText: {
    marginTop: 6,
    color: '#D14343',
    fontSize: 12,
    fontWeight: '600',
  },
  charCount: {
    marginTop: 6,
    textAlign: 'right',
    color: COLORS.textMuted,
    fontSize: 12,
  },
  hint: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  warningText: {
    marginTop: 5,
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 1,
  },
  typeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  modeOptions: {
    gap: 9,
  },
  modeOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  modeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  modeIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeIconWrapSelected: {
    borderColor: '#BFE4DF',
    backgroundColor: '#ECFAF8',
  },
  modeInfo: {
    flex: 1,
  },
  modeName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  modeNameSelected: {
    color: COLORS.primaryStrong,
  },
  modeDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  previewHeader: {
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBody: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },
  previewName: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  previewDescription: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  previewMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewMetaChip: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  previewMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  previewTags: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  previewTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 12,
  },
  bottomSafeArea: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 14,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.88,
  },
  createButtonGradient: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
