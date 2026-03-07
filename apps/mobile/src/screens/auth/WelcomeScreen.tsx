import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

import StunityLogo from '../../../assets/Stunity.svg';
import { AuthStackScreenProps } from '@/navigation/types';

const { width, height } = Dimensions.get('window');

// Brand Colors (Exact SVG Matches)
const BRAND_TEAL = '#09CFF7';
const BRAND_YELLOW = '#FFA600';

type NavigationProp = AuthStackScreenProps<'Welcome'>['navigation'];

const WavyDivider = () => (
  <View style={styles.wavyContainer}>
    <Svg
      height={120}
      width={width}
      viewBox={`0 0 ${width} 120`}
      style={styles.wavySvg}
    >
      {/* Deep Shadow Layer */}
      <Path
        d={`M0 20 C${width * 0.3} 10, ${width * 0.6} 90, ${width} 50 V120 H0 Z`}
        fill="white"
        opacity={0.3}
      />
      {/* Mid Accent Layer */}
      <Path
        d={`M0 40 C${width * 0.4} 30, ${width * 0.7} 110, ${width} 70 V120 H0 Z`}
        fill="white"
        opacity={0.6}
      />
      {/* Main Solid Transition */}
      <Path
        d={`M0 60 C${width * 0.35} 50, ${width * 0.65} 130, ${width} 90 V120 H0 Z`}
        fill="white"
      />
    </Svg>
  </View>
);

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Section - Premium Teal Header */}
      <View style={styles.headerSection}>
        <LinearGradient
          colors={['#FFFFFF', '#ECFEFF', BRAND_TEAL]} // "Crystal Teal" Gradient
          locations={[0, 0.4, 1]} // White top for logo contrast
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <SafeAreaView style={styles.logoSafeArea}>
          <Animated.View
            style={[
              styles.logoWrapper,
              styles.logoContainer, // Subtle shadow for light-on-light contrast
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }]
              }
            ]}
          >
            <StunityLogo width={width * 0.7} height={width * 0.25} />
          </Animated.View>
        </SafeAreaView>

        <WavyDivider />
      </View>

      {/* Bottom Section - Action Content */}
      <View style={styles.contentSection}>
        <Animated.View
          style={[
            styles.actionCenter,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.introContainer}>
            <Text style={styles.introTitle}>Excellence in Education</Text>
            <Text style={styles.introSubtitle}>
              Connecting students, teachers, and parents in one seamless enterprise platform.
            </Text>
          </View>

          <PremiumButton
            primary
            label="Create Account"
            icon="person-add-outline"
            onPress={() => navigation.navigate('Register')}
          />

          <View style={styles.spacing} />

          <PremiumButton
            label="Sign In"
            icon="shield-checkmark-outline"
            onPress={() => navigation.navigate('Login')}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>FOR PARENTS</Text>
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
                <Text style={styles.portalText}>Parent Portal Access</Text>
              </View>
              <View style={styles.portalArrowContainer}>
                <Ionicons name="chevron-forward" size={18} color={BRAND_YELLOW} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Minimalist Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <View style={styles.legalLinks}>
            <TouchableOpacity><Text style={styles.legalText}>Terms of Service</Text></TouchableOpacity>
            <View style={styles.legalDot} />
            <TouchableOpacity><Text style={styles.legalText}>Privacy Policy</Text></TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header Section
  headerSection: {
    height: height * 0.42,
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

  // Content Section
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
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  introSubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  // Buttons
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

  // Parent Portal
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

  // Footer
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
