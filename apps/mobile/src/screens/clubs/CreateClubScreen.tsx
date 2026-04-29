import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useTranslation } from 'react-i18next';

import { clubsApi } from '@/api';
import type { CreateClubData } from '@/api/clubs';

// ── Brand colours ────────────────────────────────────────────────
const TEAL       = '#09CFF7'; // Stunity Brand Teal
const TEAL_DARK  = '#06A8CC';
const TEAL_LIGHT = '#E0F9FD';

const COLORS = {
  background:    '#F8FBFF',
  surface:       '#FFFFFF',
  border:        '#E2E8F0',
  borderFocus:   TEAL,
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  error:         '#EF4444',
  errorSoft:     '#FEF2F2',
  warning:       '#B45309',
} as const;

// ── Club type config ─────────────────────────────────────────────
const CLUB_TYPES: Array<{
  id: CreateClubData['type'];
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  soft: string;
  gradient: [string, string];
  description: string;
}> = [
  {
    id: 'CASUAL_STUDY_GROUP',
    name: 'Study Group',
    icon: 'people',
    accent: '#8B5CF6', // Purple
    soft: '#F3E8FF',
    gradient: ['#A78BFA', '#8B5CF6'],
    description: 'Casual learning with peers',
  },
  {
    id: 'STRUCTURED_CLASS',
    name: 'Class',
    icon: 'school',
    accent: '#06A8CC', // Teal
    soft: '#E0F9FD',
    gradient: ['#09CFF7', '#06A8CC'],
    description: 'Formal structured course',
  },
  {
    id: 'PROJECT_GROUP',
    name: 'Project',
    icon: 'rocket',
    accent: '#F59E0B', // Amber
    soft: '#FEF3C7',
    gradient: ['#FBBF24', '#F59E0B'],
    description: 'Collaborative project team',
  },
  {
    id: 'EXAM_PREP',
    name: 'Exam Prep',
    icon: 'book',
    accent: '#6366F1', // Indigo
    soft: '#E0E7FF',
    gradient: ['#818CF8', '#6366F1'],
    description: 'Test preparation group',
  },
];

// ── Club mode config ─────────────────────────────────────────────
const CLUB_MODES: Array<{
  id: CreateClubData['mode'];
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}> = [
  { id: 'PUBLIC',            name: 'Public',           icon: 'globe-outline',           description: 'Anyone can discover and join' },
  { id: 'INVITE_ONLY',       name: 'Invite Only',      icon: 'lock-closed-outline',     description: 'Join by member invitation only' },
  { id: 'APPROVAL_REQUIRED', name: 'Approval Required', icon: 'checkmark-circle-outline', description: 'Request to join, admin approves' },
];

// ── Screen ───────────────────────────────────────────────────────
export default function CreateClubScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const getTypeName = (typeId: CreateClubData['type']) => {
    if (typeId === 'CASUAL_STUDY_GROUP') return t('clubs.types.studyGroup');
    if (typeId === 'STRUCTURED_CLASS') return t('clubs.types.class');
    if (typeId === 'PROJECT_GROUP') return t('clubs.types.project');
    return t('clubs.types.examPrep');
  };
  const getTypeDescription = (typeId: CreateClubData['type']) => {
    if (typeId === 'CASUAL_STUDY_GROUP') return t('clubScreens.create.types.studyGroupDesc');
    if (typeId === 'STRUCTURED_CLASS') return t('clubScreens.create.types.classDesc');
    if (typeId === 'PROJECT_GROUP') return t('clubScreens.create.types.projectDesc');
    return t('clubScreens.create.types.examPrepDesc');
  };
  const getModeName = (modeId: CreateClubData['mode']) => {
    if (modeId === 'PUBLIC') return t('clubScreens.details.mode.public');
    if (modeId === 'INVITE_ONLY') return t('clubScreens.details.mode.inviteOnly');
    return t('clubScreens.details.mode.approvalRequired');
  };
  const getModeDescription = (modeId: CreateClubData['mode']) => {
    if (modeId === 'PUBLIC') return t('clubScreens.create.mode.publicDesc');
    if (modeId === 'INVITE_ONLY') return t('clubScreens.create.mode.inviteOnlyDesc');
    return t('clubScreens.create.mode.approvalRequiredDesc');
  };

  const [name,            setName]            = useState('');
  const [description,     setDescription]     = useState('');
  const [selectedType,    setSelectedType]    = useState<CreateClubData['type']>('CASUAL_STUDY_GROUP');
  const [selectedMode,    setSelectedMode]    = useState<CreateClubData['mode']>('PUBLIC');
  const [tags,            setTags]            = useState('');
  const [subject,         setSubject]         = useState('');
  const [level,           setLevel]           = useState('');
  const [capacityInput,   setCapacityInput]   = useState('');
  const [startDate,       setStartDate]       = useState('');
  const [endDate,         setEndDate]         = useState('');
  const [creating,        setCreating]        = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [nameFocused,     setNameFocused]     = useState(false);
  const [descFocused,     setDescFocused]     = useState(false);

  const selectedTypeConfig = useMemo(
    () => CLUB_TYPES.find(t => t.id === selectedType) || CLUB_TYPES[0],
    [selectedType],
  );
  const selectedModeConfig = useMemo(
    () => CLUB_MODES.find(m => m.id === selectedMode) || CLUB_MODES[0],
    [selectedMode],
  );
  const parsedTags = useMemo(
    () => tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
    [tags],
  );

  const nameError        = name.trim().length === 0 ? t('clubScreens.create.nameRequired') : null;
  const descriptionError = description.trim().length === 0 ? t('clubScreens.create.descriptionRequired') : null;
  const capacityValue = Number(capacityInput);
  const capacityError =
    capacityInput.trim().length > 0 &&
    (!Number.isFinite(capacityValue) || capacityValue <= 0 || !Number.isInteger(capacityValue))
      ? t('clubScreens.create.capacityInvalid')
      : null;
  const canSubmit        = !nameError && !descriptionError && !capacityError;
  const showNameError    = attemptedSubmit && !!nameError;
  const showDescError    = attemptedSubmit && !!descriptionError;
  const hasTooManyTags   = parsedTags.length > 5;

  const handleCreate = async () => {
    setAttemptedSubmit(true);
    if (!canSubmit) return;

    try {
      setCreating(true);
      await clubsApi.createClub({
        name:        name.trim(),
        description: description.trim(),
        type:        selectedType,
        mode:        selectedMode,
        subject: selectedType === 'STRUCTURED_CLASS' && subject.trim().length > 0 ? subject.trim() : undefined,
        level: selectedType === 'STRUCTURED_CLASS' && level.trim().length > 0 ? level.trim() : undefined,
        capacity: capacityInput.trim().length > 0 ? capacityValue : undefined,
        startDate: startDate.trim().length > 0 ? startDate.trim() : undefined,
        endDate: endDate.trim().length > 0 ? endDate.trim() : undefined,
        ...(selectedType === 'STRUCTURED_CLASS'
          ? {
              enableSubjects: true,
              enableGrading: true,
              enableAttendance: true,
              enableAssignments: true,
              enableReports: true,
              enableAwards: true,
            }
          : {}),
        tags:        parsedTags.length > 0 ? parsedTags.slice(0, 5) : undefined,
      });
      clubsApi.invalidateClubsCache();
      Alert.alert(t('clubScreens.create.createdTitle'), t('clubScreens.create.createdMessage'), [
        { text: t('clubScreens.create.awesome'), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('clubScreens.create.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Top bar ── */}
      <LinearGradient colors={[TEAL, TEAL_DARK]} style={s.topGradient}>
        <SafeAreaView edges={['top']}>
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={s.topBarCenter}>
              <Text style={s.topBarTitle}>{t('clubScreens.create.header')}</Text>
              <Text style={s.topBarSub}>{t('clubScreens.create.subheader')}</Text>
            </View>

            <TouchableOpacity
              style={[s.doneBtn, !canSubmit && s.doneBtnDisabled]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.85}
            >
              {creating
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark" size={20} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Club Name ── */}
          <View style={s.card}>
            <View style={s.fieldLabel}>
              <View style={[s.labelIcon, { backgroundColor: TEAL_LIGHT }]}>
                <Ionicons name="text" size={14} color={TEAL_DARK} />
              </View>
              <Text style={s.labelText}>{t('clubScreens.create.clubName')} <Text style={s.required}>*</Text></Text>
            </View>
            <TextInput
              style={[s.input, nameFocused && s.inputFocused, showNameError && s.inputError]}
              placeholder={t('clubScreens.create.clubNamePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              maxLength={100}
            />
            <View style={s.inputFooter}>
              {showNameError
                ? <Text style={s.errorText}>{nameError}</Text>
                : <Text style={s.footerHint}>{t('clubScreens.create.clubNameHint')}</Text>
              }
              <Text style={[s.charCount, name.length > 90 && s.charCountWarn]}>{name.length}/100</Text>
            </View>
          </View>

          {/* ── Description ── */}
          <View style={s.card}>
            <View style={s.fieldLabel}>
              <View style={[s.labelIcon, { backgroundColor: TEAL_LIGHT }]}>
                <Ionicons name="document-text" size={14} color={TEAL} />
              </View>
              <Text style={s.labelText}>{t('common.description')} <Text style={s.required}>*</Text></Text>
            </View>
            <TextInput
              style={[s.input, s.textArea, descFocused && s.inputFocused, showDescError && s.inputError]}
              placeholder={t('clubScreens.create.descriptionPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={s.inputFooter}>
              {showDescError
                ? <Text style={s.errorText}>{descriptionError}</Text>
                : <Text style={s.footerHint}>{t('clubScreens.create.descriptionHint')}</Text>
              }
              <Text style={[s.charCount, description.length > 460 && s.charCountWarn]}>{description.length}/500</Text>
            </View>
          </View>

          {/* ── Club Type ── */}
          <View style={s.card}>
            <View style={s.fieldLabel}>
              <View style={[s.labelIcon, { backgroundColor: TEAL_LIGHT }]}>
                <Ionicons name="apps" size={14} color={TEAL_DARK} />
              </View>
              <Text style={s.labelText}>{t('clubScreens.create.clubType')} <Text style={s.required}>*</Text></Text>
            </View>

            <View style={s.typesGrid}>
              {CLUB_TYPES.map(type => {
                const sel = selectedType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[s.typeCard, sel && { borderColor: type.accent, backgroundColor: type.soft }]}
                    onPress={() => setSelectedType(type.id)}
                    activeOpacity={0.85}
                  >
                    {/* Selected checkmark */}
                    {sel && (
                      <View style={[s.typeCheck, { backgroundColor: type.accent }]}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    )}

                    {/* Icon */}
                    <LinearGradient
                      colors={type.gradient}
                      style={s.typeIconBox}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name={type.icon} size={22} color="#fff" />
                    </LinearGradient>

                    <Text style={[s.typeName, sel && { color: type.accent }]}>{getTypeName(type.id)}</Text>
                    <Text style={s.typeDesc}>{getTypeDescription(type.id)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {selectedType === 'STRUCTURED_CLASS' ? (
            <View style={s.card}>
              <View style={s.fieldLabel}>
                <View style={[s.labelIcon, { backgroundColor: TEAL_LIGHT }]}>
                  <Ionicons name="school-outline" size={14} color={TEAL_DARK} />
                </View>
                <Text style={s.labelText}>{t('clubScreens.create.classSettings')}</Text>
              </View>

              <TextInput
                style={s.input}
                placeholder={t('clubScreens.create.subjectPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={subject}
                onChangeText={setSubject}
              />

              <TextInput
                style={s.input}
                placeholder={t('clubScreens.create.levelPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                value={level}
                onChangeText={setLevel}
              />

              <TextInput
                style={[s.input, capacityError && s.inputError]}
                placeholder={t('clubScreens.create.capacityPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={capacityInput}
                onChangeText={setCapacityInput}
              />
              {capacityError ? <Text style={s.errorText}>{capacityError}</Text> : null}

              <View style={s.splitRow}>
                <TextInput
                  style={[s.input, s.splitInput]}
                  placeholder={t('clubScreens.create.startDatePlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  value={startDate}
                  onChangeText={setStartDate}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[s.input, s.splitInput]}
                  placeholder={t('clubScreens.create.endDatePlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  value={endDate}
                  onChangeText={setEndDate}
                  autoCapitalize="none"
                />
              </View>
              <Text style={s.footerHint}>{t('clubScreens.create.classSettingsHint')}</Text>
            </View>
          ) : null}

          {/* ── Privacy ── */}
          <View style={s.card}>
            <View style={s.fieldLabel}>
              <View style={[s.labelIcon, { backgroundColor: TEAL_LIGHT }]}>
                <Ionicons name="shield-checkmark" size={14} color={TEAL_DARK} />
              </View>
              <Text style={s.labelText}>{t('clubScreens.create.privacy')} <Text style={s.required}>*</Text></Text>
            </View>

            <View style={s.modeList}>
              {CLUB_MODES.map(mode => {
                const sel = selectedMode === mode.id;
                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[s.modeRow, sel && s.modeRowSelected]}
                    onPress={() => setSelectedMode(mode.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[s.modeIconCircle, sel && s.modeIconCircleSel]}>
                      <Ionicons name={mode.icon} size={17} color={sel ? TEAL : COLORS.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.modeName, sel && s.modeNameSel]}>{getModeName(mode.id)}</Text>
                      <Text style={s.modeDesc}>{getModeDescription(mode.id)}</Text>
                    </View>
                    <View style={[s.modeRadio, sel && s.modeRadioSel]}>
                      {sel && <View style={s.modeRadioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Tags ── */}
          <View style={s.card}>
            <View style={s.fieldLabel}>
              <View style={[s.labelIcon, { backgroundColor: TEAL_LIGHT }]}>
                <Ionicons name="pricetag" size={14} color={TEAL_DARK} />
              </View>
              <Text style={s.labelText}>{t('clubScreens.create.tags')} <Text style={s.optional}>({t('common.optional')})</Text></Text>
            </View>
            <TextInput
              style={s.input}
              placeholder={t('clubScreens.create.tagsPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={tags}
              onChangeText={setTags}
            />
            {hasTooManyTags
              ? <Text style={s.warnText}>{t('clubScreens.create.tagsMaxWarning')}</Text>
              : <Text style={s.footerHint}>{t('clubScreens.create.tagsHint')}</Text>
            }
            {parsedTags.length > 0 && (
              <View style={s.tagPills}>
                {parsedTags.slice(0, 5).map(tag => (
                  <View key={tag} style={[s.tagPill, { backgroundColor: selectedTypeConfig.soft }]}>
                    <Text style={[s.tagPillText, { color: selectedTypeConfig.accent }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Live Preview ── */}
          <View style={s.card}>
            <View style={s.fieldLabel}>
              <View style={[s.labelIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="eye" size={14} color="#10B981" />
              </View>
              <Text style={s.labelText}>{t('clubScreens.create.livePreview')}</Text>
            </View>

            {/* Matches the ClubCard style */}
            <View style={s.previewCard}>
              <View style={s.previewHeader}>
                <View style={[s.previewIconBox, { backgroundColor: selectedTypeConfig.accent }]}>
                  <Ionicons name={selectedTypeConfig.icon} size={20} color="#fff" />
                </View>
                <Text style={s.previewTitle} numberOfLines={1}>
                  {name || t('clubScreens.create.yourClubName')}
                </Text>
                <View style={s.previewViewBtn}>
                  <Text style={s.previewViewText}>{t('common.view')}</Text>
                </View>
              </View>

              <Text style={s.previewDesc} numberOfLines={2}>
                {description || t('clubs.card.defaultDescription', { type: getTypeName(selectedTypeConfig.id) })}
              </Text>

              <View style={s.previewFooter}>
                <View style={s.avatarStack}>
                  {[1, 2].map(i => (
                    <View key={i} style={[s.avatarCircle, { marginLeft: i > 1 ? -10 : 0 }]}>
                      <Ionicons name="person" size={12} color="#CBD5E1" />
                    </View>
                  ))}
                </View>
                <Text style={s.memberCountText}>{t('clubScreens.create.previewMembers')}</Text>
                <View style={{ flex: 1 }} />
                <LinearGradient
                  colors={[TEAL, TEAL_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.previewJoinPill}
                >
                  <Text style={s.previewJoinText}>{t('clubs.card.joinNow')} →</Text>
                </LinearGradient>
              </View>

              <View style={s.previewBar}>
                <View style={[s.previewBarFill, { backgroundColor: selectedTypeConfig.accent }]} />
              </View>
            </View>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Sticky Create Button ── */}
        <SafeAreaView edges={['bottom']} style={s.stickyBar}>
          <TouchableOpacity
            style={[s.createBtn, (!canSubmit || creating) && s.createBtnDisabled]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={canSubmit ? [TEAL, TEAL_DARK] : ['#CBD5E1', '#94A3B8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.createBtnGradient}
            >
              {creating
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={s.createBtnText}>{t('clubScreens.create.createClub')}</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Top bar (gradient)
  topGradient: {},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: { flex: 1 },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  topBarSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  doneBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.10)' },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8, gap: 12 },

  // White cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },

  // Field label row
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelIcon: {
    width: 28, height: 28,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  labelText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  required:  { color: '#EF4444' },
  optional:  { fontSize: 13, fontWeight: '500', color: COLORS.textMuted },

  // Text inputs
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputFocused: {
    borderColor: TEAL,
    backgroundColor: '#F0FDFA',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -4,
  },
  footerHint:     { fontSize: 12, color: COLORS.textMuted },
  errorText:      { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  charCount:      { fontSize: 12, color: COLORS.textMuted },
  charCountWarn:  { color: '#F59E0B' },
  warnText:       { fontSize: 12, fontWeight: '600', color: '#B45309' },
  splitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  splitInput: {
    flex: 1,
  },

  // Club type grid
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  typeCard: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
    position: 'relative',
    gap: 6,
  },
  typeCheck: {
    position: 'absolute',
    top: 10, right: 10,
    width: 20, height: 20,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  typeIconBox: {
    width: 44, height: 44,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  typeName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  typeDesc: { fontSize: 12, lineHeight: 16, color: COLORS.textSecondary },

  // Privacy mode list
  modeList: { gap: 8 },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  modeRowSelected: {
    borderColor: TEAL,
    backgroundColor: '#F0FDFA',
  },
  modeIconCircle: {
    width: 36, height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  modeIconCircleSel: {
    backgroundColor: TEAL_LIGHT,
  },
  modeName:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  modeNameSel: { color: TEAL_DARK },
  modeDesc:    { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  modeRadio: {
    width: 20, height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modeRadioSel: { borderColor: TEAL },
  modeRadioDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: TEAL,
  },

  // Tags
  tagPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -4 },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagPillText: { fontSize: 12, fontWeight: '700' },

  // Live preview card (mirrors the club list card style)
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  previewIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  previewViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TEAL_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewViewText: {
    fontSize: 12,
    fontWeight: '800',
    color: TEAL_DARK,
  },
  previewDesc: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCountText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  previewJoinPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  previewJoinText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  previewBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 3,
    overflow: 'hidden',
  },
  previewBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Sticky bottom bar
  stickyBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 6 : 14,
  },
  createBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  createBtnDisabled: { shadowOpacity: 0 },
  createBtnGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
