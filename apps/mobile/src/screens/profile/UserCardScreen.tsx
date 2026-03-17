import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common';
import { useNavigationContext } from '@/contexts';
import { fetchProfile } from '@/api/profileApi';
import { useAuthStore } from '@/stores';
import { ProfileStackScreenProps } from '@/navigation/types';
import { User } from '@/types';
import {
  DEFAULT_USER_CARD_ORIENTATION,
  DEFAULT_USER_CARD_STYLE_ID,
  UserCardOrientation,
  UserCardStyleId,
  USER_CARD_ROLE_ICONS,
  USER_CARD_STYLES,
  formatUserCardDate,
  formatUserCardExpiry,
  formatUserCardNumber,
  formatUserCardVerificationCode,
  getUserCardStyleById,
  getUserRoleLabel,
} from '@/config/userCardStyles';
import {
  getUserCardOrientationPreference,
  getUserCardStylePreference,
  saveUserCardOrientationPreference,
  saveUserCardStylePreference,
} from '@/services/userCardPreferences';

type Props = ProfileStackScreenProps<'UserCard'>;
type CardSide = 'front' | 'back';

const QR_PATTERN = [
  '111110011111',
  '100010010001',
  '101010011101',
  '100010010001',
  '111110011111',
  '000001000000',
  '111101111011',
  '001001001001',
  '111101111011',
  '100001000001',
  '101111011101',
  '111000000111',
];

const HORIZONTAL_CARD_HEIGHT = 236;
const VERTICAL_CARD_HEIGHT = 392;

const formatPoints = (value?: number): string => `${(value ?? 0).toLocaleString('en-US')} XP`;

export default function UserCardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user: authUser } = useAuthStore();
  const { openSidebar } = useNavigationContext();

  const [profile, setProfile] = useState<User | null>(authUser);
  const [loading, setLoading] = useState(true);
  const [cardSide, setCardSide] = useState<CardSide>('front');
  const [selectedStyleId, setSelectedStyleId] = useState<UserCardStyleId>(DEFAULT_USER_CARD_STYLE_ID);
  const [selectedOrientation, setSelectedOrientation] = useState<UserCardOrientation>(DEFAULT_USER_CARD_ORIENTATION);

  const loadProfile = useCallback(async () => {
    try {
      const nextProfile = await fetchProfile('me');
      setProfile(nextProfile);
    } catch (error) {
      console.error('Failed to load user card profile:', error);
      if (!authUser) {
        Alert.alert(
          t('common.error', 'Error'),
          t('profile.userCard.loadFailed', 'Unable to load your ID card right now. Please try again.')
        );
      }
    } finally {
      setLoading(false);
    }
  }, [authUser, t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    Promise.all([getUserCardStylePreference(), getUserCardOrientationPreference()])
      .then(([styleId, orientation]) => {
        if (!mounted) return;
        setSelectedStyleId(styleId);
        setSelectedOrientation(orientation);
      })
      .catch((error) => {
        console.error('Failed to load card preferences on card screen:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const currentProfile = profile ?? authUser;
  const selectedCardStyle = useMemo(() => getUserCardStyleById(selectedStyleId), [selectedStyleId]);
  const isVertical = selectedOrientation === 'vertical';

  const fullName = useMemo(() => {
    if (!currentProfile) return '';
    return `${currentProfile.firstName} ${currentProfile.lastName}`.trim();
  }, [currentProfile]);

  const roleText = useMemo(
    () => getUserRoleLabel(currentProfile?.role ?? 'STUDENT', t),
    [currentProfile?.role, t]
  );

  const institutionName = useMemo(
    () => currentProfile?.school?.name || t('profile.userCard.defaultInstitution', 'Stunity Learning Network'),
    [currentProfile?.school?.name, t]
  );

  const memberSince = useMemo(
    () => formatUserCardDate(currentProfile?.createdAt),
    [currentProfile?.createdAt]
  );

  const expiresAt = useMemo(
    () => formatUserCardExpiry(currentProfile?.createdAt),
    [currentProfile?.createdAt]
  );

  const programLine = useMemo(() => {
    if (!currentProfile) return t('profile.userCard.member', 'Education Member');
    if (currentProfile.role === 'STUDENT') {
      return currentProfile.student?.class?.name
        ? `${t('profile.userCard.class', 'Class')}: ${currentProfile.student.class.name}`
        : t('profile.userCard.activeLearner', 'Active Learner');
    }
    if (currentProfile.role === 'TEACHER') {
      return currentProfile.teacher?.position
        || currentProfile.teacher?.degree
        || currentProfile.professionalTitle
        || t('profile.userCard.faculty', 'Faculty Member');
    }
    return currentProfile.professionalTitle || t('profile.userCard.community', 'Community Member');
  }, [currentProfile, t]);

  const cardNumber = useMemo(
    () => formatUserCardNumber(currentProfile?.id, currentProfile?.role ?? 'STUDENT'),
    [currentProfile?.id, currentProfile?.role]
  );

  const maskedCardNumber = useMemo(() => {
    const compact = cardNumber.replace(/\s/g, '');
    if (compact.length !== 16) return cardNumber;
    return `${compact.slice(0, 4)} •••• •••• ${compact.slice(-4)}`;
  }, [cardNumber]);

  const verificationCode = useMemo(
    () => formatUserCardVerificationCode(currentProfile?.id),
    [currentProfile?.id]
  );

  const pointsValue = useMemo(
    () => formatPoints(currentProfile?.totalPoints),
    [currentProfile?.totalPoints]
  );

  const roleIcon = useMemo(
    () => USER_CARD_ROLE_ICONS[currentProfile?.role ?? 'STUDENT'],
    [currentProfile?.role]
  );

  const backRows = useMemo(
    () => [
      { label: t('profile.userCard.role', 'Role'), value: roleText },
      { label: t('profile.userCard.program', 'Program'), value: programLine },
      { label: t('profile.userCard.memberSince', 'Member Since'), value: memberSince },
      { label: t('profile.userCard.expires', 'Expires'), value: expiresAt },
    ],
    [expiresAt, memberSince, programLine, roleText, t]
  );

  const handleShare = useCallback(async () => {
    if (!currentProfile) return;
    try {
      await Share.share({
        message: `${fullName} • ${roleText}\n${institutionName}\n${verificationCode}`,
      });
    } catch (error) {
      console.error('Failed to share card:', error);
      Alert.alert(t('common.error', 'Error'), t('profile.userCard.shareFailed', 'Unable to share this card right now.'));
    }
  }, [currentProfile, fullName, institutionName, roleText, t, verificationCode]);

  const handleStyleSelect = useCallback(async (styleId: UserCardStyleId) => {
    if (styleId === selectedStyleId) return;

    const previousStyleId = selectedStyleId;
    setSelectedStyleId(styleId);

    try {
      await saveUserCardStylePreference(styleId);
    } catch (error) {
      console.error('Failed to persist card style on card screen:', error);
      setSelectedStyleId(previousStyleId);
      Alert.alert(
        t('common.error', 'Error'),
        t('profile.userCard.styleSaveFailed', 'Could not save your card style. Please try again.')
      );
    }
  }, [selectedStyleId, t]);

  const handleOrientationSelect = useCallback(async (orientation: UserCardOrientation) => {
    if (orientation === selectedOrientation) return;

    const previousOrientation = selectedOrientation;
    setSelectedOrientation(orientation);

    try {
      await saveUserCardOrientationPreference(orientation);
    } catch (error) {
      console.error('Failed to persist card orientation on card screen:', error);
      setSelectedOrientation(previousOrientation);
      Alert.alert(
        t('common.error', 'Error'),
        t('profile.userCard.orientationSaveFailed', 'Could not save your layout. Please try again.')
      );
    }
  }, [selectedOrientation, t]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    loadProfile();
  }, [loadProfile]);

  const toggleSide = useCallback(() => {
    setCardSide((prev) => (prev === 'front' ? 'back' : 'front'));
  }, []);

  const renderBrandMark = () => (
    <View style={styles.brandMarkWrap}>
      <View style={styles.brandDotLeft} />
      <View style={styles.brandDotRight} />
    </View>
  );

  const renderAvatarCircle = (size: 'sm' | 'md' | 'lg' = 'md') => {
    const frameSize = size === 'lg' ? 84 : size === 'sm' ? 52 : 62;
    const avatarSize = size === 'lg' ? 'xl' : size;

    return (
      <View
        style={[
          styles.avatarFrame,
          {
            width: frameSize,
            height: frameSize,
            borderRadius: frameSize / 2,
            borderColor: selectedCardStyle.accent,
            backgroundColor: selectedCardStyle.panelTint,
          },
        ]}
      >
        <Avatar
          uri={currentProfile?.profilePictureUrl}
          name={fullName}
          size={avatarSize}
          showBorder={false}
          gradientBorder="none"
        />
      </View>
    );
  };

  const renderFrontHorizontal = () => (
    <View style={styles.cardContent}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.metricLabel, { color: selectedCardStyle.mutedForeground }]}>
            {t('profile.userCard.learningPoints', 'Learning Points')}
          </Text>
          <Text style={[styles.metricValue, { color: selectedCardStyle.foreground }]}>{pointsValue}</Text>
        </View>
        {renderBrandMark()}
      </View>

      <View style={styles.horizontalMiddle}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardNumberText, { color: selectedCardStyle.foreground }]}>{maskedCardNumber}</Text>
          <Text style={[styles.nameText, { color: selectedCardStyle.foreground }]} numberOfLines={1}>
            {fullName.toUpperCase()}
          </Text>
          <Text style={[styles.roleText, { color: selectedCardStyle.mutedForeground }]} numberOfLines={1}>
            {roleText}
          </Text>
        </View>
        {renderAvatarCircle('md')}
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.bottomLine, { color: selectedCardStyle.mutedForeground }]} numberOfLines={1}>
          {institutionName}
        </Text>
        <View style={[styles.codeChip, { backgroundColor: selectedCardStyle.panelTint }]}>
          <Text style={[styles.codeChipText, { color: selectedCardStyle.foreground }]}>
            {verificationCode.slice(-4)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderFrontVertical = () => (
    <View style={styles.cardContent}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.metricLabel, { color: selectedCardStyle.mutedForeground }]}>
            {t('profile.userCard.learningPoints', 'Learning Points')}
          </Text>
          <Text style={[styles.metricValue, { color: selectedCardStyle.foreground }]}>{pointsValue}</Text>
        </View>
        {renderBrandMark()}
      </View>

      <View style={styles.verticalCenter}>
        {renderAvatarCircle('lg')}
        <Text style={[styles.verticalNameText, { color: selectedCardStyle.foreground }]} numberOfLines={1}>
          {fullName}
        </Text>
        <Text style={[styles.verticalRoleText, { color: selectedCardStyle.mutedForeground }]} numberOfLines={1}>
          {roleText}
        </Text>
        <View style={[styles.programPill, { backgroundColor: selectedCardStyle.panelTint }]}>
          <Text style={[styles.programPillText, { color: selectedCardStyle.foreground }]} numberOfLines={2}>
            {programLine}
          </Text>
        </View>
      </View>

      <View>
        <Text style={[styles.cardNumberText, styles.verticalCardNumberText, { color: selectedCardStyle.foreground }]}>
          {maskedCardNumber}
        </Text>
        <View style={styles.verticalBottomRow}>
          <Text style={[styles.bottomLine, { color: selectedCardStyle.mutedForeground }]} numberOfLines={1}>
            {institutionName}
          </Text>
          <Text style={[styles.bottomLine, { color: selectedCardStyle.mutedForeground }]}>
            {expiresAt}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderQr = () => (
    <View style={[styles.qrGrid, { borderColor: selectedCardStyle.panelTint }]}>
      {QR_PATTERN.map((line, row) => (
        <View key={`row-${row}`} style={styles.qrRow}>
          {line.split('').map((bit, col) => (
            <View
              key={`cell-${row}-${col}`}
              style={[
                styles.qrCell,
                bit === '1'
                  ? { backgroundColor: selectedCardStyle.foreground }
                  : { backgroundColor: selectedCardStyle.panelTint },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );

  const renderBackHorizontal = () => (
    <View style={styles.cardContent}>
      <View style={[styles.backStrip, { backgroundColor: selectedCardStyle.panelTint }]} />

      <View style={styles.backHorizontalBody}>
        <View style={styles.backInfoColumn}>
          {backRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.backInfoRow,
                index === backRows.length - 1 && styles.backInfoRowLast,
                { borderColor: selectedCardStyle.panelTint },
              ]}
            >
              <Text style={[styles.backInfoLabel, { color: selectedCardStyle.mutedForeground }]}>{row.label}</Text>
              <Text style={[styles.backInfoValue, { color: selectedCardStyle.foreground }]} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.backRightColumn}>
          {renderAvatarCircle('sm')}
          {renderQr()}
          <Text style={[styles.qrLabel, { color: selectedCardStyle.foreground }]}>{verificationCode}</Text>
        </View>
      </View>

      <Text style={[styles.backFooterLine, { color: selectedCardStyle.mutedForeground }]}>
        {t('profile.userCard.digitalIdentity', 'Digital Education Identity')}
      </Text>
    </View>
  );

  const renderBackVertical = () => (
    <View style={styles.cardContent}>
      <View style={[styles.backStrip, { backgroundColor: selectedCardStyle.panelTint }]} />

      <View style={styles.backVerticalBody}>
        {renderAvatarCircle('sm')}

        <View style={styles.backInfoColumn}>
          {backRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.backInfoRow,
                index === backRows.length - 1 && styles.backInfoRowLast,
                { borderColor: selectedCardStyle.panelTint },
              ]}
            >
              <Text style={[styles.backInfoLabel, { color: selectedCardStyle.mutedForeground }]}>{row.label}</Text>
              <Text style={[styles.backInfoValue, { color: selectedCardStyle.foreground }]} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.backVerticalQrWrap}>
          {renderQr()}
          <Text style={[styles.qrLabel, { color: selectedCardStyle.foreground }]}>{verificationCode}</Text>
        </View>
      </View>

      <Text style={[styles.backFooterLine, { color: selectedCardStyle.mutedForeground }]}>
        {t('profile.userCard.digitalIdentity', 'Digital Education Identity')}
      </Text>
    </View>
  );

  if (loading || !currentProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#09CFF7" />
          <Text style={styles.loadingText}>{t('profile.userCard.loading', 'Loading your education card...')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.userCard.title', 'My Education Card')}</Text>
        <TouchableOpacity onPress={openSidebar} style={styles.headerIconBtn} activeOpacity={0.75}>
          <Ionicons name="menu-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingRow}>
          <Avatar uri={currentProfile.profilePictureUrl} name={fullName} size="md" showBorder={false} gradientBorder="none" />
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingTitle}>
              {t('profile.userCard.hello', 'Hello')}, {currentProfile.firstName}
            </Text>
            <Text style={styles.greetingSub}>{institutionName}</Text>
          </View>
          <View style={[styles.roleChip, { backgroundColor: selectedCardStyle.chipBackground }]}>
            <Ionicons name={roleIcon} size={14} color="#0F172A" />
            <Text style={styles.roleChipText}>{roleText}</Text>
          </View>
        </View>

        <View style={styles.controlsSection}>
          <Text style={styles.controlsTitle}>{t('profile.userCard.viewMode', 'Card View')}</Text>
          <View style={styles.switchRow}>
            <TouchableOpacity
              style={[styles.switchButton, cardSide === 'front' && styles.switchButtonActive]}
              onPress={() => setCardSide('front')}
              activeOpacity={0.82}
            >
              <Text style={[styles.switchButtonText, cardSide === 'front' && styles.switchButtonTextActive]}>
                {t('profile.userCard.front', 'Front')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchButton, cardSide === 'back' && styles.switchButtonActive]}
              onPress={() => setCardSide('back')}
              activeOpacity={0.82}
            >
              <Text style={[styles.switchButtonText, cardSide === 'back' && styles.switchButtonTextActive]}>
                {t('profile.userCard.back', 'Back')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.controlsTitle}>{t('profile.userCard.orientation', 'Orientation')}</Text>
          <View style={styles.orientationRow}>
            <TouchableOpacity
              style={[
                styles.orientationOption,
                selectedOrientation === 'horizontal' && styles.orientationOptionActive,
              ]}
              onPress={() => handleOrientationSelect('horizontal')}
              activeOpacity={0.82}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={16}
                color={selectedOrientation === 'horizontal' ? '#0F172A' : '#64748B'}
              />
              <Text style={[
                styles.orientationOptionText,
                selectedOrientation === 'horizontal' && styles.orientationOptionTextActive,
              ]}
              >
                {t('profile.userCard.horizontal', 'Horizontal')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.orientationOption,
                selectedOrientation === 'vertical' && styles.orientationOptionActive,
              ]}
              onPress={() => handleOrientationSelect('vertical')}
              activeOpacity={0.82}
            >
              <Ionicons
                name="swap-vertical-outline"
                size={16}
                color={selectedOrientation === 'vertical' ? '#0F172A' : '#64748B'}
              />
              <Text style={[
                styles.orientationOptionText,
                selectedOrientation === 'vertical' && styles.orientationOptionTextActive,
              ]}
              >
                {t('profile.userCard.vertical', 'Vertical')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.styleSelectorSection}>
          <Text style={styles.styleSelectorTitle}>{t('profile.userCard.chooseStyle', 'Choose Card Style')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.styleOptionsRow}
          >
            {USER_CARD_STYLES.map((styleOption) => {
              const isSelected = styleOption.id === selectedStyleId;

              return (
                <TouchableOpacity
                  key={styleOption.id}
                  style={[
                    styles.styleOption,
                    isSelected && [styles.styleOptionActive, { borderColor: styleOption.outline }],
                  ]}
                  onPress={() => handleStyleSelect(styleOption.id)}
                  activeOpacity={0.82}
                >
                  <LinearGradient colors={styleOption.gradient} style={styles.styleSwatch} />
                  <Text style={[styles.styleOptionText, isSelected && styles.styleOptionTextActive]}>
                    {t(styleOption.labelKey, styleOption.fallbackLabel)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.flipButton} onPress={toggleSide} activeOpacity={0.82}>
          <Ionicons name="sync-outline" size={16} color="#0F172A" />
          <Text style={styles.flipButtonText}>
            {cardSide === 'front'
              ? t('profile.userCard.showBack', 'Show Back Side')
              : t('profile.userCard.showFront', 'Show Front Side')}
          </Text>
        </TouchableOpacity>

        <View style={[styles.cardViewport, isVertical && styles.cardViewportVertical]}>
          <LinearGradient
            colors={selectedCardStyle.gradient}
            style={[
              styles.cardSurface,
              isVertical ? styles.cardSurfaceVertical : styles.cardSurfaceHorizontal,
            ]}
          >
            <View style={[styles.softOrbOne, { backgroundColor: selectedCardStyle.panelTint }]} />
            <View style={[styles.softOrbTwo, { backgroundColor: selectedCardStyle.panelTint }]} />

            {cardSide === 'front'
              ? (isVertical ? renderFrontVertical() : renderFrontHorizontal())
              : (isVertical ? renderBackVertical() : renderBackHorizontal())}
          </LinearGradient>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={20} color="#2563EB" />
            <Text style={styles.actionTitle}>{t('profile.userCard.share', 'Share Card')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={20} color="#9333EA" />
            <Text style={styles.actionTitle}>{t('profile.userCard.edit', 'Edit Details')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
            <Text style={styles.actionTitle}>{t('profile.userCard.security', 'Security')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={handleRefresh} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={20} color="#D97706" />
            <Text style={styles.actionTitle}>{t('profile.userCard.refresh', 'Refresh')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  greetingRow: {
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  greetingSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  roleChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roleChipText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  controlsSection: {
    marginBottom: 12,
  },
  controlsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  switchButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  switchButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  switchButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  switchButtonTextActive: {
    color: '#0F172A',
  },
  orientationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 2,
  },
  orientationOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  orientationOptionActive: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  orientationOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  orientationOptionTextActive: {
    color: '#0F172A',
  },
  styleSelectorSection: {
    marginBottom: 10,
  },
  styleSelectorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  styleOptionsRow: {
    gap: 8,
    paddingRight: 6,
  },
  styleOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 8,
    minWidth: 108,
  },
  styleOptionActive: {
    borderWidth: 1.6,
  },
  styleSwatch: {
    height: 34,
    borderRadius: 8,
  },
  styleOptionText: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  styleOptionTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  flipButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  flipButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardViewport: {
    marginBottom: 14,
  },
  cardViewportVertical: {
    alignItems: 'center',
  },
  cardSurface: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardSurfaceHorizontal: {
    height: HORIZONTAL_CARD_HEIGHT,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  cardSurfaceVertical: {
    width: 252,
    height: VERTICAL_CARD_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  softOrbOne: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 999,
    top: -96,
    left: -80,
  },
  softOrbTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    bottom: -96,
    right: -78,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    marginTop: 4,
    fontSize: 33,
    fontWeight: '800',
    lineHeight: 36,
  },
  brandMarkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandDotLeft: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    opacity: 0.95,
  },
  brandDotRight: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    marginLeft: -8,
    opacity: 0.95,
  },
  avatarFrame: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  cardNumberText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  verticalCardNumberText: {
    textAlign: 'center',
    fontSize: 15,
    letterSpacing: 1,
  },
  nameText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  roleText: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
  verticalCenter: {
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  verticalNameText: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
  },
  verticalRoleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  programPill: {
    marginTop: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 42,
    justifyContent: 'center',
    width: '100%',
  },
  programPillText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bottomLine: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  verticalBottomRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  codeChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  codeChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  backStrip: {
    height: 30,
    borderRadius: 8,
  },
  backHorizontalBody: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
    marginTop: 10,
  },
  backVerticalBody: {
    flex: 1,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backInfoColumn: {
    flex: 1,
    width: '100%',
  },
  backInfoRow: {
    borderBottomWidth: 1,
    paddingVertical: 6,
    gap: 2,
  },
  backInfoRowLast: {
    borderBottomWidth: 0,
  },
  backInfoLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  backInfoValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  backRightColumn: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  backVerticalQrWrap: {
    alignItems: 'center',
  },
  qrGrid: {
    borderWidth: 1,
    padding: 7,
    borderRadius: 10,
  },
  qrRow: {
    flexDirection: 'row',
  },
  qrCell: {
    width: 5,
    height: 5,
    margin: 1,
    borderRadius: 1,
  },
  qrLabel: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  backFooterLine: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
  },
  actionsGrid: {
    marginTop: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48.5%',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 7,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
});
