import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { LanguageSelector } from '../../components/LanguageSelector';
import StunityLogo from '../../../assets/Stunity.svg';
import { AuthStackScreenProps } from '@/navigation/types';
import { useLayoutBreakpoint } from '@/hooks/useLayoutBreakpoint';

// Brand Colors (Exact SVG Matches)
const BRAND_TEAL = '#09CFF7';
const BRAND_YELLOW = '#FFA600';

function createStyles(width: number, height: number, isTablet: boolean) {
  const headerFrac = isTablet ? 0.34 : 0.42;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    splitRoot: {
      flex: 1,
      flexDirection: 'row',
    },
    splitHero: {
      flex: 1,
      overflow: 'hidden',
    },
    splitAside: {
      flex: 1,
      backgroundColor: '#fff',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingVertical: 32,
      ...Platform.select({
        ios: {
          shadowColor: '#0F172A',
          shadowOffset: { width: -8, height: 0 },
          shadowOpacity: 0.06,
          shadowRadius: 24,
        },
        android: { elevation: 8 },
      }),
    },
    tabletPortraitWrap: {
      flex: 1,
      width: '100%',
      maxWidth: 620,
      alignSelf: 'center',
    },
    languageSwitchContainer: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 0 : 40,
      right: 20,
      zIndex: 10,
    },
    languageSwitch: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      gap: 4,
    },
    languageSwitchText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#64748B',
    },
    headerSection: {
      height: height * headerFrac,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoSafeArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 40,
    },
    logoContainer: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    logoWrapper: {
      alignItems: 'center',
    },
    wavyContainer: {
      position: 'absolute',
      bottom: -1,
      width: '100%',
    },
    wavySvg: {
      bottom: 0,
    },
    contentSection: {
      flex: 1,
      backgroundColor: '#fff',
      paddingHorizontal: 32,
    },
    actionCenter: {
      flex: 1,
      width: '100%',
      paddingTop: 10,
    },
    introContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    introTitle: {
      fontSize: isTablet ? 28 : 24,
      fontWeight: '800',
      color: '#0F172A',
      marginBottom: 8,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    introSubtitle: {
      fontSize: isTablet ? 16 : 15,
      color: '#64748B',
      textAlign: 'center',
      lineHeight: isTablet ? 24 : 22,
      paddingHorizontal: 10,
    },
    buttonWrapper: {
      width: '100%',
    },
    button: {
      height: 64,
      borderRadius: 999,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    outlineButton: {
      borderWidth: 2,
      borderColor: 'rgba(9, 207, 247, 0.15)',
      backgroundColor: 'white',
    },
    buttonText: {
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    primaryButtonText: {
      color: '#fff',
    },
    secondaryButtonText: {
      color: BRAND_TEAL,
    },
    primaryShadow: {
      shadowColor: BRAND_TEAL,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    spacing: {
      height: 16,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
      width: '100%',
      paddingHorizontal: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#E2E8F0',
    },
    dividerText: {
      marginHorizontal: 12,
      fontSize: 10,
      fontWeight: '800',
      color: '#94A3B8',
      letterSpacing: 1.5,
    },
    portalButton: {
      width: '100%',
      height: 64,
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: '#FEF3C7',
    },
    portalGradient: {
      flex: 1,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    portalIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: BRAND_YELLOW,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    portalTextContainer: {
      flex: 1,
      alignItems: 'center',
      paddingRight: 8,
    },
    portalText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#B45309',
    },
    portalArrowContainer: {
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    legalLinks: {
      flexDirection: 'row',
      alignItems: 'center',
      opacity: 0.4,
    },
    legalText: {
      fontSize: 12,
      color: '#475569',
      fontWeight: '600',
    },
    legalDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: '#CBD5E1',
      marginHorizontal: 12,
    },
  });
}

type NavigationProp = AuthStackScreenProps<'Welcome'>['navigation'];

const WavyDivider = React.memo(function WavyDivider({
  waveWidth,
  styles,
}: {
  waveWidth: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const w = waveWidth;
  return (
    <View style={styles.wavyContainer}>
      <Svg
        height={120}
        width={w}
        viewBox={`0 0 ${w} 120`}
        style={styles.wavySvg}
      >
        <Path
          d={`M0 20 C${w * 0.3} 10, ${w * 0.6} 90, ${w} 50 V120 H0 Z`}
          fill="white"
          opacity={0.3}
        />
        <Path
          d={`M0 40 C${w * 0.4} 30, ${w * 0.7} 110, ${w} 70 V120 H0 Z`}
          fill="white"
          opacity={0.6}
        />
        <Path
          d={`M0 60 C${w * 0.35} 50, ${w * 0.65} 130, ${w} 90 V120 H0 Z`}
          fill="white"
        />
      </Svg>
    </View>
  );
});

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const layout = useLayoutBreakpoint();
  const styles = useMemo(() => createStyles(width, height, layout.isTablet), [width, height, layout.isTablet]);
  const navigation = useNavigation<NavigationProp>();
  const { t, i18n } = useTranslation();
  const [showLanguageSelector, setShowLanguageSelector] = React.useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 15,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const PremiumButton = ({ onPress, icon, label, primary = false }: any) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.buttonWrapper}
      >
        <LinearGradient
          colors={primary ? [BRAND_TEAL, '#00B8DB'] : ['transparent', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            !primary && styles.outlineButton,
            primary && styles.primaryShadow
          ]}
        >
          {icon && <Ionicons name={icon} size={20} color={primary ? "#fff" : BRAND_TEAL} style={{ marginRight: 10 }} />}
          <Text style={[styles.buttonText, primary ? styles.primaryButtonText : styles.secondaryButtonText]}>
            {label}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const isSplitTablet = layout.isTablet && width > height;
  const leftPanelW = Math.max(320, Math.floor(width / 2));
  const logoWidthPx = isSplitTablet
    ? Math.min(leftPanelW * 0.82, 400)
    : layout.isTablet
      ? Math.min(width * 0.52, 440)
      : width * 0.7;
  const logoHeightPx = logoWidthPx * (0.25 / 0.7);

  const renderActionBlocks = () => (
    <>
      <Animated.View
        style={[
          styles.actionCenter,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.introContainer}>
          <Text style={styles.introTitle}>{t('common.welcome')}</Text>
          <Text style={styles.introSubtitle}>
            <AutoI18nText i18nKey="auto.mobile.screens_auth_WelcomeScreen.k_d8bb1080" />
          </Text>
        </View>

        <PremiumButton
          primary
          label={t('common.signup')}
          icon="person-add-outline"
          onPress={() => navigation.navigate('Register')}
        />

        <View style={styles.spacing} />

        <PremiumButton
          label={t('common.login')}
          icon="shield-checkmark-outline"
          onPress={() => navigation.navigate('Login')}
        />

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.forParents')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('ParentLogin')}
          style={styles.portalButton}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#FFFBEB', '#FEF3C7']}
            style={styles.portalGradient}
          >
            <View style={styles.portalIconContainer}>
              <Ionicons name="school" size={20} color={BRAND_YELLOW} />
            </View>
            <View style={styles.portalTextContainer}>
              <Text style={styles.portalText}>{t('auth.parentPortal')}</Text>
            </View>
            <View style={styles.portalArrowContainer}>
              <Ionicons name="chevron-forward" size={18} color={BRAND_YELLOW} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.legalLinks}>
          <TouchableOpacity><Text style={styles.legalText}>{t('auth.termsOfService')}</Text></TouchableOpacity>
          <View style={styles.legalDot} />
          <TouchableOpacity><Text style={styles.legalText}>{t('auth.privacyPolicy')}</Text></TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );

  const languageAndModal = (
    <>
      <SafeAreaView style={styles.languageSwitchContainer}>
        <TouchableOpacity
          style={styles.languageSwitch}
          onPress={() => setShowLanguageSelector(true)}
        >
          <Text style={styles.languageSwitchText}>
            {i18n.language === 'km' ? '🇰🇭 ភាសាខ្មែរ' : '🇺🇸 English'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#64748B" />
        </TouchableOpacity>
      </SafeAreaView>
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
      />
    </>
  );

  if (isSplitTablet) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {languageAndModal}

        <View style={styles.splitRoot}>
          <View style={styles.splitHero}>
            <LinearGradient
              colors={['#FFFFFF', '#ECFEFF', BRAND_TEAL]}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <SafeAreaView style={[styles.logoSafeArea, { flex: 1 }]}>
              <Animated.View
                style={[
                  styles.logoWrapper,
                  styles.logoContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: logoScale }],
                  },
                ]}
              >
                <StunityLogo width={logoWidthPx} height={logoHeightPx} />
              </Animated.View>
            </SafeAreaView>
            <WavyDivider waveWidth={leftPanelW} styles={styles} />
          </View>

          <SafeAreaView style={styles.splitAside} edges={['bottom', 'left', 'right', 'top']}>
            <View style={{ flex: 1, justifyContent: 'center', maxWidth: 540, width: '100%', alignSelf: 'center' }}>
              {renderActionBlocks()}
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {languageAndModal}

      {/* Top Section - Premium Teal Header */}
      <View style={styles.headerSection}>
        <LinearGradient
          colors={['#FFFFFF', '#ECFEFF', BRAND_TEAL]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <SafeAreaView style={styles.logoSafeArea}>
          <Animated.View
            style={[
              styles.logoWrapper,
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <StunityLogo width={logoWidthPx} height={logoHeightPx} />
          </Animated.View>
        </SafeAreaView>

        <WavyDivider waveWidth={width} styles={styles} />
      </View>

      {/* Bottom Section - Action Content */}
      <View style={styles.contentSection}>
        {layout.isTablet ? (
          <View style={styles.tabletPortraitWrap}>{renderActionBlocks()}</View>
        ) : (
          renderActionBlocks()
        )}
      </View>
    </View>
  );
}
