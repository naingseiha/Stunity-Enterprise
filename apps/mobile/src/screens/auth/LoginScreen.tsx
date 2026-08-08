import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * Login Screen — Senior UI/UX Creative Enterprise Design
 * Exact WelcomeScreen 120px WavyDivider, turquoise gradient header,
 * custom integrated icon-badge capsule inputs, glowing gradient primary button, zero-scroll single-screen layout.
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useLayoutBreakpoint } from '@/hooks/useLayoutBreakpoint';
import { AuthTabletShell } from '@/components/auth/AuthTabletShell';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import AsyncStorage from '@react-native-async-storage/async-storage';
import StunityLogo from '../../../assets/Stunity.svg';

import { Colors } from '@/config';
import { useAuthStore } from '@/stores';
import { AuthStackScreenProps } from '@/navigation/types';
import tokenService from '@/services/token';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import {
  authenticateBiometric,
  getBiometricLabel,
  isBiometricAvailable,
} from '@/services/biometrics';

const BRAND_TEAL = Colors.brand; // #09CFF7 — Welcome Sign Up
const BRAND_TEAL_DARK = '#00B8DB';
const BRAND_TEAL_MUTED = '#7DE7F7';
const INK = '#0F172A';
const MUTED = '#64748B';

type NavigationProp = AuthStackScreenProps<'Login'>['navigation'];

// Exact 120px deep WavyDivider from WelcomeScreen
const WavyDivider = React.memo(function WavyDivider({ waveWidth }: { waveWidth: number }) {
  const w = waveWidth;
  return (
    <View style={styles.wavyContainer}>
      <Svg height={120} width={w} viewBox={`0 0 ${w} 120`} style={styles.wavySvg}>
        <Path d={`M0 20 C${w * 0.3} 10, ${w * 0.6} 90, ${w} 50 V120 H0 Z`} fill="white" opacity={0.3} />
        <Path d={`M0 40 C${w * 0.4} 30, ${w * 0.7} 110, ${w} 70 V120 H0 Z`} fill="white" opacity={0.6} />
        <Path d={`M0 60 C${w * 0.35} 50, ${w * 0.65} 130, ${w} 90 V120 H0 Z`} fill="white" />
      </Svg>
    </View>
  );
});

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation<NavigationProp>();
  const layout = useLayoutBreakpoint();
  const { login, logout, initialize, isLoading, error, clearError } = useAuthStore();
  const { t } = useTranslation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricLoginAvailable, setBiometricLoginAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    let mounted = true;

    const loadBiometricLoginState = async () => {
      try {
        const [enabled, hasSession, available, label] = await Promise.all([
          tokenService.isBiometricEnabled(),
          tokenService.isAuthenticated(),
          isBiometricAvailable(),
          getBiometricLabel(),
        ]);

        if (!mounted) return;
        setBiometricLabel(label);
        setBiometricLoginAvailable(enabled && hasSession && available);
      } catch {
        if (mounted) {
          setBiometricLoginAvailable(false);
        }
      }
    };

    void loadBiometricLoginState();

    return () => {
      mounted = false;
    };
  }, []);

  // Proportional header framing the 120px wave and logo perfectly without crowding the bottom 70% canvas
  const HEADER_H = Math.min(height * 0.31, 250);
  const logoW = Math.min(width * 0.48, 200);
  const logoH = logoW * (0.25 / 0.7);

  const handleLogin = async () => {
    const id = identifier.trim();
    if (!id || !password.trim()) {
      Alert.alert('Error', 'Please enter your email or phone and password');
      return;
    }
    clearError();
    const isEmail = id.includes('@');
    const result = await login({
      ...(isEmail ? { email: id } : { phone: id }),
      password,
      rememberMe: true,
    });
    if (result.requires2FA && result.challengeToken) {
      navigation.navigate('TwoFactor', {
        challengeToken: result.challengeToken,
        email: result.email || (isEmail ? id : ''),
      });
      return;
    }
    if (!result.success) {
      const message = result.error || useAuthStore.getState().error || 'Login failed';
      Alert.alert('Login Failed', message);
    }
  };

  const handleBiometricLogin = useCallback(async () => {
    if (biometricLoading || isLoading) return;

    setBiometricLoading(true);
    clearError();
    try {
      const authResult = await authenticateBiometric(`Sign in with ${biometricLabel}`);
      if (!authResult.success) {
        if (!authResult.cancelled && authResult.error) {
          Alert.alert('Biometric login failed', authResult.error);
        }
        return;
      }

      await initialize({ skipBiometric: true });
    } finally {
      setBiometricLoading(false);
    }
  }, [biometricLabel, biometricLoading, clearError, initialize, isLoading]);

  return (
    <View style={styles.container}>
      {/* ── Turquoise Gradient Header matching WelcomeScreen ── */}
      <View style={[styles.headerSection, { height: HEADER_H }]}>
        <LinearGradient
          colors={['#FFFFFF', '#ECFEFF', BRAND_TEAL]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <SafeAreaView style={styles.headerSafeArea}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backCapsule}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={22} color={INK} />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.logoWrap}>
          <StunityLogo width={logoW} height={logoH} />
        </View>
        <WavyDivider waveWidth={width} />
      </View>

      {/* ── Single-Screen Content Area (Zero Scroll) ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.contentArea}>
          <AuthTabletShell layout={layout} variant="auth">
            <View style={styles.formShell}>
              {/* Heading */}
              <View style={styles.titleGroup}>
                <Text style={styles.title}>{t('common.login')}</Text>
                <Text style={styles.subtitle}>{t('auth.signInToStunity', 'Welcome back to Stunity.')}</Text>
              </View>

              {error && (
                <View style={styles.errorBadge}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
                </View>
              )}

              <View style={[styles.field, layout.isTablet && styles.fieldTablet]}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={t('common.email') + ' or phone'}
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={[styles.field, layout.isTablet && styles.fieldTablet]}>
                <TextInput
                  ref={passwordRef}
                  style={styles.fieldInput}
                  placeholder={t('common.password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <View style={styles.forgotRow}>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7}>
                  <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
                </TouchableOpacity>
              </View>

              {/* Primary Submit Button — Glowing Cyan/Teal Pill matching WelcomeScreen Sign Up */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
                style={styles.primaryShadow}
              >
                <LinearGradient
                  colors={isLoading ? [BRAND_TEAL_MUTED, BRAND_TEAL_MUTED] : [BRAND_TEAL, BRAND_TEAL_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.primaryButton, layout.isTablet && styles.primaryButtonTablet]}
                >
                  {isLoading ? (
                    <Text style={styles.primaryText}>{t('auth.signingIn', 'Signing in...')}</Text>
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={[styles.primaryText, layout.isTablet && styles.primaryTextTablet]}>{t('common.login')}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <SocialAuthButtons disabled={isLoading} />

              {biometricLoginAvailable && (
                <TouchableOpacity
                  onPress={() => { void handleBiometricLogin(); }}
                  disabled={isLoading || biometricLoading}
                  activeOpacity={0.85}
                  style={styles.biometricButton}
                >
                  <Ionicons name="finger-print-outline" size={20} color="#64748B" />
                  <Text style={styles.biometricButtonText}>
                    {biometricLoading ? 'Authenticating...' : `Continue with ${biometricLabel}`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Dev Clear Cache */}
              {__DEV__ && (
                <TouchableOpacity
                  onPress={async () => {
                    Alert.alert('Clear Cache & Logout', 'Clear all cached data?', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await AsyncStorage.clear();
                            await logout();
                            Alert.alert('Done', 'Cache cleared.');
                          } catch (e) {
                            Alert.alert('Error', 'Failed to clear cache');
                          }
                        },
                      },
                    ]);
                  }}
                  style={styles.devBtn}
                >
                  <Ionicons name="trash-outline" size={14} color="#94A3B8" />
                  <Text style={styles.devText}><AutoI18nText i18nKey="auto.mobile.screens_auth_LoginScreen.k_edb7591d" /></Text>
                </TouchableOpacity>
              )}
            </View>
          </AuthTabletShell>

          {/* Footer Navigation */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.footer}
            activeOpacity={0.75}
          >
            <Text style={styles.footerText}>
              {t('auth.noAccount')}{' '}
              <Text style={styles.footerLink}>{t('common.signup')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Header & Wave
  headerSection: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backCapsule: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginLeft: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
    paddingTop: 10,
  },
  wavyContainer: {
    position: 'absolute',
    bottom: -1,
    width: '100%',
  },
  wavySvg: {
    bottom: 0,
  },

  // Bottom-anchored controls — logo stays in header, middle stays open
  contentArea: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 10,
    justifyContent: 'flex-end',
  },
  formShell: {
    width: '100%',
  },

  // Typography — professional system display
  titleGroup: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '600',
    color: INK,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1.1,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif-medium' },
      default: {},
    }),
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
    letterSpacing: -0.1,
  },

  // Error Badge
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9999,
    marginBottom: 12,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '500' },

  // Minimal soft fields
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  fieldTablet: {
    height: 58,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: INK,
    height: '100%',
    letterSpacing: -0.1,
    ...Platform.select({
      android: { paddingVertical: 0 },
      default: {},
    }),
  },
  eyeBtn: { paddingLeft: 10 },

  // Forgot Password
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    marginTop: -2,
    paddingHorizontal: 6,
  },
  forgotText: { fontSize: 14, color: BRAND_TEAL, fontWeight: '600' },

  // Fully rounded primary CTA — Welcome Sign Up brand treatment
  primaryShadow: {
    shadowColor: BRAND_TEAL,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
    borderRadius: 9999,
  },
  primaryButton: {
    height: 56,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonTablet: { height: 58 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  primaryTextTablet: { fontSize: 17 },

  biometricButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  biometricButtonText: {
    color: INK,
    fontSize: 15,
    fontWeight: '600',
  },

  // Dev
  devBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  devText: { fontSize: 12, color: '#94A3B8' },

  // Footer
  footer: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  footerText: { fontSize: 14, color: MUTED, fontWeight: '400' },
  footerLink: { color: BRAND_TEAL, fontWeight: '600' },
});
