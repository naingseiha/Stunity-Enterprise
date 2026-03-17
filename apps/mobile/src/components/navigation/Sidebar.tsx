/**
 * Sidebar Component
 *
 * Card-first sidebar flow:
 * - Premium education card shown at the top
 * - Navigation menu shown below the card
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '@/components/common';
import { useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_USER_CARD_DESIGN_ID,
  DEFAULT_USER_CARD_ORIENTATION,
  DEFAULT_USER_CARD_STYLE_ID,
  UserCardDesignId,
  UserCardOrientation,
  UserCardStyleId,
  USER_CARD_ROLE_ICONS,
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
} from '@/services/userCardPreferences';

import StunityLogo from '../../../assets/Stunity.svg';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  key: string;
  label: string;
  icon: IoniconsName;
  iconColor: string;
  iconBg: string;
  badge?: number;
  onPress: () => void;
}

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

const CARD_ASPECT_RATIO = 1.586;
const VERTICAL_CARD_ASPECT_RATIO = 1 / CARD_ASPECT_RATIO;

export default function Sidebar({ visible, onClose, onNavigate }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const [selectedDesignId, setSelectedDesignId] = useState<UserCardDesignId>(DEFAULT_USER_CARD_DESIGN_ID);
  const [selectedStyleId, setSelectedStyleId] = useState<UserCardStyleId>(DEFAULT_USER_CARD_STYLE_ID);
  const [selectedOrientation, setSelectedOrientation] = useState<UserCardOrientation>(DEFAULT_USER_CARD_ORIENTATION);

  useEffect(() => {
    if (!visible) return;

    let mounted = true;

    Promise.all([getUserCardStylePreference(), getUserCardOrientationPreference(), getUserCardDesignPreference()])
      .then(([styleId, orientation, designId]) => {
        if (!mounted) return;
        setSelectedStyleId(styleId);
        setSelectedOrientation(orientation);
        setSelectedDesignId(designId);
      })
      .catch((error) => {
        console.error('Failed to load card preferences in sidebar:', error);
      });

    return () => {
      mounted = false;
    };
  }, [visible]);

  const userName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const role = user?.role ?? 'STUDENT';
  const selectedCardStyle = useMemo(
    () => getUserCardStyleById(selectedStyleId),
    [selectedStyleId]
  );
  const roleText = getUserRoleLabel(role, t);
  const roleIcon = USER_CARD_ROLE_ICONS[role];
  const cardNumber = formatUserCardNumber(user?.id, role);
  const expiresAt = formatUserCardExpiry(user?.createdAt);
  const verificationCode = formatUserCardVerificationCode(user?.id);
  const institutionName = user?.school?.name || t('profile.userCard.defaultInstitution', 'Stunity Learning Network');
  const isVertical = selectedOrientation === 'vertical';
  const isWaveDesign = selectedDesignId === 'wave';
  const isPrismDesign = selectedDesignId === 'prism';
  const isLuxeDesign = selectedDesignId === 'luxe';
  const cardLastFour = cardNumber.replace(/\s/g, '').slice(-4).padStart(4, '0');
  const attendanceMenuItem: MenuItem | null = role === 'TEACHER'
    ? {
      key: 'attendance',
      label: t('profile.attendance'),
      icon: 'finger-print-outline',
      iconColor: '#0284C7',
      iconBg: '#E0F2FE',
      onPress: () => { onNavigate('AttendanceCheckIn'); onClose(); },
    }
    : null;

  const menuItems: MenuItem[] = [
    ...(attendanceMenuItem ? [attendanceMenuItem] : []),
    {
      key: 'leaderboard',
      label: t('settings.achievements'),
      icon: 'podium',
      iconColor: '#8B5CF6',
      iconBg: '#EDE9FE',
      onPress: () => { onNavigate('Leaderboard'); onClose(); },
    },
    {
      key: 'events',
      label: t('profile.userCard.eventsMenu', 'Events'),
      icon: 'calendar',
      iconColor: '#EC4899',
      iconBg: '#FCE7F3',
      onPress: () => { onNavigate('Events'); onClose(); },
    },
    {
      key: 'bookmarks',
      label: t('settings.bookmarks'),
      icon: 'bookmark',
      iconColor: '#6366F1',
      iconBg: '#EEF2FF',
      onPress: () => { onNavigate('Bookmarks'); onClose(); },
    },
    {
      key: 'quiz-studio',
      label: t('profile.quizStudio'),
      icon: 'cube-outline',
      iconColor: '#D97706',
      iconBg: '#FFEDD5',
      onPress: () => { onNavigate('QuizStudio'); onClose(); },
    },
    {
      key: 'connections',
      label: t('settings.connections'),
      icon: 'people',
      iconColor: '#10B981',
      iconBg: '#D1FAE5',
      onPress: () => { onNavigate('Connections'); onClose(); },
    },
    {
      key: 'settings',
      label: t('common.settings'),
      icon: 'settings',
      iconColor: '#6B7280',
      iconBg: '#F3F4F6',
      onPress: () => { onNavigate('Settings'); onClose(); },
    },
    {
      key: 'help',
      label: t('settings.helpCenter'),
      icon: 'help-circle',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      onPress: () => { onClose(); },
    },
  ];

  const renderSidebarCornerMotif = () => {
    if (!isWaveDesign && !isPrismDesign && !isLuxeDesign) {
      return <View style={[styles.sidebarClassicAccent, { backgroundColor: selectedCardStyle.outline }]} />;
    }

    if (isWaveDesign) {
      return (
        <View style={styles.sidebarWaveCornerWrap}>
          <View style={[styles.sidebarWaveBlobA, { backgroundColor: selectedCardStyle.outline }]} />
          <View style={[styles.sidebarWaveBlobB, { backgroundColor: selectedCardStyle.gradient[1] }]} />
          <View style={[styles.sidebarWaveBlobC, { backgroundColor: selectedCardStyle.accent }]} />
        </View>
      );
    }

    if (isPrismDesign) {
      return (
        <View style={styles.sidebarPrismCornerWrap}>
          <View style={[styles.sidebarPrismShapeA, { backgroundColor: selectedCardStyle.outline }]} />
          <View style={[styles.sidebarPrismShapeB, { backgroundColor: selectedCardStyle.gradient[1] }]} />
          <View style={[styles.sidebarPrismShapeC, { backgroundColor: selectedCardStyle.accent }]} />
        </View>
      );
    }

    return (
      <View style={styles.sidebarLuxeCornerWrap}>
        <View style={[styles.sidebarLuxeStripeA, { backgroundColor: selectedCardStyle.outline }]} />
        <View style={[styles.sidebarLuxeStripeB, { backgroundColor: selectedCardStyle.gradient[1] }]} />
        <View style={[styles.sidebarLuxeStripeC, { backgroundColor: selectedCardStyle.accent }]} />
      </View>
    );
  };

  const renderSidebarHorizontalPreview = () => {
    const isClassic = !isWaveDesign && !isPrismDesign && !isLuxeDesign;

    return (
      <View
        style={[
          styles.sidebarPreviewShell,
          styles.sidebarPreviewShellHorizontal,
          {
            shadowColor: selectedCardStyle.outline,
            backgroundColor: `${selectedCardStyle.outline}14`,
          },
        ]}
      >
        <View
          style={[
            styles.sidebarPreviewCardBase,
            styles.sidebarPreviewCardHorizontal,
            {
              borderColor: `${selectedCardStyle.outline}45`,
            },
          ]}
        >
          <LinearGradient
            colors={isClassic ? selectedCardStyle.gradient : ['#FFFFFF', '#F5F0FF', '#EEF7FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sidebarPreviewCanvas}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.74)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
            start={{ x: 0.08, y: 0 }}
            end={{ x: 1, y: 0.95 }}
            style={styles.sidebarPreviewGloss}
          />
          {renderSidebarCornerMotif()}

          <View style={styles.sidebarPreviewHorizontalHeader}>
            <StunityLogo width={70} height={18} />
            <Text style={[styles.sidebarPreviewTopRight, { color: isClassic ? selectedCardStyle.mutedForeground : '#94A3B8' }]}>
              {t('profile.userCard.educationCard', 'EDUCATION CARD')}
            </Text>
          </View>

          <View style={[styles.sidebarPreviewHorizontalAvatarFrame, { borderColor: selectedCardStyle.outline }]}>
            <Avatar
              uri={user?.profilePictureUrl}
              name={userName}
              size="lg"
              showBorder={false}
              gradientBorder="none"
            />
          </View>

          <View style={styles.sidebarPreviewHorizontalBottom}>
            <Text style={[styles.sidebarPreviewName, { color: isClassic ? selectedCardStyle.foreground : '#0F172A' }]} numberOfLines={1}>
              {userName.toUpperCase()}
            </Text>
            <Text style={[styles.sidebarPreviewRole, { color: isClassic ? selectedCardStyle.mutedForeground : '#475569' }]} numberOfLines={1}>
              {roleText}
            </Text>
            <Text style={[styles.sidebarPreviewDigits, { color: isClassic ? selectedCardStyle.foreground : '#1E293B' }]}>
              {`\u2022 \u2022 \u2022 \u2022  ${cardLastFour}`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSidebarVerticalPreview = () => {
    const isClassic = !isWaveDesign && !isPrismDesign && !isLuxeDesign;

    return (
      <View
        style={[
          styles.sidebarPreviewShell,
          styles.sidebarPreviewShellVertical,
          {
            shadowColor: selectedCardStyle.outline,
            backgroundColor: `${selectedCardStyle.outline}14`,
          },
        ]}
      >
        <View
          style={[
            styles.sidebarPreviewCardBase,
            styles.sidebarPreviewCardVertical,
            {
              borderColor: `${selectedCardStyle.outline}45`,
            },
          ]}
        >
          <LinearGradient
            colors={isClassic ? selectedCardStyle.gradient : ['#FFFFFF', '#F5F0FF', '#EEF7FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sidebarPreviewCanvas}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.74)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
            start={{ x: 0.08, y: 0 }}
            end={{ x: 1, y: 0.95 }}
            style={styles.sidebarPreviewGloss}
          />
          {renderSidebarCornerMotif()}

          <View style={styles.sidebarPreviewVerticalHeader}>
            <StunityLogo width={66} height={17} />
            <Text style={[styles.sidebarPreviewTopRight, { color: isClassic ? selectedCardStyle.mutedForeground : '#94A3B8' }]}>
              {t('profile.userCard.educationCard', 'EDUCATION CARD')}
            </Text>
          </View>

          <View style={[styles.sidebarPreviewVerticalAvatarFrame, { borderColor: selectedCardStyle.outline }]}>
            <Avatar
              uri={user?.profilePictureUrl}
              name={userName}
              size="lg"
              showBorder={false}
              gradientBorder="none"
            />
          </View>

          <View style={styles.sidebarPreviewVerticalBottom}>
            <Text style={[styles.sidebarPreviewName, { color: isClassic ? selectedCardStyle.foreground : '#0F172A' }]} numberOfLines={1}>
              {userName.toUpperCase()}
            </Text>
            <Text style={[styles.sidebarPreviewRole, { color: isClassic ? selectedCardStyle.mutedForeground : '#475569' }]} numberOfLines={1}>
              {roleText}
            </Text>
            <Text style={[styles.sidebarPreviewDigits, { color: isClassic ? selectedCardStyle.foreground : '#1E293B' }]}>
              {`\u2022 \u2022 \u2022 \u2022  ${cardLastFour}`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('common.logout'),
      'Are you sure you want to log out?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: () => { logout(); onClose(); },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.header}>
          <StunityLogo width={120} height={30} />
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.identitySection}>
            <View style={styles.identityHeader}>
              <Avatar
                uri={user?.profilePictureUrl}
                name={userName}
                size="md"
                showBorder={false}
                gradientBorder="none"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.identityHello}>
                  {t('profile.userCard.hello', 'Hello')}, {user?.firstName || t('common.profile', 'Profile')}
                </Text>
                <Text style={styles.identityInstitution}>{institutionName}</Text>
              </View>
              <View style={[styles.identityRoleChip, { backgroundColor: selectedCardStyle.chipBackground }]}>
                <Ionicons name={roleIcon} size={13} color="#0F172A" />
                <Text style={styles.identityRoleText}>{roleText}</Text>
              </View>
            </View>

            <Text style={styles.cardPreviewLabel}>
              {t('profile.userCard.previewLabel', 'Preview')} · {isVertical
                ? t('profile.userCard.vertical', 'Vertical')
                : t('profile.userCard.horizontal', 'Horizontal')}
            </Text>

            <View
              style={[
                styles.cardPreviewStage,
                {
                  backgroundColor: `${selectedCardStyle.outline}0C`,
                },
              ]}
            >
              {isVertical ? renderSidebarVerticalPreview() : renderSidebarHorizontalPreview()}
            </View>

            <TouchableOpacity
              activeOpacity={0.72}
              onPress={() => { onNavigate('Profile'); onClose(); }}
              style={styles.profileShortcut}
            >
              <Ionicons name="person-circle-outline" size={18} color="#1D4ED8" />
              <Text style={styles.profileShortcutText}>{t('settings.viewProfile')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.menuHeaderText}>{t('profile.userCard.sidebarMenuTitle', 'Quick Menu')}</Text>

            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.62}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <View style={styles.menuRight}>
                  {item.badge ? (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.badge}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.logoutText}>{t('common.logout')}</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Stunity v1.0.0</Text>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  identitySection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D2DCE9',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  identityHello: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  identityInstitution: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  identityRoleChip: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  identityRoleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardPreviewLabel: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardPreviewStage: {
    borderRadius: 16,
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  sidebarPreviewShell: {
    borderRadius: 22,
    padding: 0,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sidebarPreviewShellHorizontal: {
    width: '100%',
    alignSelf: 'stretch',
  },
  sidebarPreviewShellVertical: {
    alignSelf: 'center',
  },
  sidebarPreviewCardBase: {
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  sidebarPreviewCardHorizontal: {
    width: '100%',
    aspectRatio: CARD_ASPECT_RATIO,
  },
  sidebarPreviewCardVertical: {
    width: 220,
    aspectRatio: VERTICAL_CARD_ASPECT_RATIO,
    alignSelf: 'center',
  },
  sidebarPreviewCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  sidebarPreviewGloss: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 19,
  },
  sidebarClassicAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 6,
    opacity: 0.82,
  },
  sidebarWaveCornerWrap: {
    position: 'absolute',
    right: -30,
    bottom: -28,
    width: 170,
    height: 130,
  },
  sidebarWaveBlobA: {
    position: 'absolute',
    right: 0,
    bottom: -6,
    width: 118,
    height: 82,
    borderTopLeftRadius: 92,
    opacity: 0.74,
    transform: [{ rotate: '-18deg' }],
  },
  sidebarWaveBlobB: {
    position: 'absolute',
    right: 28,
    bottom: -4,
    width: 94,
    height: 66,
    borderTopLeftRadius: 82,
    opacity: 0.8,
    transform: [{ rotate: '-22deg' }],
  },
  sidebarWaveBlobC: {
    position: 'absolute',
    right: 56,
    bottom: 0,
    width: 76,
    height: 54,
    borderTopLeftRadius: 72,
    opacity: 0.86,
    transform: [{ rotate: '-24deg' }],
  },
  sidebarPrismCornerWrap: {
    position: 'absolute',
    right: -34,
    bottom: -30,
    width: 172,
    height: 134,
  },
  sidebarPrismShapeA: {
    position: 'absolute',
    right: 6,
    bottom: -2,
    width: 98,
    height: 62,
    borderRadius: 8,
    opacity: 0.8,
    transform: [{ rotate: '-18deg' }],
  },
  sidebarPrismShapeB: {
    position: 'absolute',
    right: 38,
    bottom: -10,
    width: 84,
    height: 54,
    borderRadius: 8,
    opacity: 0.86,
    transform: [{ rotate: '-22deg' }],
  },
  sidebarPrismShapeC: {
    position: 'absolute',
    right: 72,
    bottom: -18,
    width: 68,
    height: 46,
    borderRadius: 8,
    opacity: 0.92,
    transform: [{ rotate: '-20deg' }],
  },
  sidebarLuxeCornerWrap: {
    position: 'absolute',
    right: -36,
    bottom: -34,
    width: 182,
    height: 140,
  },
  sidebarLuxeStripeA: {
    position: 'absolute',
    right: 0,
    bottom: 8,
    width: 134,
    height: 34,
    borderRadius: 34,
    opacity: 0.66,
    transform: [{ rotate: '-32deg' }],
  },
  sidebarLuxeStripeB: {
    position: 'absolute',
    right: 16,
    bottom: 22,
    width: 116,
    height: 28,
    borderRadius: 34,
    opacity: 0.74,
    transform: [{ rotate: '-32deg' }],
  },
  sidebarLuxeStripeC: {
    position: 'absolute',
    right: 34,
    bottom: 36,
    width: 98,
    height: 22,
    borderRadius: 34,
    opacity: 0.82,
    transform: [{ rotate: '-32deg' }],
  },
  sidebarPreviewHorizontalHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarPreviewVerticalHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarPreviewTopRight: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sidebarPreviewHorizontalAvatarFrame: {
    position: 'absolute',
    right: 12,
    top: 34,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sidebarPreviewHorizontalBottom: {
    position: 'absolute',
    left: 12,
    right: 92,
    bottom: 12,
  },
  sidebarPreviewVerticalAvatarFrame: {
    position: 'absolute',
    top: 44,
    left: '50%',
    marginLeft: -35,
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sidebarPreviewVerticalBottom: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    alignItems: 'center',
  },
  sidebarPreviewName: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sidebarPreviewRole: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
  },
  sidebarPreviewDigits: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardHorizontal: {
    minHeight: 178,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardVertical: {
    width: 220,
    minHeight: 290,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardTemplateStripe: {
    position: 'absolute',
    top: -20,
    right: 34,
    width: 28,
    height: 340,
    transform: [{ rotate: '16deg' }],
    opacity: 0.35,
  },
  cardTemplateBand: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    height: 18,
    borderRadius: 8,
  },
  cardVerticalAvatarWrap: {
    marginTop: 14,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardVerticalName: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
  },
  cardVerticalRole: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  cardVerticalInstitution: {
    marginTop: 9,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  cardVerticalInstitutionText: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  cardMetaRowVertical: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardNumberVertical: {
    marginTop: 12,
    fontSize: 14,
    letterSpacing: 1.4,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardGlowOne: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -38,
    right: -38,
  },
  cardGlowTwo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    bottom: -46,
    left: -30,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBrand: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardBrandSub: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  verifiedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardNumber: {
    marginTop: 26,
    fontSize: 17,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  cardMetaRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardMetaCol: {
    flex: 1,
  },
  cardMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  cardMetaValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  profileShortcut: {
    marginTop: 10,
    width: '100%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
  },
  profileShortcutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  menuSection: {
    paddingHorizontal: 16,
  },
  menuHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  menuIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  menuBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  logoutIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    letterSpacing: -0.2,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: '500',
    marginTop: 20,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 50 : 30,
  },
});
