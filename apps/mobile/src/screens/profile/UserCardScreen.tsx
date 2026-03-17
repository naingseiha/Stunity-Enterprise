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
  DEFAULT_USER_CARD_DESIGN_ID,
  DEFAULT_USER_CARD_ORIENTATION,
  DEFAULT_USER_CARD_STYLE_ID,
  USER_CARD_DESIGNS,
  UserCardDesignId,
  UserCardOrientation,
  UserCardStyleId,
  USER_CARD_ROLE_ICONS,
  USER_CARD_STYLES,
  formatUserCardExpiry,
  formatUserCardNumber,
  formatUserCardVerificationCode,
  getUserCardStyleById,
  getUserRoleLabel,
} from '@/config/userCardStyles';
import {
  getUserCardDesignPreference,
  getUserCardOrientationPreference,
  getUserCardStylePreference,
  saveUserCardDesignPreference,
  saveUserCardOrientationPreference,
  saveUserCardStylePreference,
} from '@/services/userCardPreferences';
import StunityLogo from '../../../assets/Stunity.svg';

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

const CARD_ASPECT_RATIO = 1.586; // Standard CR80 ID card aspect ratio (3.375 / 2.125)
const VERTICAL_CARD_ASPECT_RATIO = 1 / CARD_ASPECT_RATIO;

export default function UserCardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user: authUser } = useAuthStore();
  const { openSidebar } = useNavigationContext();

  const [profile, setProfile] = useState<User | null>(authUser);
  const [loading, setLoading] = useState(true);
  const [cardSide, setCardSide] = useState<CardSide>('front');
  const [selectedDesignId, setSelectedDesignId] = useState<UserCardDesignId>(DEFAULT_USER_CARD_DESIGN_ID);
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

    Promise.all([
      getUserCardStylePreference(),
      getUserCardOrientationPreference(),
      getUserCardDesignPreference(),
    ])
      .then(([styleId, orientation, designId]) => {
        if (!mounted) return;
        setSelectedStyleId(styleId);
        setSelectedOrientation(orientation);
        setSelectedDesignId(designId);
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

  const roleIcon = useMemo(
    () => USER_CARD_ROLE_ICONS[currentProfile?.role ?? 'STUDENT'],
    [currentProfile?.role]
  );

  const isPrimaryCardTemplate = selectedStyleId === DEFAULT_USER_CARD_STYLE_ID;
  const isWaveDesign = selectedDesignId === 'wave';
  const isPrismDesign = selectedDesignId === 'prism';
  const isLuxeDesign = selectedDesignId === 'luxe';
  const horizontalAccentColor = isPrimaryCardTemplate ? '#16A34A' : selectedCardStyle.outline;
  const horizontalAccentSoft = isPrimaryCardTemplate ? 'rgba(22, 163, 74, 0.14)' : 'rgba(15, 23, 42, 0.06)';
  const wavePrimaryColor = selectedCardStyle.outline;
  const waveSecondaryColor = selectedCardStyle.accent;
  const prismPrimaryColor = selectedCardStyle.outline;
  const prismSecondaryColor = selectedCardStyle.accent;
  const prismTertiaryColor = selectedCardStyle.gradient[1];
  const prismQuaternaryColor = selectedCardStyle.gradient[2];
  const luxePrimaryColor = selectedCardStyle.outline;
  const luxeSecondaryColor = selectedCardStyle.gradient[1];
  const luxeTertiaryColor = selectedCardStyle.gradient[2];
  const cardLastFour = useMemo(() => {
    const compact = cardNumber.replace(/\s/g, '');
    return compact.slice(-4).padStart(4, '0');
  }, [cardNumber]);
  const employeeNumber = useMemo(() => {
    const compact = cardNumber.replace(/\s/g, '');
    return `${compact.slice(0, 3)}-${compact.slice(3, 10)}`;
  }, [cardNumber]);

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

  const handleDesignSelect = useCallback(async (designId: UserCardDesignId) => {
    if (designId === selectedDesignId) return;

    const previousDesignId = selectedDesignId;
    setSelectedDesignId(designId);

    try {
      await saveUserCardDesignPreference(designId);
    } catch (error) {
      console.error('Failed to persist card design on card screen:', error);
      setSelectedDesignId(previousDesignId);
      Alert.alert(
        t('common.error', 'Error'),
        t('profile.userCard.designSaveFailed', 'Could not save your card style. Please try again.')
      );
    }
  }, [selectedDesignId, t]);

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
    <View style={[styles.horizontalCardBase, { aspectRatio: CARD_ASPECT_RATIO }]}>
      <View style={[styles.horizontalFrontEdgeAccent, { backgroundColor: horizontalAccentColor }]} />

      <View style={styles.horizontalBottomStrip}>
        <View style={styles.barcodeColumn}>
          <View style={styles.barcodeWrap}>
            {Array.from({ length: 42 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.barcodeBar,
                  {
                    width: i % 5 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
                    marginRight: i % 3 === 0 ? 2 : 1,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.horizontalIdText, { color: horizontalAccentColor }]}>
            ID. {cardNumber.replace(/\s/g, '').slice(0, 10).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.horizontalMainContent}>
        <View style={styles.horizontalHeader}>
          <View style={[styles.classicBrandBadge, { borderColor: horizontalAccentColor }]}>
            <StunityLogo width={68} height={18} />
          </View>
          <View style={styles.horizontalTitleWrap}>
            <Text
              style={[styles.horizontalTitleText, styles.classicTitleText, { color: horizontalAccentColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {institutionName.toUpperCase()}
            </Text>
            <View style={[styles.horizontalTitleUnderline, styles.classicTitleUnderline, { backgroundColor: horizontalAccentColor }]} />
          </View>
        </View>

        <View style={styles.horizontalBody}>
          <View style={styles.horizontalInfoRowWrapper}>
            <View style={styles.horizontalInfoRow}>
              <Text style={styles.horizontalLabelText}>{t('profile.userCard.name', 'Name')}</Text>
              <Text style={styles.horizontalLabelColonText}>:</Text>
              <Text style={styles.horizontalValueText} numberOfLines={1}>{fullName}</Text>
            </View>

            <View style={styles.horizontalInfoRow}>
              <Text style={styles.horizontalLabelText}>{t('profile.userCard.program', 'Program')}</Text>
              <Text style={styles.horizontalLabelColonText}>:</Text>
              <Text style={styles.horizontalValueText} numberOfLines={2}>{programLine}</Text>
            </View>

            <View style={styles.horizontalInfoRow}>
              <Text style={styles.horizontalLabelText}>{t('profile.userCard.session', 'Session')}</Text>
              <Text style={styles.horizontalLabelColonText}>:</Text>
              <Text style={styles.horizontalValueText} numberOfLines={1}>{new Date(currentProfile?.createdAt || new Date()).getFullYear()}</Text>
            </View>

            <View style={styles.horizontalInfoRow}>
              <Text style={styles.horizontalLabelText}>{t('profile.userCard.mobile', 'Mobile')}</Text>
              <Text style={styles.horizontalLabelColonText}>:</Text>
              <Text style={styles.horizontalValueText} numberOfLines={1}>{currentProfile?.phone || '01XXXXXXX'}</Text>
            </View>

            <View style={styles.horizontalInfoRow}>
              <Text style={styles.horizontalLabelText}>{t('profile.userCard.validity', 'Validity')}</Text>
              <Text style={styles.horizontalLabelColonText}>:</Text>
              <Text style={styles.horizontalValueText} numberOfLines={1}>{expiresAt}</Text>
            </View>
          </View>

          <View style={styles.horizontalAvatarWrap}>
            <View style={styles.horizontalAvatarFrame}>
              <Avatar
                uri={currentProfile?.profilePictureUrl}
                name={fullName}
                size="2xl"
                style={styles.horizontalAvatarImage}
                showBorder={false}
                gradientBorder="none"
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFrontVertical = () => (
    <View style={styles.verticalPremiumBase}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F0FF', '#EEF7FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.prismCanvas}
      />
      <View style={styles.verticalPremiumCornerWrap}>
        <View style={[styles.verticalPremiumShapeA, { backgroundColor: selectedCardStyle.outline }]} />
        <View style={[styles.verticalPremiumShapeB, { backgroundColor: selectedCardStyle.gradient[1] }]} />
        <View style={[styles.verticalPremiumShapeC, { backgroundColor: selectedCardStyle.accent }]} />
      </View>

      <View style={styles.verticalFrontContent}>
        <View style={styles.verticalFrontHeaderRow}>
          <StunityLogo width={88} height={24} />
          <Text style={styles.verticalFrontHeaderSub}>
            {t('profile.userCard.educationCard', 'EDUCATION CARD')}
          </Text>
        </View>

        <View style={styles.verticalFrontIdentityWrap}>
          <View style={[styles.verticalFrontAvatarFrame, { borderColor: selectedCardStyle.outline }]}>
            <Avatar
              uri={currentProfile?.profilePictureUrl}
              name={fullName}
              size="2xl"
              showBorder={false}
              gradientBorder="none"
            />
          </View>
        </View>

        <View style={styles.verticalFrontFooter}>
          <Text style={styles.verticalFrontProgramLabel}>
            {t('profile.userCard.cardholder', 'Cardholder')}
          </Text>
          <Text style={styles.verticalFrontName} numberOfLines={1}>
            {fullName.toUpperCase()}
          </Text>
          <Text style={styles.verticalFrontRole} numberOfLines={1}>
            {roleText}
          </Text>
          <Text style={styles.verticalFrontCardNumber}>
            {`\u2022 \u2022 \u2022 \u2022  ${cardLastFour}`}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderQr = (colorOverride?: string, scale: number = 1) => {
    const mainColor = colorOverride || selectedCardStyle.foreground;
    const bgColor = colorOverride ? 'transparent' : selectedCardStyle.panelTint;
    return (
      <View style={[styles.qrGrid, colorOverride ? { borderWidth: 0, padding: 0 } : { borderColor: selectedCardStyle.panelTint }, { transform: [{ scale }] }]}>
        {QR_PATTERN.map((line, row) => (
          <View key={`row-${row}`} style={styles.qrRow}>
            {line.split('').map((bit, col) => (
              <View
                key={`cell-${row}-${col}`}
                style={[
                  styles.qrCell,
                  bit === '1'
                    ? { backgroundColor: mainColor }
                    : { backgroundColor: bgColor },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderBackHorizontal = () => (
    <View style={[styles.horizontalCardBase, { aspectRatio: CARD_ASPECT_RATIO }]}>
      <View style={[styles.backHorizontalTopBand, { backgroundColor: horizontalAccentSoft }]} />
      <View style={styles.backHorizontalContent}>
        <View style={styles.backHorizontalHeader}>
          <View style={[styles.classicBrandBadge, { borderColor: horizontalAccentColor }]}>
            <StunityLogo width={68} height={18} />
          </View>
          <Text
            style={[styles.backHorizontalInstituteText, { color: horizontalAccentColor }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {institutionName.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.backHorizontalDesc} numberOfLines={2}>
          {t('profile.userCard.digitalIdentityDesc', 'This digital identity card is strictly for institutional use. If found, please return it to the administration office or contact the university.')}
        </Text>

        <View style={styles.backHorizontalBottom}>
          <View style={styles.qrFramedWrap}>
            <View style={[styles.qrCornerTopLeft, { borderColor: horizontalAccentColor }]} />
            <View style={[styles.qrCornerTopRight, { borderColor: horizontalAccentColor }]} />
            <View style={[styles.qrCornerBottomLeft, { borderColor: horizontalAccentColor }]} />
            <View style={[styles.qrCornerBottomRight, { borderColor: horizontalAccentColor }]} />
            <View style={styles.backQrInner}>
              {renderQr('#0F172A', 0.6)}
            </View>
          </View>

          <View style={styles.signatureWrap}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{t('profile.userCard.authorizeSignature', 'Authorize Signature')}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFrontHorizontalWave = () => (
    <View style={[styles.horizontalCardBase, { aspectRatio: CARD_ASPECT_RATIO }]}>
      <View style={styles.prismCanvas} />
      <View style={styles.wavePremiumCornerWrap}>
        <View style={[styles.wavePremiumBlobOne, { backgroundColor: wavePrimaryColor }]} />
        <View style={[styles.wavePremiumBlobTwo, { backgroundColor: prismTertiaryColor }]} />
        <View style={[styles.wavePremiumBlobThree, { backgroundColor: waveSecondaryColor }]} />
        <View style={[styles.wavePremiumBlobFour, { backgroundColor: prismQuaternaryColor }]} />
      </View>

      <View style={styles.prismFrontHeader}>
        <StunityLogo width={96} height={24} />
        <Text style={styles.prismFrontTopRight}>{t('profile.userCard.educationCard', 'EDUCATION CARD')}</Text>
      </View>

      <View style={[styles.wavePremiumProfileFrame, { borderColor: wavePrimaryColor }]}>
        <Avatar
          uri={currentProfile?.profilePictureUrl}
          name={fullName}
          size="xl"
          showBorder={false}
          gradientBorder="none"
        />
      </View>

      <View style={styles.prismFrontBottom}>
        <Text style={styles.prismFrontHolderLabel}>{t('profile.userCard.cardholder', 'Cardholder')}</Text>
        <Text style={styles.prismFrontHolderName} numberOfLines={1}>{fullName.toUpperCase()}</Text>
        <Text style={styles.prismFrontCardDigits}>{`\u2022 \u2022 \u2022 \u2022  ${cardLastFour}`}</Text>
      </View>
    </View>
  );

  const renderBackHorizontalWave = () => {
    return (
      <View style={[styles.horizontalCardBase, { aspectRatio: CARD_ASPECT_RATIO }]}>
        <View style={styles.prismCanvas} />
        <View style={styles.wavePremiumCornerWrap}>
          <View style={[styles.wavePremiumBlobOne, { backgroundColor: wavePrimaryColor }]} />
          <View style={[styles.wavePremiumBlobTwo, { backgroundColor: prismTertiaryColor }]} />
          <View style={[styles.wavePremiumBlobThree, { backgroundColor: waveSecondaryColor }]} />
          <View style={[styles.wavePremiumBlobFour, { backgroundColor: prismQuaternaryColor }]} />
        </View>

        <View style={styles.prismBackContent}>
          <View style={styles.prismBackHeader}>
            <StunityLogo width={84} height={22} />
            <Text style={styles.prismBackCode}>{verificationCode}</Text>
          </View>

          <Text style={styles.prismBackStatement} numberOfLines={2}>
            {t(
              'profile.userCard.prismBackStatement',
              'Authorized education identity card. Keep secure and return to administration if found.'
            )}
          </Text>

          <View style={styles.prismBackMetaRow}>
            <Text style={styles.prismBackMetaText} numberOfLines={1}>
              {t('profile.userCard.idNo', 'ID NO')}: {employeeNumber}
            </Text>
            <Text style={styles.prismBackMetaText} numberOfLines={1}>
              {t('profile.userCard.validUntil', 'Valid Until')}: {expiresAt}
            </Text>
          </View>

          <View style={styles.waveBackSignRow}>
            <View style={[styles.waveBackCleanQrFrame, { borderColor: wavePrimaryColor }]}>
              {renderQr('#0F172A', 0.52)}
            </View>

            <View style={styles.waveBackSignArea}>
              <Text style={styles.waveBackSignHint}>{t('profile.userCard.signHere', 'Sign Here')}</Text>
              <View style={styles.waveBackSignLine} />
              <Text style={styles.waveBackSignLabel}>
                {t('profile.userCard.authorizeSignature', 'Authorize Signature')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFrontHorizontalPrism = () => (
    <View style={[styles.horizontalCardBase, { aspectRatio: CARD_ASPECT_RATIO }]}>
      <View style={styles.prismCanvas} />
      <View style={styles.prismCornerWrap}>
        <View style={[styles.prismShapeA, { backgroundColor: prismPrimaryColor }]} />
        <View style={[styles.prismShapeB, { backgroundColor: prismSecondaryColor }]} />
        <View style={[styles.prismShapeC, { backgroundColor: prismTertiaryColor }]} />
        <View style={[styles.prismShapeD, { backgroundColor: prismQuaternaryColor }]} />
      </View>

      <View style={styles.prismFrontHeader}>
        <StunityLogo width={96} height={24} />
        <Text style={styles.prismFrontTopRight}>{t('profile.userCard.educationCard', 'EDUCATION CARD')}</Text>
      </View>

      <View style={styles.prismFrontBottom}>
        <Text style={styles.prismFrontHolderLabel}>{t('profile.userCard.cardholder', 'Cardholder')}</Text>
        <Text style={styles.prismFrontHolderName} numberOfLines={1}>{fullName.toUpperCase()}</Text>
        <Text style={styles.prismFrontCardDigits}>{`\u2022 \u2022 \u2022 \u2022  ${cardLastFour}`}</Text>
      </View>
    </View>
  );

  const renderBackHorizontalPrism = () => (
    <View style={[styles.horizontalCardBase, { aspectRatio: CARD_ASPECT_RATIO }]}>
      <View style={styles.prismCanvas} />
      <View style={styles.prismCornerWrap}>
        <View style={[styles.prismShapeA, { backgroundColor: prismPrimaryColor }]} />
        <View style={[styles.prismShapeB, { backgroundColor: prismSecondaryColor }]} />
        <View style={[styles.prismShapeC, { backgroundColor: prismTertiaryColor }]} />
        <View style={[styles.prismShapeD, { backgroundColor: prismQuaternaryColor }]} />
      </View>

      <View style={styles.prismBackContent}>
        <View style={styles.prismBackHeader}>
          <StunityLogo width={84} height={22} />
          <Text style={styles.prismBackCode}>{verificationCode}</Text>
        </View>

        <Text style={styles.prismBackStatement} numberOfLines={2}>
          {t(
            'profile.userCard.prismBackStatement',
            'Authorized education identity card. Keep secure and return to administration if found.'
          )}
        </Text>

        <View style={styles.prismBackMetaRow}>
          <Text style={styles.prismBackMetaText} numberOfLines={1}>
            {t('profile.userCard.idNo', 'ID NO')}: {employeeNumber}
          </Text>
          <Text style={styles.prismBackMetaText} numberOfLines={1}>
            {t('profile.userCard.validUntil', 'Valid Until')}: {expiresAt}
          </Text>
        </View>

        <View style={styles.prismBackSignWrap}>
          <Text style={styles.prismBackSignHint}>{t('profile.userCard.signHere', 'Sign Here')}</Text>
          <View style={styles.prismBackSignLine} />
          <Text style={styles.prismBackSignLabel}>{t('profile.userCard.authorizeSignature', 'Authorize Signature')}</Text>
        </View>
      </View>
    </View>
  );

  const renderFrontHorizontalLuxe = () => (
    <View style={[styles.horizontalCardBase, { aspectRatio: CARD_ASPECT_RATIO }]}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F0FF', '#EEF7FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.prismCanvas}
      />
      <View style={styles.luxeTopGlow} />
      <View style={styles.luxeBottomGlow} />
      <View style={styles.luxeCornerWrap}>
        <View style={[styles.luxeShapeOne, { backgroundColor: luxePrimaryColor }]} />
        <View style={[styles.luxeShapeTwo, { backgroundColor: luxeSecondaryColor }]} />
        <View style={[styles.luxeShapeThree, { backgroundColor: luxeTertiaryColor }]} />
        <View style={[styles.luxeShapeFour, { backgroundColor: selectedCardStyle.accent }]} />
      </View>

      <View style={styles.prismFrontHeader}>
        <StunityLogo width={96} height={24} />
        <Text style={styles.prismFrontTopRight}>{t('profile.userCard.educationCard', 'EDUCATION CARD')}</Text>
      </View>

      <View style={[styles.wavePremiumProfileFrame, { borderColor: luxePrimaryColor }]}>
        <Avatar
          uri={currentProfile?.profilePictureUrl}
          name={fullName}
          size="xl"
          showBorder={false}
          gradientBorder="none"
        />
      </View>

      <View style={styles.prismFrontBottom}>
        <Text style={styles.prismFrontHolderLabel}>{t('profile.userCard.cardholder', 'Cardholder')}</Text>
        <Text style={styles.prismFrontHolderName} numberOfLines={1}>{fullName.toUpperCase()}</Text>
        <Text style={styles.prismFrontCardDigits}>{`\u2022 \u2022 \u2022 \u2022  ${cardLastFour}`}</Text>
      </View>
    </View>
  );

  const renderBackHorizontalLuxe = () => (
    <View style={[styles.horizontalCardBase, { aspectRatio: CARD_ASPECT_RATIO }]}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F0FF', '#EEF7FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.prismCanvas}
      />
      <View style={styles.luxeTopGlow} />
      <View style={styles.luxeBottomGlow} />
      <View style={styles.luxeCornerWrap}>
        <View style={[styles.luxeShapeOne, { backgroundColor: luxePrimaryColor }]} />
        <View style={[styles.luxeShapeTwo, { backgroundColor: luxeSecondaryColor }]} />
        <View style={[styles.luxeShapeThree, { backgroundColor: luxeTertiaryColor }]} />
        <View style={[styles.luxeShapeFour, { backgroundColor: selectedCardStyle.accent }]} />
      </View>

      <View style={styles.prismBackContent}>
        <View style={styles.prismBackHeader}>
          <StunityLogo width={84} height={22} />
          <Text style={styles.prismBackCode}>{verificationCode}</Text>
        </View>

        <Text style={styles.prismBackStatement} numberOfLines={2}>
          {t(
            'profile.userCard.prismBackStatement',
            'Authorized education identity card. Keep secure and return to administration if found.'
          )}
        </Text>

        <View style={styles.prismBackMetaRow}>
          <Text style={styles.prismBackMetaText} numberOfLines={1}>
            {t('profile.userCard.idNo', 'ID NO')}: {employeeNumber}
          </Text>
          <Text style={styles.prismBackMetaText} numberOfLines={1}>
            {t('profile.userCard.validUntil', 'Valid Until')}: {expiresAt}
          </Text>
        </View>

        <View style={styles.luxeBackFooterRow}>
          <View style={[styles.luxeBackQrFrame, { borderColor: luxePrimaryColor }]}>
            {renderQr('#0F172A', 0.5)}
          </View>

          <View style={styles.luxeBackSignWrap}>
            <Text style={styles.prismBackSignHint}>{t('profile.userCard.signHere', 'Sign Here')}</Text>
            <View style={[styles.prismBackSignLine, styles.luxeBackSignLine]} />
            <Text style={styles.prismBackSignLabel}>{t('profile.userCard.authorizeSignature', 'Authorize Signature')}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderBackVertical = () => (
    <View style={styles.verticalPremiumBase}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F0FF', '#EEF7FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.prismCanvas}
      />
      <View style={styles.verticalPremiumCornerWrap}>
        <View style={[styles.verticalPremiumShapeA, { backgroundColor: selectedCardStyle.outline }]} />
        <View style={[styles.verticalPremiumShapeB, { backgroundColor: selectedCardStyle.gradient[1] }]} />
        <View style={[styles.verticalPremiumShapeC, { backgroundColor: selectedCardStyle.accent }]} />
      </View>

      <View style={styles.verticalBackContent}>
        <View style={styles.verticalBackHeaderRow}>
          <StunityLogo width={86} height={22} />
          <Text style={styles.verticalBackCode}>{verificationCode}</Text>
        </View>

        <Text style={styles.verticalBackStatement} numberOfLines={2}>
          {t(
            'profile.userCard.prismBackStatement',
            'Authorized education identity card. Keep secure and return to administration if found.'
          )}
        </Text>

        <View style={styles.verticalBackMetaWrap}>
          <Text style={styles.verticalBackMetaText} numberOfLines={1}>
            {t('profile.userCard.idNo', 'ID NO')}: {employeeNumber}
          </Text>
          <Text style={styles.verticalBackMetaText} numberOfLines={1}>
            {t('profile.userCard.validUntil', 'Valid Until')}: {expiresAt}
          </Text>
        </View>

        <View style={styles.verticalBackBottomPanel}>
          <View style={[styles.verticalBackQrFrame, { borderColor: selectedCardStyle.outline }]}>
            {renderQr('#0F172A', 0.58)}
          </View>

          <View style={styles.verticalBackSignWrap}>
            <Text style={styles.verticalBackSignHint}>
              {t('profile.userCard.signHere', 'Sign Here')}
            </Text>
            <View style={styles.verticalBackSignLine} />
            <Text style={styles.verticalBackSignLabel}>
              {t('profile.userCard.authorizeSignature', 'Authorize Signature')}
            </Text>
          </View>
        </View>
      </View>
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
          <Avatar uri={currentProfile?.profilePictureUrl} name={fullName} size="md" showBorder={false} gradientBorder="none" />
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingTitle}>
              {t('profile.userCard.hello', 'Hello')}, {currentProfile?.firstName}
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
          <Text style={styles.styleSelectorTitle}>{t('profile.userCard.chooseDesign', 'Choose Card Style')}</Text>
          <View style={styles.designOptionsRow}>
            {USER_CARD_DESIGNS.map((designOption) => {
              const isSelected = designOption.id === selectedDesignId;

              return (
                <TouchableOpacity
                  key={designOption.id}
                  style={[
                    styles.designOption,
                    isSelected && styles.designOptionActive,
                  ]}
                  onPress={() => handleDesignSelect(designOption.id)}
                  activeOpacity={0.82}
                >
                  <View style={styles.designOptionHeader}>
                    <Ionicons
                      name={designOption.icon}
                      size={14}
                      color={isSelected ? '#0F172A' : '#64748B'}
                    />
                    <Text style={[styles.designOptionText, isSelected && styles.designOptionTextActive]}>
                      {t(designOption.labelKey, designOption.fallbackLabel)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.styleSelectorSection}>
          <Text style={styles.styleSelectorTitle}>{t('profile.userCard.chooseColor', 'Choose Color Theme')}</Text>
          <View style={styles.styleOptionsRow}>
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
                    accessibilityRole="button"
                    accessibilityLabel={t(styleOption.labelKey, styleOption.fallbackLabel)}
                  >
                    <LinearGradient colors={styleOption.gradient} style={styles.styleOptionDot} />
                    {isSelected ? (
                      <View style={[styles.styleOptionCheck, { backgroundColor: styleOption.outline }]}>
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
              );
            })}
          </View>
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
          <View
            style={[
              styles.cardViewportGlow,
              isVertical ? styles.cardViewportGlowVertical : styles.cardViewportGlowHorizontal,
              {
                backgroundColor: `${selectedCardStyle.outline}30`,
                shadowColor: selectedCardStyle.outline,
              },
            ]}
          >
            {isVertical ? (
              <View style={[styles.cardSurface, styles.cardSurfaceVertical, styles.verticalCardSurface]}>
                {cardSide === 'front' ? renderFrontVertical() : renderBackVertical()}
              </View>
            ) : (
              <View style={[styles.cardSurface, styles.cardSurfaceHorizontal]}>
                {cardSide === 'front'
                  ? (isWaveDesign
                    ? renderFrontHorizontalWave()
                    : isPrismDesign
                      ? renderFrontHorizontalPrism()
                      : isLuxeDesign
                        ? renderFrontHorizontalLuxe()
                      : renderFrontHorizontal())
                  : (isWaveDesign
                    ? renderBackHorizontalWave()
                    : isPrismDesign
                      ? renderBackHorizontalPrism()
                      : isLuxeDesign
                        ? renderBackHorizontalLuxe()
                      : renderBackHorizontal())}
              </View>
            )}
          </View>
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
    color: '#0F172A',
    marginBottom: 8,
  },
  designOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  designOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  designOptionActive: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  designOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  designOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  designOptionTextActive: {
    color: '#0F172A',
  },
  styleOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  styleOption: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.6,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleOptionActive: {
    borderWidth: 2.2,
    backgroundColor: '#FFFFFF',
  },
  styleOptionDot: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.24)',
  },
  styleOptionCheck: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 14,
    height: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
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
  cardViewportGlow: {
    borderRadius: 24,
    padding: 1.2,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardViewportGlowHorizontal: {
    width: '100%',
  },
  cardViewportGlowVertical: {
    alignSelf: 'center',
  },
  cardSurface: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardSurfaceHorizontal: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardSurfaceVertical: {
    width: 252,
    aspectRatio: VERTICAL_CARD_ASPECT_RATIO,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  verticalCardSurface: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  verticalPremiumBase: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  verticalPremiumCornerWrap: {
    position: 'absolute',
    right: -46,
    bottom: -50,
    width: 220,
    height: 180,
  },
  verticalPremiumShapeA: {
    position: 'absolute',
    right: 0,
    bottom: 10,
    width: 150,
    height: 42,
    borderRadius: 40,
    opacity: 0.62,
    transform: [{ rotate: '-35deg' }],
  },
  verticalPremiumShapeB: {
    position: 'absolute',
    right: 22,
    bottom: 30,
    width: 128,
    height: 34,
    borderRadius: 40,
    opacity: 0.72,
    transform: [{ rotate: '-35deg' }],
  },
  verticalPremiumShapeC: {
    position: 'absolute',
    right: 44,
    bottom: 50,
    width: 106,
    height: 28,
    borderRadius: 40,
    opacity: 0.78,
    transform: [{ rotate: '-35deg' }],
  },
  verticalFrontContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  verticalFrontHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  verticalFrontHeaderSub: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#64748B',
  },
  verticalFrontIdentityWrap: {
    alignItems: 'center',
    marginTop: 20,
  },
  verticalFrontAvatarFrame: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 1.5,
  },
  verticalFrontName: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#0F172A',
  },
  verticalFrontRole: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  verticalFrontProgramLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    marginBottom: 3,
    color: '#64748B',
  },
  verticalFrontFooter: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingBottom: 4,
  },
  verticalFrontCardNumber: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.65,
    color: '#0F172A',
  },
  verticalBackContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  verticalBackHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verticalBackCode: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.45,
    color: '#334155',
  },
  verticalBackStatement: {
    marginTop: 12,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '500',
    paddingRight: 2,
    color: '#475569',
  },
  verticalBackMetaWrap: {
    marginTop: 12,
    gap: 4,
  },
  verticalBackMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  verticalBackBottomPanel: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  verticalBackQrFrame: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalBackSignWrap: {
    flex: 1,
    maxWidth: 120,
  },
  verticalBackSignHint: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
    color: '#64748B',
  },
  verticalBackSignLine: {
    height: 1,
    marginBottom: 4,
    backgroundColor: '#64748B',
  },
  verticalBackSignLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0F172A',
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
  horizontalCardBase: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  horizontalFrontEdgeAccent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 8,
    opacity: 0.8,
  },
  horizontalBottomStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 46,
    backgroundColor: '#E5E7EB',
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  barcodeColumn: {
    alignItems: 'center',
  },
  barcodeWrap: {
    flexDirection: 'row',
    height: 24,
    alignItems: 'center',
  },
  barcodeBar: {
    height: '100%',
    backgroundColor: '#1E293B',
  },
  horizontalIdText: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  horizontalMainContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 52,
    flex: 1,
  },
  horizontalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  classicBrandBadge: {
    height: 32,
    borderRadius: 9,
    borderWidth: 1.2,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  horizontalLogoPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  horizontalLogoTextSmall: {
    fontSize: 5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  horizontalTitleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  horizontalTitleText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 15,
  },
  classicTitleText: {
    fontSize: 12,
    lineHeight: 13,
    letterSpacing: 0.2,
    paddingRight: 3,
  },
  horizontalTitleUnderline: {
    height: 2,
    width: '100%',
    marginTop: 2,
  },
  classicTitleUnderline: {
    width: '88%',
    borderRadius: 999,
    marginTop: 3,
  },
  horizontalBody: {
    flexDirection: 'row',
    gap: 8,
  },
  horizontalInfoRowWrapper: {
    flex: 1,
    gap: 2,
  },
  horizontalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  horizontalLabelText: {
    width: 54,
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  horizontalLabelColonText: {
    width: 10,
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  horizontalValueText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 13,
  },
  horizontalAvatarWrap: {
    width: 92,
    marginTop: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  horizontalAvatarImage: {
    transform: [{ scale: 0.66 }],
  },
  horizontalAvatarFrame: {
    borderWidth: 0,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    padding: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  backHorizontalTopBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
  },
  backHorizontalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backHorizontalHeader: {
    alignItems: 'center',
    gap: 6,
  },
  backHorizontalInstituteText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  backHorizontalDesc: {
    fontSize: 11,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  backHorizontalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: 6,
  },
  qrFramedWrap: {
    width: 58,
    height: 58,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backQrInner: {
    transform: [{ scale: 0.9 }],
  },
  qrCornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 10, height: 10, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 },
  qrCornerTopRight: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 4 },
  qrCornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 10, height: 10, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 4 },
  qrCornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 },
  signatureWrap: {
    alignItems: 'center',
    width: 128,
  },
  signatureLine: {
    height: 1,
    backgroundColor: '#94A3B8',
    width: '100%',
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  waveFrontGradientPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '44%',
  },
  waveFrontDotPattern: {
    position: 'absolute',
    left: 14,
    top: 16,
    width: 120,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  waveFrontDot: {
    width: 3,
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  waveFrontWhiteSweepTop: {
    position: 'absolute',
    width: 340,
    height: 190,
    borderRadius: 190,
    backgroundColor: '#FFFFFF',
    top: -136,
    left: 88,
    transform: [{ rotate: '-8deg' }],
  },
  waveFrontWhiteSweepBottom: {
    position: 'absolute',
    width: 330,
    height: 180,
    borderRadius: 180,
    backgroundColor: '#FFFFFF',
    bottom: -138,
    left: 58,
    transform: [{ rotate: '8deg' }],
  },
  waveFrontDecorTop: {
    position: 'absolute',
    top: -22,
    right: 0,
    width: 84,
    height: 54,
    borderBottomLeftRadius: 64,
    opacity: 0.82,
  },
  waveFrontDecorBottom: {
    position: 'absolute',
    bottom: -22,
    right: 0,
    width: 88,
    height: 76,
    borderTopLeftRadius: 80,
    opacity: 0.85,
  },
  waveFrontLogoBlock: {
    position: 'absolute',
    left: 16,
    top: 16,
    alignItems: 'center',
    width: 110,
  },
  waveFrontLogoBadge: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  waveFrontLogoSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  waveFrontAvatarFrame: {
    position: 'absolute',
    left: '52%',
    top: 20,
    marginLeft: -42,
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.6,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
  waveFrontAvatarImage: {
    transform: [{ scale: 0.72 }],
  },
  waveFrontIdentityBlock: {
    position: 'absolute',
    left: 146,
    right: 14,
    top: 114,
    alignItems: 'center',
  },
  waveFrontNameText: {
    color: '#1E293B',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  waveFrontRoleText: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  waveFrontDateRow: {
    marginTop: 10,
    gap: 4,
    alignSelf: 'stretch',
  },
  waveFrontDateText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'left',
  },
  waveFrontDateLabel: {
    fontWeight: '800',
  },
  waveFrontBarcodeCard: {
    position: 'absolute',
    left: 18,
    bottom: 18,
    width: 112,
    borderRadius: 2,
    borderWidth: 1.2,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  waveFrontBarcodeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
  },
  waveFrontBarcodeBar: {
    height: '100%',
    backgroundColor: '#1E293B',
  },
  waveBackTopGlow: {
    position: 'absolute',
    top: -34,
    left: -28,
    width: 220,
    height: 120,
    borderRadius: 120,
    opacity: 0.1,
  },
  waveBackEdgeAccent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 6,
    opacity: 0.85,
  },
  waveBackCleanContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  waveBackCleanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waveBackLogoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveBackHeaderTextWrap: {
    flex: 1,
  },
  waveBackHeaderTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  waveBackHeaderSubtitle: {
    marginTop: 1,
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  waveBackCleanStatement: {
    marginTop: 8,
    color: '#334155',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
    paddingRight: 8,
  },
  waveBackCleanBottom: {
    marginTop: 12,
  },
  waveBackCleanInfo: {
    gap: 6,
  },
  waveBackCleanInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waveBackCleanInfoLabel: {
    width: 58,
    fontSize: 9,
    fontWeight: '800',
    color: '#1E293B',
  },
  waveBackCleanInfoColon: {
    width: 8,
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  waveBackCleanInfoValue: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  waveBackSignRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
  },
  waveBackCleanQrFrame: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveBackSignArea: {
    flex: 1,
    justifyContent: 'flex-end',
    maxWidth: 132,
  },
  waveBackSignHint: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  waveBackSignLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#64748B',
    marginBottom: 4,
  },
  waveBackSignLabel: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '600',
  },
  wavePremiumCornerWrap: {
    position: 'absolute',
    right: -34,
    bottom: -34,
    width: 250,
    height: 180,
  },
  wavePremiumBlobOne: {
    position: 'absolute',
    right: 0,
    bottom: -20,
    width: 170,
    height: 128,
    borderTopLeftRadius: 128,
    opacity: 0.78,
    transform: [{ rotate: '-18deg' }],
  },
  wavePremiumBlobTwo: {
    position: 'absolute',
    right: 30,
    bottom: -14,
    width: 142,
    height: 112,
    borderTopLeftRadius: 118,
    opacity: 0.8,
    transform: [{ rotate: '-23deg' }],
  },
  wavePremiumBlobThree: {
    position: 'absolute',
    right: 68,
    bottom: -10,
    width: 114,
    height: 88,
    borderTopLeftRadius: 94,
    opacity: 0.86,
    transform: [{ rotate: '-26deg' }],
  },
  wavePremiumBlobFour: {
    position: 'absolute',
    right: -12,
    bottom: 34,
    width: 120,
    height: 88,
    borderBottomLeftRadius: 98,
    opacity: 0.66,
    transform: [{ rotate: '-14deg' }],
  },
  wavePremiumProfileFrame: {
    position: 'absolute',
    right: 16,
    top: 44,
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2.2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 2,
  },
  luxeTopGlow: {
    position: 'absolute',
    top: -54,
    left: -46,
    width: 230,
    height: 138,
    borderRadius: 138,
    backgroundColor: 'rgba(139,92,246,0.06)',
  },
  luxeBottomGlow: {
    position: 'absolute',
    right: -54,
    bottom: -74,
    width: 220,
    height: 154,
    borderRadius: 154,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  luxeCornerWrap: {
    position: 'absolute',
    right: -42,
    bottom: -48,
    width: 268,
    height: 196,
  },
  luxeShapeOne: {
    position: 'absolute',
    right: -4,
    bottom: 2,
    width: 186,
    height: 56,
    borderRadius: 42,
    opacity: 0.56,
    transform: [{ rotate: '-34deg' }],
  },
  luxeShapeTwo: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 166,
    height: 46,
    borderRadius: 42,
    opacity: 0.64,
    transform: [{ rotate: '-34deg' }],
  },
  luxeShapeThree: {
    position: 'absolute',
    right: 42,
    bottom: 46,
    width: 146,
    height: 38,
    borderRadius: 42,
    opacity: 0.72,
    transform: [{ rotate: '-34deg' }],
  },
  luxeShapeFour: {
    position: 'absolute',
    right: 88,
    bottom: 68,
    width: 114,
    height: 30,
    borderRadius: 42,
    opacity: 0.78,
    transform: [{ rotate: '-34deg' }],
  },
  luxeBackFooterRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '74%',
  },
  luxeBackQrFrame: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.4,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  luxeBackSignWrap: {
    flex: 1,
  },
  luxeBackSignLine: {
    backgroundColor: '#64748B',
    width: '72%',
    alignSelf: 'flex-start',
  },
  prismCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F1F5F9',
  },
  prismCornerWrap: {
    position: 'absolute',
    right: -34,
    bottom: -34,
    width: 250,
    height: 180,
  },
  prismShapeA: {
    position: 'absolute',
    right: 10,
    bottom: -2,
    width: 136,
    height: 96,
    borderRadius: 10,
    transform: [{ rotate: '-18deg' }],
    opacity: 0.86,
  },
  prismShapeB: {
    position: 'absolute',
    right: 56,
    bottom: -18,
    width: 118,
    height: 82,
    borderRadius: 10,
    transform: [{ rotate: '-24deg' }],
    opacity: 0.92,
  },
  prismShapeC: {
    position: 'absolute',
    right: 106,
    bottom: -32,
    width: 96,
    height: 70,
    borderRadius: 10,
    transform: [{ rotate: '-22deg' }],
    opacity: 0.9,
  },
  prismShapeD: {
    position: 'absolute',
    right: -22,
    bottom: 30,
    width: 120,
    height: 84,
    borderRadius: 10,
    transform: [{ rotate: '-16deg' }],
    opacity: 0.74,
  },
  prismFrontHeader: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prismFrontTopRight: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#94A3B8',
  },
  prismFrontBottom: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    width: '62%',
  },
  prismFrontHolderLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  prismFrontHolderName: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  prismFrontCardDigits: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: 0.6,
  },
  prismBackContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  prismBackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prismBackCode: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  prismBackStatement: {
    marginTop: 14,
    maxWidth: '72%',
    fontSize: 10,
    lineHeight: 14,
    color: '#334155',
    fontWeight: '500',
  },
  prismBackMetaRow: {
    marginTop: 16,
    gap: 4,
    maxWidth: '74%',
  },
  prismBackMetaText: {
    fontSize: 10,
    color: '#1E293B',
    fontWeight: '600',
  },
  prismBackSignWrap: {
    marginTop: 'auto',
    width: '64%',
  },
  prismBackSignHint: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 4,
  },
  prismBackSignLine: {
    height: 1,
    backgroundColor: '#475569',
    marginBottom: 4,
  },
  prismBackSignLabel: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '600',
  },
});
