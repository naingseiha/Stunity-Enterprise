import React, { useEffect, useMemo, useState } from 'react';
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
import { useAuthStore } from '@/stores';

type Step = 'PHONE' | 'OTP' | 'PROFILE';

export default function PasswordlessAuthScreen({ entry }: { entry: 'login' | 'register' }) {
  const navigation = useNavigation<any>();
  const { startPhoneOtp, verifyPhoneOtp, enrollPasswordless, isLoading } = useAuthStore();
  const [step, setStep] = useState<Step>('PHONE');
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState<any>(null);
  const [code, setCode] = useState('');
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [now, setNow] = useState(Date.now());

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
    if (phone.trim().length < 8) {
      Alert.alert('Check phone number', 'Enter a valid Cambodia or international phone number.');
      return;
    }
    const result = await startPhoneOtp(phone.trim(), preferredChannel);
    if (!result.success || !result.data) {
      Alert.alert('Unable to send code', result.error);
      return;
    }
    setChallenge(result.data);
    setCode('');
    setNow(Date.now());
    setStep('OTP');
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Enter the code', 'The verification code has six digits.');
      return;
    }
    const result = await verifyPhoneOtp(challenge.challengeId, code);
    if (!result.success || !result.data) {
      Alert.alert('Verification failed', result.error);
      return;
    }
    if (result.data.status === 'ENROLLMENT_REQUIRED') {
      setEnrollmentToken(result.data.enrollmentToken);
      setStep('PROFILE');
    }
  };

  const enroll = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Name required', 'Enter your first and last name.');
      return;
    }
    if (!accepted) {
      Alert.alert('Consent required', 'Please accept the Terms of Service and Privacy Policy.');
      return;
    }
    const result = await enrollPasswordless({
      enrollmentToken,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      acceptedTermsVersion: process.env.EXPO_PUBLIC_TERMS_VERSION || '2026-07',
    });
    if (!result.success) Alert.alert('Account setup failed', result.error);
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
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={26} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.heroIcon}>
              <Ionicons name={step === 'PHONE' ? 'phone-portrait-outline' : step === 'OTP' ? 'shield-checkmark-outline' : 'person-outline'} size={30} color="#0284C7" />
            </View>

            {step === 'PHONE' && (
              <>
                <Text style={styles.title}>{entry === 'login' ? 'Continue to Stunity' : 'Create your Stunity Account'}</Text>
                <Text style={styles.subtitle}>Enter your phone number. We’ll send a secure verification code—no password needed.</Text>
                <Text style={styles.label}>Phone number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCode}><Text style={styles.countryCodeText}>🇰🇭 +855</Text></View>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="012 345 678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    style={styles.phoneInput}
                    returnKeyType="go"
                    onSubmitEditing={() => void start()}
                  />
                </View>
                <Text style={styles.helper}>Local 0-prefix and international + formats are supported.</Text>
                <PrimaryButton label="Continue" loading={isLoading} onPress={() => void start()} />
                <TouchableOpacity onPress={() => navigation.navigate('PasswordLogin')} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Use email or password instead</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'OTP' && (
              <>
                <Text style={styles.title}>Enter verification code</Text>
                <Text style={styles.subtitle}>
                  {challenge?.channel === 'TELEGRAM' ? 'Sent through Telegram Gateway to ' : challenge?.channel === 'SMS' ? 'Sent by SMS to ' : 'Development verification for '}
                  <Text style={styles.strong}>{challenge?.maskedDestination}</Text>
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor="#CBD5E1"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  style={styles.otpInput}
                  maxLength={6}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => void verify()}
                />
                <PrimaryButton label="Verify and continue" loading={isLoading} onPress={() => void verify()} />
                <View style={styles.resendRow}>
                  <TouchableOpacity disabled={resendSeconds > 0 || isLoading} onPress={() => void start()}>
                    <Text style={[styles.linkText, resendSeconds > 0 && styles.disabledText]}>
                      {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'I did not receive a code'}
                    </Text>
                  </TouchableOpacity>
                  {challenge?.smsFallbackAvailable && resendSeconds === 0 && (
                    <TouchableOpacity disabled={isLoading} onPress={() => void start('SMS')}><Text style={styles.linkText}>Use SMS</Text></TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => setStep('PHONE')} style={styles.secondaryButton}><Text style={styles.secondaryText}>Change phone number</Text></TouchableOpacity>
              </>
            )}

            {step === 'PROFILE' && (
              <>
                <Text style={styles.title}>Tell us your name</Text>
                <Text style={styles.subtitle}>Your phone is verified. Complete the minimum profile to enter Stunity.</Text>
                <Text style={styles.label}>First name</Text>
                <TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#94A3B8" autoCapitalize="words" style={styles.textInput} />
                <Text style={styles.label}>Last name</Text>
                <TextInput value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#94A3B8" autoCapitalize="words" style={styles.textInput} />
                <TouchableOpacity onPress={() => setAccepted(!accepted)} style={styles.consentRow}>
                  <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>{accepted && <Ionicons name="checkmark" size={16} color="#fff" />}</View>
                  <Text style={styles.consentText}>I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.</Text>
                </TouchableOpacity>
                <PrimaryButton label="Create account" loading={isLoading} onPress={() => void enroll()} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity disabled={loading} onPress={onPress} activeOpacity={0.85} style={styles.buttonShadow}>
      <LinearGradient colors={loading ? ['#94A3B8', '#94A3B8'] : ['#0EA5E9', '#0284C7']} style={styles.primaryButton}>
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
  textInput: { height: 58, borderRadius: 18, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff', paddingHorizontal: 18, fontSize: 17, color: '#0F172A', marginBottom: 18 },
  otpInput: { height: 72, borderRadius: 20, borderWidth: 1, borderColor: '#7DD3FC', backgroundColor: '#fff', textAlign: 'center', fontSize: 32, letterSpacing: 12, fontWeight: '700', color: '#0F172A', paddingLeft: 12 },
  buttonShadow: { marginTop: 24, borderRadius: 18, shadowColor: '#0284C7', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  primaryButton: { minHeight: 58, borderRadius: 18, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
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
