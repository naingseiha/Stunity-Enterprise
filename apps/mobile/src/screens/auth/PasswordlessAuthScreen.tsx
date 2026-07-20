import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Passkeys from 'react-native-passkeys';
import { useAuthStore } from '@/stores';
import type { OtpChallengeResponse } from '@/types';
import { normalizePhonePreview } from '@/utils/passwordlessPhone';

type Step = 'PHONE' | 'OTP' | 'PROFILE';

const PASSKEYS_ENABLED = process.env.EXPO_PUBLIC_AUTH_PASSKEYS_ENABLED === 'true';

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
      Alert.alert(t('auth.passwordless.checkPhoneTitle'), t('auth.passwordless.checkPhoneBody'));
      return;
    }
    const result = await startPhoneOtp(phonePreview, preferredChannel);
    if (!result.success || !result.data) {
      Alert.alert(t('auth.passwordless.sendErrorTitle'), result.error || t('auth.passwordless.sendErrorBody'));
      return;
    }
    setChallenge(result.data);
    setCode('');
    setNow(Date.now());
    setStep('OTP');
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert(t('auth.passwordless.codeRequiredTitle'), t('auth.passwordless.codeRequiredBody'));
      return;
    }
    if (!challenge) return;
    const result = await verifyPhoneOtp(challenge.challengeId, code);
    if (!result.success || !result.data) {
      Alert.alert(t('auth.passwordless.verificationErrorTitle'), result.error || t('auth.passwordless.verificationErrorBody'));
      return;
    }
    if (result.data.status === 'ENROLLMENT_REQUIRED') {
      setEnrollmentToken(result.data.enrollmentToken);
      setStep('PROFILE');
    }
  };

  const enroll = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t('auth.passwordless.nameRequiredTitle'), t('auth.passwordless.nameRequiredBody'));
      return;
    }
    if (!accepted) {
      Alert.alert(t('auth.passwordless.consentRequiredTitle'), t('auth.passwordless.consentRequiredBody'));
      return;
    }
    const result = await enrollPasswordless({
      enrollmentToken,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      acceptedTermsVersion: process.env.EXPO_PUBLIC_TERMS_VERSION || '2026-07',
    });
    if (!result.success) {
      Alert.alert(t('auth.passwordless.enrollmentErrorTitle'), result.error || t('auth.passwordless.enrollmentErrorBody'));
    }
  };

  const continueWithTelegram = async () => {
    const result = await startTelegramOidc();
    if (!result.success && !result.cancelled) {
      Alert.alert(t('auth.passwordless.telegramErrorTitle'), result.error || t('auth.passwordless.telegramErrorBody'));
    }
  };

  const continueWithPasskey = async () => {
    const result = await passkeySignIn();
    if (!result.success && !result.cancelled) {
      Alert.alert(t('auth.passwordless.passkeyErrorTitle'), result.error || t('auth.passwordless.passkeyErrorBody'));
    }
  };

  const goBack = () => {
    if (step === 'PROFILE') setStep('OTP');
    else if (step === 'OTP') setStep('PHONE');
    else navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#ECFEFF', '#F0F9FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              onPress={goBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={t('auth.passwordless.back')}
            >
              <Ionicons name="chevron-back" size={26} color="#0F172A" accessibilityElementsHidden />
            </TouchableOpacity>

            <View style={styles.heroIcon}>
              <Ionicons name={step === 'PHONE' ? 'phone-portrait-outline' : step === 'OTP' ? 'shield-checkmark-outline' : 'person-outline'} size={30} color="#0284C7" />
            </View>

            {step === 'PHONE' && (
              <>
                <Text style={styles.title}>{t(entry === 'login' ? 'auth.passwordless.signInTitle' : 'auth.passwordless.createTitle')}</Text>
                <Text style={styles.subtitle}>{t(entry === 'login' ? 'auth.passwordless.signInSubtitle' : 'auth.passwordless.createSubtitle')}</Text>
                <Text style={styles.label}>{t('auth.passwordless.phoneLabel')}</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCode}><Text style={styles.countryCodeText}>🇰🇭 +855</Text></View>
                  <TextInput
                    ref={phoneInputRef}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={t('auth.passwordless.phonePlaceholder')}
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    accessibilityLabel={t('auth.passwordless.phoneLabel')}
                    accessibilityHint={t('auth.passwordless.phoneHelp')}
                    style={styles.phoneInput}
                    returnKeyType="go"
                    onSubmitEditing={() => void start()}
                  />
                </View>
                <Text style={styles.helper}>{t('auth.passwordless.phoneHelp')}</Text>
                <Text style={styles.preview} accessibilityLiveRegion="polite">
                  {phonePreview ? t('auth.passwordless.canonicalPreview', { phone: phonePreview }) : ' '}
                </Text>
                <PrimaryButton label={t('auth.passwordless.continue')} loading={isLoading} disabled={!phonePreview} onPress={() => void start()} />
                {entry === 'login' && passkeysSupported && (
                  <TouchableOpacity
                    onPress={() => void continueWithPasskey()}
                    disabled={isLoading}
                    style={[styles.telegramButton, isLoading && styles.disabledButton]}
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.passwordless.usePasskey')}
                    accessibilityState={{ disabled: isLoading }}
                  >
                    <Ionicons name="finger-print-outline" size={18} color="#0F172A" />
                    <Text style={styles.telegramButtonText}>{t('auth.passwordless.usePasskey')}</Text>
                  </TouchableOpacity>
                )}
                {process.env.EXPO_PUBLIC_AUTH_TELEGRAM_OIDC_ENABLED === 'true' && (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>{t('auth.passwordless.orDivider')}</Text>
                      <View style={styles.dividerLine} />
                    </View>
                    <TouchableOpacity
                      onPress={() => void continueWithTelegram()}
                      disabled={isLoading}
                      style={[styles.telegramButton, isLoading && styles.disabledButton]}
                      accessibilityRole="button"
                      accessibilityLabel={t('auth.passwordless.continueWithTelegram')}
                      accessibilityState={{ disabled: isLoading }}
                    >
                      <Ionicons name="paper-plane-outline" size={18} color="#0F172A" />
                      <Text style={styles.telegramButtonText}>{t('auth.passwordless.continueWithTelegram')}</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  onPress={() => navigation.navigate('PasswordLogin')}
                  style={styles.secondaryButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryText}>{t('auth.passwordless.passwordInstead')}</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'OTP' && (
              <>
                <Text style={styles.title}>{t('auth.passwordless.otpTitle')}</Text>
                <Text style={styles.subtitle}>
                  {t(
                    challenge?.channel === 'TELEGRAM'
                      ? 'auth.passwordless.telegramSubtitle'
                      : challenge?.channel === 'SMS'
                        ? 'auth.passwordless.smsSubtitle'
                        : 'auth.passwordless.verificationSubtitle',
                  )}{' '}
                  <Text style={styles.strong}>{challenge?.maskedDestination}</Text>
                </Text>
                <TextInput
                  ref={codeInputRef}
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor="#CBD5E1"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  accessibilityLabel={t('auth.passwordless.otpLabel')}
                  accessibilityHint={t('auth.passwordless.otpHelp')}
                  style={styles.otpInput}
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={() => void verify()}
                />
                <PrimaryButton label={t('auth.passwordless.verifyContinue')} loading={isLoading} disabled={code.length !== 6} onPress={() => void verify()} />
                <View style={styles.resendRow}>
                  <TouchableOpacity
                    disabled={resendSeconds > 0 || isLoading}
                    onPress={() => void start()}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: resendSeconds > 0 || isLoading }}
                  >
                    <Text style={[styles.linkText, resendSeconds > 0 && styles.disabledText]}>
                      {resendSeconds > 0
                        ? t('auth.passwordless.resendIn', { seconds: resendSeconds })
                        : t('auth.passwordless.codeNotReceived')}
                    </Text>
                  </TouchableOpacity>
                  {challenge?.smsFallbackAvailable && resendSeconds === 0 && (
                    <TouchableOpacity disabled={isLoading} onPress={() => void start('SMS')} accessibilityRole="button">
                      <Text style={styles.linkText}>{t('auth.passwordless.useSms')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => setStep('PHONE')} style={styles.secondaryButton} accessibilityRole="button">
                  <Text style={styles.secondaryText}>{t('auth.passwordless.changePhone')}</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'PROFILE' && (
              <>
                <Text style={styles.title}>{t('auth.passwordless.profileTitle')}</Text>
                <Text style={styles.subtitle}>{t('auth.passwordless.profileSubtitle')}</Text>
                <Text style={styles.label}>{t('auth.passwordless.firstName')}</Text>
                <TextInput
                  ref={firstNameInputRef}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t('auth.passwordless.firstName')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  autoComplete="name-given"
                  accessibilityLabel={t('auth.passwordless.firstName')}
                  style={styles.textInput}
                />
                <Text style={styles.label}>{t('auth.passwordless.lastName')}</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t('auth.passwordless.lastName')}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  autoComplete="name-family"
                  accessibilityLabel={t('auth.passwordless.lastName')}
                  style={styles.textInput}
                />
                <TouchableOpacity
                  onPress={() => setAccepted(!accepted)}
                  style={styles.consentRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: accepted }}
                  accessibilityLabel={t('auth.passwordless.termsConsent')}
                >
                  <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>{accepted && <Ionicons name="checkmark" size={16} color="#fff" />}</View>
                  <Text style={styles.consentText}>{t('auth.passwordless.termsConsent')}</Text>
                </TouchableOpacity>
                <PrimaryButton
                  label={t('auth.passwordless.createAccount')}
                  loading={isLoading}
                  disabled={!firstName.trim() || !lastName.trim() || !accepted}
                  onPress={() => void enroll()}
                />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function PrimaryButton({ label, loading, disabled, onPress }: { label: string; loading: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      disabled={loading || disabled}
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.buttonShadow, disabled && styles.disabledButton]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(loading || disabled), busy: loading }}
    >
      <LinearGradient colors={loading || disabled ? ['#94A3B8', '#94A3B8'] : ['#0EA5E9', '#0284C7']} style={styles.primaryButton}>
        {loading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.primaryText}>{label}</Text><Ionicons name="arrow-forward" size={20} color="#fff" /></>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff' },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFFCC', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  heroIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 44, marginBottom: 24 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: '#0F172A', textAlign: 'center', letterSpacing: -0.7 },
  subtitle: { marginTop: 12, marginBottom: 32, fontSize: 16, lineHeight: 24, color: '#64748B', textAlign: 'center' },
  strong: { fontWeight: '700', color: '#334155' },
  label: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 8, marginTop: 4 },
  phoneInputRow: { height: 60, borderRadius: 18, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff', flexDirection: 'row', overflow: 'hidden' },
  countryCode: { paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: '#E2E8F0', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  countryCodeText: { fontSize: 15, fontWeight: '700', color: '#334155' },
  phoneInput: { flex: 1, paddingHorizontal: 16, fontSize: 18, color: '#0F172A' },
  helper: { marginTop: 8, fontSize: 12, color: '#64748B' },
  preview: { minHeight: 20, marginTop: 4, fontSize: 13, fontWeight: '700', color: '#0369A1' },
  textInput: { height: 58, borderRadius: 18, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff', paddingHorizontal: 18, fontSize: 17, color: '#0F172A', marginBottom: 18 },
  otpInput: { height: 72, borderRadius: 20, borderWidth: 1, borderColor: '#7DD3FC', backgroundColor: '#fff', textAlign: 'center', fontSize: 32, letterSpacing: 12, fontWeight: '700', color: '#0F172A', paddingLeft: 12 },
  buttonShadow: { marginTop: 24, borderRadius: 18, shadowColor: '#0284C7', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  disabledButton: { shadowOpacity: 0, elevation: 0 },
  primaryButton: { minHeight: 58, borderRadius: 18, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  telegramButton: { marginTop: 16, minHeight: 56, borderRadius: 18, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff', flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  telegramButtonText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  secondaryButton: { alignItems: 'center', paddingVertical: 18 },
  secondaryText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  resendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  linkText: { color: '#0284C7', fontWeight: '700' },
  disabledText: { color: '#94A3B8' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  consentText: { flex: 1, fontSize: 14, lineHeight: 21, color: '#475569' },
});
