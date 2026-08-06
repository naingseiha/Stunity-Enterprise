/**
 * Passwordless Auth Screen (Login & Register) — Senior UI/UX Creative Enterprise Design
 * Exact WelcomeScreen 120px WavyDivider, turquoise gradient header,
 * integrated country-code pill badge inside capsule input, glowing primary button,
 * creative secondary option cards with circular icon badges, zero-scroll layout.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import StunityLogo from '../../../assets/Stunity.svg';
import * as Passkeys from 'react-native-passkeys';
import { useAuthStore } from '@/stores';
import type { OtpChallengeResponse } from '@/types';
import { normalizePhonePreview } from '@/utils/passwordlessPhone';
import { Colors } from '@/config';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import {
  isFacebookAuthConfigured,
  isGoogleAuthConfigured,
} from '@/services/socialAuth';

const BRAND_TEAL = Colors.brand;
const BRAND_TEAL_DARK = '#00B8DB';
const INK = '#0F172A';
const MUTED = '#64748B';
const PASSKEYS_ENABLED = process.env.EXPO_PUBLIC_AUTH_PASSKEYS_ENABLED === 'true';
const TELEGRAM_ENABLED = process.env.EXPO_PUBLIC_AUTH_TELEGRAM_OIDC_ENABLED === 'true';

type Step = 'PHONE' | 'OTP' | 'PROFILE';

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

export default function PasswordlessAuthScreen({ entry }: { entry: 'login' | 'register' }) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { startPhoneOtp, verifyPhoneOtp, enrollPasswordless, startTelegramOidc, passkeySignIn, isLoading } = useAuthStore();
  const passkeysSupported = PASSKEYS_ENABLED && Passkeys.isSupported();
  const [step, setStep] = useState<Step>('PHONE');
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState<OtpChallengeResponse | null>(null);
  const [code, setCode] = useState('');
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const phoneInputRef = useRef<TextInput>(null);
  const codeInputRef = useRef<TextInput>(null);
  const firstNameInputRef = useRef<TextInput>(null);
  const phonePreview = normalizePhonePreview(phone);

  useEffect(() => {
    const target = step === 'PHONE'
      ? phoneInputRef.current
      : step === 'OTP'
        ? codeInputRef.current
        : firstNameInputRef.current;
    target?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== 'OTP') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  const resendSeconds = useMemo(() => {
    if (!challenge?.resendAt) return 0;
    return Math.max(0, Math.ceil((new Date(challenge.resendAt).getTime() - now) / 1000));
  }, [challenge?.resendAt, now]);

  const start = async (preferredChannel: 'AUTO' | 'SMS' = 'AUTO') => {
    if (!phonePreview) {
      Alert.alert('Error', t('auth.passwordless.checkPhoneBody', 'Please enter a valid phone number'));
      return;
    }
    const result = await startPhoneOtp(phonePreview, preferredChannel);
    if (!result.success || !result.data) {
      Alert.alert('Error', result.error || t('auth.passwordless.sendErrorBody', 'Failed to send verification code'));
      return;
    }
    setChallenge(result.data);
    setCode('');
    setNow(Date.now());
    setStep('OTP');
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Error', t('auth.passwordless.codeRequiredBody', 'Please enter the 6-digit verification code'));
      return;
    }
    if (!challenge) return;
    const result = await verifyPhoneOtp(challenge.challengeId, code);
    if (!result.success || !result.data) {
      Alert.alert('Error', result.error || t('auth.passwordless.verificationErrorBody', 'Invalid verification code'));
      return;
    }
    if (result.data.status === 'ENROLLMENT_REQUIRED') {
      setEnrollmentToken(result.data.enrollmentToken);
      setStep('PROFILE');
    }
  };

  const enroll = async () => {
    if (!firstName.trim() || !lastName.trim() || !accepted) {
      Alert.alert('Error', 'Please complete all fields and accept the Terms of Service');
      return;
    }
    const result = await enrollPasswordless({
      enrollmentToken,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      acceptedTermsVersion: '2026-01',
    });
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to create account');
    }
  };

  const continueWithTelegram = async () => {
    const result = await startTelegramOidc();
    if (result.requires2FA && result.challengeToken) {
      navigation.navigate('TwoFactor', {
        challengeToken: result.challengeToken,
        email: result.email || '',
      });
      return;
    }
    if (!result.success && !result.cancelled) {
      Alert.alert('Error', result.error || t('auth.passwordless.telegramErrorBody', 'Failed to sign in with Telegram'));
    }
  };

  const continueWithPasskey = async () => {
    const result = await passkeySignIn();
    if (!result.success && !result.cancelled) {
      Alert.alert('Error', result.error || t('auth.passwordless.passkeyErrorBody', 'Failed to sign in with Passkey'));
    }
  };

  const goBack = () => {
    if (step === 'PROFILE') setStep('OTP');
    else if (step === 'OTP') setStep('PHONE');
    else navigation.goBack();
  };

  const { width, height } = useWindowDimensions();
  const HEADER_H = Math.min(height * 0.31, 250);
  const logoW = Math.min(width * 0.48, 200);
  const logoH = logoW * (0.25 / 0.7);

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
            onPress={goBack}
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
          <View style={styles.formShell}>
            {step === 'PHONE' && (
              <>
                <View style={styles.titleGroup}>
                  <Text style={styles.title}>{entry === 'login' ? t('common.login') : t('common.signup')}</Text>
                  <Text style={styles.subtitle}>
                    {entry === 'login'
                      ? t('auth.passwordless.signInSubtitle', 'Enter your phone number to sign in securely to your enterprise platform.')
                      : t('auth.passwordless.createSubtitle', 'Enter your phone number to start creating your Stunity enterprise account.')}
                  </Text>
                </View>

                {/* Creative Phone Capsule with Integrated Country Code Pill Badge */}
                <View style={styles.phoneCapsule}>
                  <View style={styles.countryCodePill}>
                    <Ionicons name="globe-outline" size={18} color="#0284C7" />
                    <Text style={styles.countryCodeText}>+855</Text>
                  </View>
                  <TextInput
                    ref={phoneInputRef}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={t('auth.passwordless.phonePlaceholder', '12 345 678')}
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    style={styles.phoneInput}
                    returnKeyType="go"
                    onSubmitEditing={() => void start()}
                  />
                </View>

                {/* Primary Submit Button — Glowing Teal Gradient Pill */}
                <TouchableOpacity
                  style={[styles.primaryShadow, (!phonePreview || isLoading) && styles.disabledButtonShadow]}
                  disabled={!phonePreview || isLoading}
                  onPress={() => void start()}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={!phonePreview || isLoading ? ['#94A3B8', '#94A3B8'] : [BRAND_TEAL, BRAND_TEAL_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.primaryText}>{t('auth.passwordless.continue', 'Continue')}</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Creative Divider matching WelcomeScreen FOR PARENTS */}
                {(passkeysSupported || TELEGRAM_ENABLED || isGoogleAuthConfigured() || isFacebookAuthConfigured()) && (
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                    <View style={styles.dividerLine} />
                  </View>
                )}

                {/* Passkey Secondary Card with Circular Icon Badge */}
                {entry === 'login' && passkeysSupported && (
                  <TouchableOpacity
                    onPress={() => void continueWithPasskey()}
                    disabled={isLoading}
                    style={styles.secondaryCapsuleCard}
                    activeOpacity={0.8}
                  >
                    <View style={styles.secondaryIconBadge}>
                      <Ionicons name="finger-print-outline" size={20} color={BRAND_TEAL} />
                    </View>
                    <Text style={styles.secondaryCardText}>{t('auth.passwordless.usePasskey', 'Use Passkey')}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}

                {/* Telegram Secondary Card with Circular Icon Badge */}
                {TELEGRAM_ENABLED && (
                  <TouchableOpacity
                    onPress={() => void continueWithTelegram()}
                    disabled={isLoading}
                    style={styles.secondaryCapsuleCard}
                    activeOpacity={0.8}
                  >
                    <View style={styles.secondaryIconBadge}>
                      <Ionicons name="paper-plane-outline" size={20} color="#0088CC" />
                    </View>
                    <Text style={styles.secondaryCardText}>{t('auth.passwordless.continueWithTelegram', 'Telegram Account')}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}

                <SocialAuthButtons disabled={isLoading} showDivider={false} />

                {/* Password Login Option */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('PasswordLogin')}
                  style={styles.tertiaryBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tertiaryText}>Use Email & Password Instead</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'OTP' && (
              <>
                <View style={styles.titleGroup}>
                  <Text style={styles.title}>{t('auth.passwordless.otpTitle', 'Verification Code')}</Text>
                  <Text style={styles.subtitle}>
                    We sent a 6-digit code to <Text style={styles.strongText}>{challenge?.maskedDestination || phonePreview}</Text>
                  </Text>
                </View>

                {/* Glowing OTP Capsule Input */}
                <TextInput
                  ref={codeInputRef}
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor="#CBD5E1"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  style={styles.otpCapsule}
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={() => void verify()}
                />

                <TouchableOpacity
                  style={[styles.primaryShadow, (code.length !== 6 || isLoading) && styles.disabledButtonShadow]}
                  disabled={code.length !== 6 || isLoading}
                  onPress={() => void verify()}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={code.length !== 6 || isLoading ? ['#94A3B8', '#94A3B8'] : [BRAND_TEAL, BRAND_TEAL_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryText}>{t('auth.passwordless.verifyContinue', 'Verify & Continue')}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  <TouchableOpacity disabled={resendSeconds > 0 || isLoading} onPress={() => void start()}>
                    <Text style={[styles.linkText, resendSeconds > 0 && styles.disabledText]}>
                      {resendSeconds > 0
                        ? t('auth.passwordless.resendIn', { seconds: resendSeconds })
                        : t('auth.passwordless.codeNotReceived', 'Resend Code')}
                    </Text>
                  </TouchableOpacity>
                  {challenge?.smsFallbackAvailable && resendSeconds === 0 && (
                    <TouchableOpacity disabled={isLoading} onPress={() => void start('SMS')}>
                      <Text style={styles.linkText}>Send via SMS</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {step === 'PROFILE' && (
              <>
                <View style={styles.titleGroup}>
                  <Text style={styles.title}>{t('auth.passwordless.profileTitle', 'Complete Profile')}</Text>
                  <Text style={styles.subtitle}>Set up your personal details to complete your enterprise registration.</Text>
                </View>

                {/* First Name Capsule with Circular Icon Badge */}
                <View style={styles.inputCapsule}>
                  <View style={styles.iconCircleBadge}>
                    <Ionicons name="person-outline" size={18} color="#0284C7" />
                  </View>
                  <TextInput
                    ref={firstNameInputRef}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder={t('auth.passwordless.firstName', 'First Name')}
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    autoComplete="name-given"
                    style={styles.input}
                  />
                </View>

                {/* Last Name Capsule with Circular Icon Badge */}
                <View style={styles.inputCapsule}>
                  <View style={styles.iconCircleBadge}>
                    <Ionicons name="person-outline" size={18} color="#0284C7" />
                  </View>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder={t('auth.passwordless.lastName', 'Last Name')}
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    autoComplete="name-family"
                    style={styles.input}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => setAccepted(!accepted)}
                  style={styles.consentRow}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                    {accepted && <Ionicons name="checkmark" size={15} color="#fff" />}
                  </View>
                  <Text style={styles.consentText}>
                    I agree to the <Text style={styles.consentLink}>Terms of Service</Text> and <Text style={styles.consentLink}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryShadow, (!firstName.trim() || !lastName.trim() || !accepted || isLoading) && styles.disabledButtonShadow]}
                  disabled={!firstName.trim() || !lastName.trim() || !accepted || isLoading}
                  onPress={() => void enroll()}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={!firstName.trim() || !lastName.trim() || !accepted || isLoading ? ['#94A3B8', '#94A3B8'] : [BRAND_TEAL, BRAND_TEAL_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryText}>{t('auth.passwordless.createAccount', 'Create Account')}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer Navigation */}
          {step === 'PHONE' && (
            <TouchableOpacity
              onPress={() => navigation.navigate(entry === 'login' ? 'Register' : 'Login')}
              style={styles.footer}
              activeOpacity={0.75}
            >
              <Text style={styles.footerText}>
                {entry === 'login' ? t('auth.noAccount', "Don't have an account?") : t('auth.haveAccount', 'Already have an account?')}{' '}
                <Text style={styles.footerLink}>{entry === 'login' ? t('common.signup', 'Sign Up') : t('common.login', 'Login')}</Text>
              </Text>
            </TouchableOpacity>
          )}

          {step !== 'PHONE' && (
            <TouchableOpacity onPress={() => setStep('PHONE')} style={styles.footer}>
              <Text style={styles.footerLink}>Back to phone input</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Header & Wave
  headerSection: { width: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  headerSafeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
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
  logoWrap: { alignItems: 'center', justifyContent: 'center', paddingBottom: 40, paddingTop: 10 },
  wavyContainer: { position: 'absolute', bottom: -1, width: '100%' },
  wavySvg: { bottom: 0 },

  // Single-Screen Content Area
  contentArea: { flex: 1, paddingHorizontal: 32, paddingTop: 10, paddingBottom: 16, justifyContent: 'space-between' },
  formShell: { width: '100%' },

  // Typography
  titleGroup: { alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '900', color: INK, marginBottom: 6, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, maxWidth: 340 },
  strongText: { fontWeight: '800', color: '#0284C7' },

  // Creative Phone Capsule
  phoneCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 9999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    paddingLeft: 8,
    paddingRight: 18,
    marginBottom: 16,
  },
  countryCodePill: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 10,
  },
  countryCodeText: { fontSize: 15, fontWeight: '800', color: '#0284C7' },
  phoneInput: { flex: 1, fontSize: 16, color: INK, height: '100%' },

  // Inputs
  inputCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 9999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  iconCircleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  input: { flex: 1, fontSize: 16, color: INK, height: '100%', paddingRight: 14 },

  // OTP Capsule
  otpCapsule: {
    height: 66,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#09CFF7',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 16,
    fontWeight: '900',
    color: INK,
    paddingLeft: 14,
    marginBottom: 18,
  },

  // Primary Submit Button
  primaryShadow: {
    shadowColor: BRAND_TEAL,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
    borderRadius: 9999,
  },
  disabledButtonShadow: { shadowOpacity: 0, elevation: 0 },
  primaryButton: { height: 64, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },

  // Creative Divider (`FOR PARENTS` style)
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 12, fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5 },

  // Secondary Option Cards with Circular Icon Badges (`WelcomeScreen` outline card style)
  secondaryCapsuleCard: {
    height: 58,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  secondaryIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_TEAL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 12,
  },
  secondaryCardText: { flex: 1, fontSize: 16, fontWeight: '700', color: INK },

  tertiaryBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  tertiaryText: { fontSize: 14, fontWeight: '700', color: '#64748B' },

  resendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 6 },
  linkText: { color: BRAND_TEAL, fontWeight: '800', fontSize: 14 },
  disabledText: { color: '#94A3B8' },

  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingHorizontal: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#BAE6FD', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: BRAND_TEAL, borderColor: BRAND_TEAL },
  consentText: { flex: 1, fontSize: 13, color: MUTED, lineHeight: 18 },
  consentLink: { color: BRAND_TEAL, fontWeight: '700' },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 12 },
  footerText: { fontSize: 15, color: MUTED, fontWeight: '600' },
  footerLink: { color: BRAND_TEAL, fontWeight: '800' },
});
